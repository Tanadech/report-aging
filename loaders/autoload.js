// loaders/autoload.js — โหลด data/*.json อัตโนมัติ (GitHub Pages)
// ใช้ Cache API: เช็ค meta.json ก่อน ถ้าข้อมูลไม่เปลี่ยน → ใช้ cache (เร็วมาก)
// ถ้าข้อมูลใหม่ → fetch ใหม่ทั้งหมดพร้อมกัน (parallel) แล้ว cache ไว้

// ── Normalization: รองรับ JSON เก่า (ชื่อไทย) และ JSON ใหม่ (API field name) ──
function _normCar(r) {
  if ('doc_no' in r) return r;
  const MAP = {
    'เลขที่เอกสาร':        'doc_no',
    'ชื่อสาขา':            'source_name',
    'ชื่อย่อสาขา':         'source_code',
    'คลังสินค้า':          'port_id',
    'ช่วงเวลา':            'zone_time',
    'วันที่คิวงาน':         'search_date',
    'ประเภทรถ':            'truck_info',
    'ประเภทงาน':           'rc_type_product',
    'ป้ายทะเบียน':         'truck_registration',
    'ชื่อคนขับ':           'driver_name',
    'เบอร์โทร':            'driver_tel',
    'รถยังไม่ออกจาก DC':   'status_shipping',
    'Vendor Name':         'vendor_name',
  };
  const out = {};
  Object.entries(r).forEach(([k, v]) => { out[MAP[k] || k] = v; });
  return out;
}

function _normAgDom(r) {
  if ('branchShortName' in r) return r;
  const MAP = {
    'รหัสสาขา':                           'branchCode',
    'ชื่อสาขา':                           'branchShortName',
    'ชื่อย่อสาขา (EN)':                   'branchShortNameEn',
    'ชื่อย่อสาขา':                         'branchShortNameEn',
    'บาร์โค้ด Onetime':                   'onetimeBarcode',
    'Onetime Barcode':                    'onetimeBarcode',
    'วันที่ดำเนินการ':                    'daterun',
    'รหัส Location':                      'locationCode',
    'ชื่อ Location':                      'locationName',
    'รหัสพาเลท':                         'palletid',
    'รหัสพนักงาน':                        'scanintEmp',
    'ชื่อ-นามสกุลผู้บันทึก Console Int':  'scanintFullname',
    'วันที่บันทึก Console Int':            'scanintTime',
    'สถานะพาเลท':                        'statusName',
  };
  const out = {};
  Object.entries(r).forEach(([k, v]) => { out[MAP[k] || k] = v; });
  return out;
}

function _normAgImp(r) {
  if ('branchShortName' in r) return r;
  const MAP = {
    'รหัสสาขา':                           'branchCode',
    'ชื่อสาขา':                           'branchShortName',
    'ชื่อย่อสาขา (EN)':                   'branchShortNameEn',
    'ชื่อย่อสาขา':                         'branchShortNameEn',
    'วันที่ดำเนินการ':                    'daterun',
    'รหัส Location':                      'locationCode',
    'ชื่อ Location':                      'locationName',
    'รหัสพาเลท':                         'palletid',
    'รหัสพนักงาน':                        'scanintEmp',
    'ชื่อ-นามสกุลผู้บันทึก Console Int':  'scanintFullname',
    'วันที่บันทึก Console Int':            'scanintTime',
    'สถานะพาเลท':                        'statusName',
  };
  const out = {};
  Object.entries(r).forEach(([k, v]) => { out[MAP[k] || k] = v; });
  return out;
}

function _rebuildCombinedAging() {
  dataAgingOut = [
    ...dataAgingOutDom.map(r => ({ ...r, _src: 'dom' })),
    ...dataAgingOutImp.map(r => ({ ...r, _src: 'imp' })),
  ];
}

(async function autoLoad() {
  if (location.protocol === 'file:') return;

  const CACHE_NAME = 'report-aging-v3';
  // aging-dom/aging-imp ไม่ได้อยู่ใน git (ใหญ่เกิน 100MB GitHub limit)
  // แต่ถ้ามีไฟล์อยู่ (เช่น Local / Live Server) จะโหลดได้ตามปกติ
  // ถ้าไม่มี (404 บน GitHub Pages) จะข้ามไปเงียบๆ
  const FILES = [
    { url: './data/outbound/aging-dom.json', key: 'agDom'  },
    { url: './data/outbound/aging-imp.json', key: 'agImp'  },
    { url: './data/outbound/car.json',       key: 'car'    },
    { url: './data/warehouse/pallet.json',   key: 'pallet' },
    { url: './data/poi/in.json',             key: 'inData' },
    { url: './data/poi/uot.json',            key: 'uot'    },
  ];

  try {
    const meta = await fetch('./data/meta.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null).catch(() => null);
    if (!meta?.updatedAt) return;

    const cachedAt = localStorage.getItem('ra-updated-at');
    const hasCache = 'caches' in window;
    const isFresh  = cachedAt === meta.updatedAt && hasCache;
    const cache    = hasCache ? await caches.open(CACHE_NAME) : null;

    // โหลดทุกไฟล์พร้อมกัน (parallel)
    const loaded = {};
    await Promise.all(FILES.map(async ({ url, key }) => {
      if (isFresh && cache) {
        const hit = await cache.match(url);
        if (hit) { loaded[key] = await hit.json(); return; }
      }
      const res = await fetch(url + '?_=' + Date.now());
      if (!res.ok) return;
      if (cache) await cache.put(url, res.clone());
      loaded[key] = await res.json();
    }));

    if (!isFresh && hasCache) localStorage.setItem('ra-updated-at', meta.updatedAt);

    const { uot, inData, car, pallet, agDom, agImp } = loaded;

    let loadedCount = 0;
    if (uot?.length)    { dataUot         = uot;                    loadedCount++; }
    if (inData?.length) { dataIn          = inData;                loadedCount++; }
    if (car?.length)    { dataCar         = car.map(_normCar);     loadedCount++; }
    if (pallet?.length) { dataPallet      = pallet;                loadedCount++; }
    if (agDom?.length)  { dataAgingOutDom = agDom.map(_normAgDom); loadedCount++; }
    if (agImp?.length)  { dataAgingOutImp = agImp.map(_normAgImp); loadedCount++; }
    if (dataAgingOutDom.length || dataAgingOutImp.length) _rebuildCombinedAging();

    if (!loadedCount) return;

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
