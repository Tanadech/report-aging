// ============ loaders/status.js — Status badge + pallet map ============

// สถานะที่นับเป็น "พาเลทตกค้าง" (ยังอยู่ในคลัง)
const PALLET_ACTIVE_STATUS = ['Console Int', 'Buffer'];

function rebuildPalletMap() {
  palletByOnetime = {};
  if (!dataPallet.length) return;
  dataPallet.forEach(r => {
    const st  = String(r['สถานะ']      || '').trim();
    if (!PALLET_ACTIVE_STATUS.includes(st)) return;   // เฉพาะ Console Int / Buffer
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
