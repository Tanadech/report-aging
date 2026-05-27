// loaders/autoload.js — โหลด data/data.json อัตโนมัติ (GitHub Pages)
// รันหลัง app.js bootstrap เสร็จ
// ถ้าเปิดจาก file:// (local) จะข้ามไป ไม่ทำอะไร

(async function autoLoad() {
  if (location.protocol === 'file:') return;

  try {
    const res = await fetch('./data/data.json?_=' + Date.now());
    if (!res.ok) return;

    const d = await res.json();
    let loaded = 0;

    if (d.uot?.length)         { dataUot         = d.uot;         loaded++; }
    if (d.in?.length)          { dataIn          = d.in;          loaded++; }
    if (d.car?.length)         { dataCar         = d.car;         loaded++; }
    if (d.pallet?.length)      { dataPallet      = d.pallet;      loaded++; }
    // รองรับ format ใหม่ (DOM + IMP แยก) และ format เก่า (agingOut รวม)
    if (d.agingOutDom?.length) { dataAgingOutDom = d.agingOutDom; loaded++; }
    if (d.agingOutImp?.length) { dataAgingOutImp = d.agingOutImp; loaded++; }
    else if (d.agingOut?.length) { dataAgingOutImp = d.agingOut;  loaded++; } // backward compat
    if (dataAgingOutDom.length || dataAgingOutImp.length) _rebuildCombinedAging();

    if (!loaded) return;

    // อัพเดท status badge
    const b = document.getElementById('sbadge');
    if (b) { b.className = 'sbadge live'; b.innerHTML = '<span class="dot"></span>🌐 AUTO'; }

    const dt = d.updatedAt
      ? new Date(d.updatedAt).toLocaleString('th-TH')
      : '';
    const metaEl = document.getElementById('meta');
    if (metaEl && dt) metaEl.textContent = 'ข้อมูล ณ: ' + dt;

    const alertEl = document.getElementById('alertbox');
    if (alertEl) alertEl.classList.remove('show');

    // Rebuild ทุก tab
    rebuild();
    rebuildCar();
    renderCar();

    if (d.pallet?.length) rebuildPalletMap();

    if (dataAgingOut.length) {
      fillPayFilters();
      renderPay();
    }

  } catch {
    // ไม่มี data.json — ผู้ใช้จะ upload เองตามปกติ
  }
})();
