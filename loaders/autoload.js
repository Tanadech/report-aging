// loaders/autoload.js — โหลด data/*.json อัตโนมัติ (GitHub Pages)
// ใช้ Cache API: เช็ค meta.json ก่อน ถ้าข้อมูลไม่เปลี่ยน → ใช้ cache (เร็วมาก)
// ถ้าข้อมูลใหม่ → fetch ใหม่ทั้งหมด แล้ว cache ไว้

(async function autoLoad() {
  if (location.protocol === 'file:') return;

  const CACHE_NAME = 'report-aging-v1';
  const DATA_URLS  = [
    './data/uot.json',
    './data/in.json',
    './data/car.json',
    './data/pallet.json',
    './data/aging-dom.json',
    './data/aging-imp.json',
  ];

  try {
    // 1. เช็ค meta.json (ไฟล์เล็กมาก ~50 bytes) เพื่อดู updatedAt
    const meta = await fetch('./data/meta.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null).catch(() => null);
    if (!meta?.updatedAt) return;

    const cachedAt  = localStorage.getItem('ra-updated-at');
    const hasCache  = 'caches' in window;
    const isFresh   = cachedAt === meta.updatedAt && hasCache;

    let datasets;

    if (isFresh) {
      // ── เร็ว: โหลดจาก Cache API (ไม่ใช้ network เลย) ──
      const cache = await caches.open(CACHE_NAME);
      datasets = await Promise.all(
        DATA_URLS.map(url => cache.match(url).then(r => r ? r.json() : null))
      );
      // ถ้า cache หายไป → fallback fetch ใหม่
      if (datasets.some(d => d === null)) {
        datasets = null;
      }
    }

    if (!datasets) {
      // ── โหลดใหม่จาก network + บันทึกลง cache ──
      const cache = hasCache ? await caches.open(CACHE_NAME) : null;
      datasets = await Promise.all(
        DATA_URLS.map(async url => {
          const res = await fetch(url + '?_=' + Date.now());
          if (!res.ok) return null;
          if (cache) await cache.put(url, res.clone());
          return res.json();
        })
      );
      if (hasCache) localStorage.setItem('ra-updated-at', meta.updatedAt);
    }

    const [uot, inData, car, pallet, agDom, agImp] = datasets;

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
    if (b) {
      const updTime = new Date(meta.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      b.className = 'sbadge live';
      b.innerHTML = '<span class="dot"></span>AUTO ' + updTime;
    }

    const dt = new Date(meta.updatedAt).toLocaleString('th-TH');
    const metaEl = document.getElementById('meta');
    if (metaEl) metaEl.textContent = 'ข้อมูล ณ: ' + dt;

    const alertEl = document.getElementById('alertbox');
    if (alertEl) alertEl.classList.remove('show');

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
