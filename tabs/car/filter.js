// ============ tabs/car/filter.js — Filter logic + rebuild dropdowns ============

const CAR_DATE_LBL = { 'today':'วันนี้','tomorrow':'พรุ่งนี้','todaytomorrow':'วันนี้ + พรุ่งนี้','week':'7 วันข้างหน้า' };

function getCarFiltered() {
  const fdate = document.getElementById('c-fdate').value;
  const fwhCB = checkedVals(document.getElementById('c-fwh-list'));
  const fctCB = checkedVals(document.getElementById('c-fct-list'));
  const fwkCB = checkedVals(document.getElementById('c-fwk-list'));
  const fbrCB = checkedVals(document.getElementById('c-fbr-list'));
  const fstCB = checkedVals(document.getElementById('c-fst-list'));

  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekEnd  = new Date(today); weekEnd.setDate(today.getDate() + 7);

  return dataCar.filter(r => {
    if (fdate) {
      const d  = parseCarDate(r['วันที่คิวงาน']); if (!d) return false;
      const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (fdate === 'today'         && !sameDate(d0, today))    return false;
      if (fdate === 'tomorrow'      && !sameDate(d0, tomorrow)) return false;
      if (fdate === 'todaytomorrow' && !sameDate(d0, today) && !sameDate(d0, tomorrow)) return false;
      if (fdate === 'week'          && (d0 < today || d0 > weekEnd)) return false;
    }
    if (fwhCB.length && !fwhCB.includes(r['คลังสินค้า']))                 return false;
    if (fctCB.length && !fctCB.includes(r['ประเภทรถ']))                    return false;
    if (fwkCB.length && !fwkCB.includes(r['ประเภทงาน']))                   return false;
    if (fbrCB.length && !fbrCB.includes(r['ชื่อย่อสาขา']))                 return false;
    if (fstCB.length && !fstCB.includes(r['สถานะลงคิว'] || '(ไม่ระบุ)')) return false;
    return true;
  });
}

function rebuildCar() {
  [
    ['c-fwh-list', 'คลังสินค้า',   'cfwh_', null],
    ['c-fct-list', 'ประเภทรถ',     'cfct_', null],
    ['c-fwk-list', 'ประเภทงาน',    'cfwk_', null],
    ['c-fbr-list', 'ชื่อย่อสาขา',  'cfbr_', v => BR_ABR_MAP[v] || v]
  ].forEach(([id, col, pfx, lFn]) => {
    fillCBList(document.getElementById(id), uniqVals(dataCar, col), pfx, lFn);
    document.getElementById(id).querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderCar));
  });
  const stVals = [...new Set(dataCar.map(r => r['สถานะลงคิว'] || '(ไม่ระบุ)'))].sort();
  fillCBList(document.getElementById('c-fst-list'), stVals, 'cfst_');
  document.getElementById('c-fst-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderCar));
}
