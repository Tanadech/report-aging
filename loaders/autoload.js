// loaders/autoload.js — โหลด data/*.json อัตโนมัติ (GitHub Pages)
// ใช้ Cache API: เช็ค meta.json ก่อน ถ้าข้อมูลไม่เปลี่ยน → ใช้ cache (เร็วมาก)
// ถ้าข้อมูลใหม่ → fetch ใหม่ทั้งหมด แล้ว cache ไว้

// ── Normalization: รองรับ JSON เก่า (ชื่อไทย) และ JSON ใหม่ (API field name) ──
function _normCar(r) {
  if ('doc_no' in r) return r; // JSON ใหม่แล้ว
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
  if ('branchShortName' in r) return r; // JSON ใหม่แล้ว
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
  if ('branchShortName' in r) return r; // JSON ใหม่แล้ว
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

  const CACHE_NAME  = 'report-aging-v2'; // v2 = bundle format
  const BUNDLE_URL  = './data/bundle.json';

  try {
    // 1. เช็ค meta.json (ไฟล์เล็กมาก ~50 bytes) เพื่อดู updatedAt
    const meta = await fetch('./data/meta.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null).catch(() => null);
    if (!meta?.updatedAt) return;

    const cachedAt = localStorage.getItem('ra-updated-at');
    const hasCache = 'caches' in window;
    const isFresh  = cachedAt === meta.updatedAt && hasCache;

    let bundle = null;

    if (isFresh) {
      // ── เร็ว: โหลดจาก Cache API (ไม่ใช้ network เลย) ──
      const cache = await caches.open(CACHE_NAME);
      const hit   = await cache.match(BUNDLE_URL);
      if (hit) bundle = await hit.json();
    }

    if (!bundle) {
      // ── โหลดใหม่จาก network (1 request แทน 6) + บันทึกลง cache ──
      const res = await fetch(BUNDLE_URL + '?_=' + Date.now());
      if (!res.ok) return;
      if (hasCache) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(BUNDLE_URL, res.clone());
        localStorage.setItem('ra-updated-at', meta.updatedAt);
      }
      bundle = await res.json();
    }

    const uot    = bundle?.uot;
    const inData = bundle?.in;
    const car    = bundle?.car;
    const pallet = bundle?.pallet;
    const agDom  = bundle?.agingOutDom;
    const agImp  = bundle?.agingOutImp;

    let loaded = 0;
    if (uot?.length)    { dataUot         = uot;                    loaded++; }
    if (inData?.length) { dataIn          = inData;                loaded++; }
    if (car?.length)    { dataCar         = car.map(_normCar);     loaded++; }
    if (pallet?.length) { dataPallet      = pallet;                loaded++; }
    if (agDom?.length)  { dataAgingOutDom = agDom.map(_normAgDom); loaded++; }
    if (agImp?.length)  { dataAgingOutImp = agImp.map(_normAgImp); loaded++; }
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
