// ============ loaders/folder.js — Folder auto-load (File System Access API) ============

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

  const collected = { car:null, pallet:[], in:[], out:[], agingoutDom:null, agingoutImp:null };
  try {
    for await (const [name, h] of dirHandle.entries()) {
      if (h.kind !== 'file') continue;
      if (name.startsWith('~$')) continue;
      const lower = name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) continue;
      if (/^car/i.test(name))            collected.car = h;
      else if (/^in\s*p/i.test(name))   collected.pallet.push({ name, h });
      else if (/^in\s/i.test(name))     collected.in.push({ name, h });
      else if (/^out\s/i.test(name))    collected.out.push({ name, h });
      else if (/aging/i.test(name)) {
        if (/dom/i.test(name)) collected.agingoutDom = h;
        else                   collected.agingoutImp = h;
      }
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
  // โหลด DOM ก่อน IMP ตามลำดับที่กำหนด
  if (collected.agingoutDom) {
    tasks.push(collected.agingoutDom.getFile().then(f => { loadAgingOutDomFile(f); loadedNames.push('📤DOM ' + f.name); }));
  }
  if (collected.agingoutImp) {
    tasks.push(collected.agingoutImp.getFile().then(f => { loadAgingOutImpFile(f); loadedNames.push('📤IMP ' + f.name); }));
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
