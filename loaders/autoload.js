// loaders/autoload.js — โหลด data/*.json อัตโนมัติ (GitHub Pages)
// รันหลัง app.js bootstrap เสร็จ
// ถ้าเปิดจาก file:// (local) จะข้ามไป ไม่ทำอะไร

(async function autoLoad() {
  if (location.protocol === 'file:') return;

  const ts = Date.now();
  const get = url => fetch(url + '?_=' + ts).then(r => r.ok ? r.json() : null).catch(() => null);

  try {
    const [meta, uot, inData, car, pallet, agDom, agImp] = await Promise.all([
      get('./data/meta.json'),
      get('./data/uot.json'),
      get('./data/in.json'),
      get('./data/car.json'),
      get('./data/pallet.json'),
      get('./data/aging-dom.json'),
      get('./data/aging-imp.json'),
    ]);

    let loaded = 0;
    if (uot?.length)    { dataUot         = uot;    loaded++; }
    if (inData?.length) { dataIn          = inData; loaded++; }
    if (car?.length)    { dataCar         = car;    loaded++; }
    if (pallet?.length) { dataPallet      = pallet; loaded++; }
    if (agDom?.length)  { dataAgingOutDom = agDom;  loaded++; }
    if (agImp?.length)  { dataAgingOutImp = agImp;  loaded++; }
    if (dataAgingOutDom.length || dataAgingOutImp.length) _rebuildCombinedAging();

    if (!loaded) return;

    // อัพเดท status badge
    const b = document.getElementById('sbadge');
    if (b) { b.className = 'sbadge live'; b.innerHTML = '<span class="dot"></span>🌐 AUTO'; }

    const dt = meta?.updatedAt
      ? new Date(meta.updatedAt).toLocaleString('th-TH')
      : '';
    const metaEl = document.getElementById('meta');
    if (metaEl && dt) metaEl.textContent = 'ข้อมูล ณ: ' + dt;

    const alertEl = document.getElementById('alertbox');
    if (alertEl) alertEl.classList.remove('show');

    // Rebuild ทุก tab
    rebuild();
    rebuildCar();
    renderCar();

    if (pallet?.length) rebuildPalletMap();

    if (dataAgingOut.length) {
      fillPayFilters();
      renderPay();
    }

  } catch {
    // ไม่มีไฟล์ data — ผู้ใช้จะ upload เองตามปกติ
  }
})();
