// ============ lib/data-loader.js — โหลดไฟล์ Excel / โฟลเดอร์ / Google Sheet ============

// ── Pallet map ──
function rebuildPalletMap() {
  palletByOnetime = {};
  if (!dataPallet.length) return;
  dataPallet.forEach(r => {
    const ot  = String(r['ครั้งเดียว'] || '').trim(); if (!ot) return;
    const bar = String(r['บาร์โค้ด']   || '').trim(); if (!bar) return;
    palletByOnetime[ot] = (palletByOnetime[ot] || 0) + 1;
  });
}

function palletForRows(rows) {
  if (!rows || !rows.length) return 0;
  const seen = new Set();
  rows.forEach(r => { const ot = String(r['เลขที่ onetime'] || '').trim(); if (ot) seen.add(ot); });
  let total = 0;
  seen.forEach(ot => { total += palletByOnetime[ot] || 0; });
  return total;
}

// ── Status badge ──
function setStatus(st) {
  const b   = document.getElementById('sbadge');
  const m   = document.getElementById('meta');
  const now = new Date();
  const map = {
    live:   ['live', '● LIVE',     'อัพเดท: ' + now.toLocaleString('th-TH') + ' (ดึงสดจาก Google Sheet)'],
    snap:   ['snap', 'SNAPSHOT',   'ข้อมูล Snapshot'],
    nodata: ['snap', '⏳ รอข้อมูล','กรุณาโหลดไฟล์ Excel — 📂 IMPORTED หรือ 📂 DOMESTIC'],
    err:    ['err',  '● ERROR',    'โหลดข้อมูลสดไม่ได้']
  };
  const [cls, txt, sub] = map[st] || map.nodata;
  b.className = 'sbadge ' + cls;
  b.innerHTML = `<span class="dot"></span>${txt}`;
  m.textContent = sub;
}

// ── Google Sheet (live) ──
async function loadLive() {
  try {
    const [r1, r2] = await Promise.all([fetchCSV(SHEET_IN_NAME), fetchCSV(SHEET_UOT_NAME)]);
    dataIn = r1; dataUot = r2;
    setStatus('live');
    document.getElementById('alertbox').classList.remove('show');
    rebuild();
  } catch (e) {
    console.warn(e);
    setStatus('err');
    document.getElementById('alertbox').classList.add('show');
    if (!dataIn.length && !dataUot.length) {
      dataIn = SNAPSHOT.POI_IN; dataUot = SNAPSHOT.POI_UOT;
      setStatus('snap'); rebuild();
    }
  }
}

// ── Excel: IMPORTED / DOMESTIC ──
function loadExcelFile(file, target) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      if (target === 'uot') dataUot = rows;
      else                  dataIn  = rows;
      const now    = new Date();
      const b      = document.getElementById('sbadge');
      b.className  = 'sbadge live';
      b.innerHTML  = '<span class="dot"></span>📂 FILE';
      document.getElementById('meta').textContent =
        (target === 'uot' ? 'IMPORTED' : 'DOMESTIC') + ': ' + file.name + ' | ' + now.toLocaleString('th-TH');
      document.getElementById('alertbox').classList.remove('show');
      const updEl = document.getElementById(target === 'uot' ? 'out-upd' : 'in-upd');
      if (updEl) { updEl.textContent = 'อัพเดท: ' + now.toLocaleString('th-TH'); updEl.classList.add('show'); }
      rebuild();
    } catch (err) { alert('โหลดไฟล์ไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// ── Excel: Car (OUTBOUND) ──
function loadCarFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      dataCar = rows;
      const now   = new Date();
      const updEl = document.getElementById('car-upd');
      if (updEl) { updEl.textContent = '🚛 อัพเดท: ' + now.toLocaleString('th-TH'); updEl.classList.add('show'); }
      rebuildCar();
      renderCar();
      // สลับไปแท็บ CAR อัตโนมัติ
      document.querySelectorAll('.tb').forEach(b => b.classList.remove('act'));
      document.querySelectorAll('.tc').forEach(c => c.classList.remove('act'));
      document.querySelector('.tb[data-tab="car"]').classList.add('act');
      document.getElementById('tc-car').classList.add('act');
      setTimeout(() => Object.values(CR).forEach(c => c.resize && c.resize()), 80);
    } catch (err) { alert('โหลดไฟล์รถไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// ── Excel: Pallet IN ──
function loadPalletFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      dataPallet = rows;
      rebuildPalletMap();
      const now = new Date();
      const b   = document.getElementById('sbadge');
      b.className = 'sbadge live';
      b.innerHTML = '<span class="dot"></span>📦 PALLET';
      document.getElementById('meta').textContent =
        'PALLET IN: ' + file.name + ' | ' + now.toLocaleString('th-TH') +
        ' (' + rows.length + ' แถว / ' + Object.keys(palletByOnetime).length + ' onetime)';
      document.getElementById('alertbox').classList.remove('show');
      if (dataIn.length) renderIn();
    } catch (err) { alert('โหลดไฟล์พาเลทไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// ── Folder Auto-Load (File System Access API) ──
let dirHandle = null;

async function pickDataFolder() {
  if (!('showDirectoryPicker' in window)) {
    alert('เบราว์เซอร์นี้ไม่รองรับการเลือกโฟลเดอร์อัตโนมัติ\nกรุณาใช้ Chrome หรือ Edge เวอร์ชันใหม่ (≥86)');
    return;
  }
  try {
    dirHandle = await window.showDirectoryPicker({ mode:'read' });
    document.getElementById('btn-folder-txt').textContent = dirHandle.name;
    document.getElementById('btn-folder').title = 'โฟลเดอร์: ' + dirHandle.name + ' — กดเพื่อรีโหลด';
    await scanAndLoadFolder();
  } catch (e) {
    if (e.name !== 'AbortError') alert('ไม่สามารถเปิดโฟลเดอร์: ' + e.message);
  }
}

async function reloadFolder() {
  if (!dirHandle) { await pickDataFolder(); return; }
  try {
    let perm = await dirHandle.queryPermission({ mode:'read' });
    if (perm !== 'granted') {
      perm = await dirHandle.requestPermission({ mode:'read' });
      if (perm !== 'granted') { await pickDataFolder(); return; }
    }
    await scanAndLoadFolder();
  } catch (e) { await pickDataFolder(); }
}

async function scanAndLoadFolder() {
  if (!dirHandle) return;
  const btn    = document.getElementById('btn-folder');
  const oldTxt = document.getElementById('btn-folder-txt').textContent;
  btn.disabled = true;
  document.getElementById('btn-folder-txt').textContent = 'กำลังสแกน...';

  const collected = { car:null, pallet:[], in:[], out:[] };
  try {
    for await (const [name, h] of dirHandle.entries()) {
      if (h.kind !== 'file') continue;
      if (name.startsWith('~$')) continue;
      const lower = name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) continue;
      if (/^car/i.test(name))       collected.car = h;
      else if (/^in\s*p/i.test(name)) collected.pallet.push({ name, h });
      else if (/^in\s/i.test(name))  collected.in.push({ name, h });
      else if (/^out\s/i.test(name)) collected.out.push({ name, h });
    }
  } catch (e) {
    alert('สแกนโฟลเดอร์ผิดพลาด: ' + e.message);
    btn.disabled = false;
    document.getElementById('btn-folder-txt').textContent = oldTxt;
    return;
  }

  const pickLatest = arr => arr.sort((a, b) => b.name.localeCompare(a.name))[0];
  const tasks = [], loadedNames = [];

  if (collected.out.length) {
    const pick = pickLatest(collected.out);
    tasks.push(pick.h.getFile().then(f => { loadExcelFile(f, 'uot'); loadedNames.push('🌏 ' + f.name); }));
  }
  if (collected.in.length) {
    const pick = pickLatest(collected.in);
    tasks.push(pick.h.getFile().then(f => { loadExcelFile(f, 'in'); loadedNames.push('📦 ' + f.name); }));
  }
  if (collected.pallet.length) {
    const pick = pickLatest(collected.pallet);
    tasks.push(pick.h.getFile().then(f => { loadPalletFile(f); loadedNames.push('🟡 ' + f.name); }));
  }
  if (collected.car) {
    tasks.push(collected.car.getFile().then(f => { loadCarFile(f); loadedNames.push('🚛 ' + f.name); }));
  }

  await Promise.all(tasks);
  btn.disabled = false;
  document.getElementById('btn-folder-txt').textContent = dirHandle.name;

  if (loadedNames.length) {
    const meta = document.getElementById('meta');
    const now  = new Date();
    meta.textContent = '📁 ' + dirHandle.name + ' • โหลด ' + loadedNames.length + ' ไฟล์ • ' + now.toLocaleString('th-TH');
    meta.title = loadedNames.join('\n');
    const b = document.getElementById('sbadge');
    b.className = 'sbadge live';
    b.innerHTML = '<span class="dot"></span>📁 AUTO (' + loadedNames.length + ')';
  } else {
    alert('ไม่พบไฟล์ Excel ตรงรูปแบบในโฟลเดอร์นี้\n\nรูปแบบไฟล์ที่ค้นหา:\n• OUT *.xlsx → IMPORTED\n• IN *.xlsx → DOMESTIC\n• IN P*.xlsx → PALLET\n• Car*.xlsx → OUTBOUND');
  }
}
