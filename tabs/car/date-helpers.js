// ============ tabs/car/date-helpers.js — Date/time utilities สำหรับ CAR tab ============

function parseCarDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return null;
  let y = parseInt(m[3]);
  if (y < 100) y += (y > 50 ? 2500 : 2600);
  if (y > 2400) y -= 543;
  const dt = new Date(y, parseInt(m[2])-1, parseInt(m[1]));
  return isNaN(dt) ? null : dt;
}

function sameDate(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();
}

// แปลง "08.00-12.00" → นาทีเพื่อใช้ sort
function timeSlotStart(slot) {
  const m = String(slot || '').match(/^(\d{1,2})[\.:](\d{2})/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 99999;
}

function isChecked(v) {
  if (v === null || v === undefined || v === '') return false;
  const s = String(v).trim().toLowerCase();
  if (!s || s === 'false' || s === '0' || s === 'no' || s === 'ไม่') return false;
  return s === 'true' || s === 'checked' || s === '1' || s === '✓' || s === 'x'
      || s === 'yes'  || s === 'y'       || s === 'มี' || s === 'ใช่' || s === 'ติ๊ก';
}
