// convert.js — แปลง Excel ใน data/ → data/*.json (แยกไฟล์ต่อ dataset)
// รัน: node convert.js
// exit code 0 = มีการเปลี่ยนแปลง (ให้ push)
// exit code 2 = ไม่มีการเปลี่ยนแปลง (ข้าม push)

const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR  = path.join(__dirname, 'data');
const HASH_FILE = path.join(__dirname, '.last-hash');

// คอลัมน์ที่ต้องการต่อ dataset (null = เก็บทั้งหมด)
const KEEP_COLS = {
  agingOutDom: [
    'วันที่รถออกจาก DC', 'เลขที่เอกสาร OUTB', 'รหัสสาขา', 'ชื่อสาขา', 'ชื่อย่อสาขา (EN)',
    'เลขที่เอกสาร POI', 'บาร์โค้ด Onetime', 'วันที่รับสินค้า', 'ชื่อผู้จำหน่าย',
    'วันที่ดำเนินการ', 'รหัส Location', 'ชื่อ Location', 'รหัสพาเลท',
    'รหัสพนักงาน', 'ชื่อ-นามสกุลผู้บันทึก Console Int', 'วันที่บันทึก Console Int', 'สถานะพาเลท',
  ],
  agingOutImp: [
    'วันที่', 'เลขที่เอกสาร', 'รหัสสาขา', 'ชื่อสาขา', 'ชื่อย่อสาขา (EN)',
    'รหัสสินค้า', 'ชื่อสินค้า', 'จำนวน(กล่อง)', 'จำนวนโอน(ชิ้น)',
    'เลขที่ขอโอน', 'Category Name', 'ประเภท',
    'วันที่ดำเนินการ', 'รหัส Location', 'ชื่อ Location', 'รหัสพาเลท',
    'รหัสพนักงาน', 'ชื่อ-นามสกุลผู้บันทึก Console Int', 'วันที่บันทึก Console Int', 'สถานะพาเลท',
  ],
  car:    null, // เก็บทั้งหมด
  pallet: null,
  in:     null,
  uot:    null,
};

// ชื่อ column Excel → ชื่อ field API (เฉพาะ agingOutDom และ agingOutImp)
const RENAME_COLS = {
  agingOutDom: {
    'รหัสสาขา':                           'branchCode',
    'ชื่อสาขา':                           'branchShortName',
    'ชื่อย่อสาขา (EN)':                   'branchShortNameEn',
    'บาร์โค้ด Onetime':                   'onetimeBarcode',
    'วันที่ดำเนินการ':                    'daterun',
    'รหัส Location':                      'locationCode',
    'ชื่อ Location':                      'locationName',
    'รหัสพาเลท':                         'palletid',
    'รหัสพนักงาน':                        'scanintEmp',
    'ชื่อ-นามสกุลผู้บันทึก Console Int':  'scanintFullname',
    'วันที่บันทึก Console Int':            'scanintTime',
    'สถานะพาเลท':                        'statusName',
  },
  agingOutImp: {
    'รหัสสาขา':                           'branchCode',
    'ชื่อสาขา':                           'branchShortName',
    'ชื่อย่อสาขา (EN)':                   'branchShortNameEn',
    'วันที่ดำเนินการ':                    'daterun',
    'รหัส Location':                      'locationCode',
    'ชื่อ Location':                      'locationName',
    'รหัสพาเลท':                         'palletid',
    'รหัสพนักงาน':                        'scanintEmp',
    'ชื่อ-นามสกุลผู้บันทึก Console Int':  'scanintFullname',
    'วันที่บันทึก Console Int':            'scanintTime',
    'สถานะพาเลท':                        'statusName',
  },
  car: {
    'เลขที่เอกสาร':           'doc_no',
    'ชื่อสาขา':               'source_name',
    'ชื่อย่อสาขา':            'source_code',
    'คลังสินค้า':             'port_id',
    'ช่วงเวลา':               'zone_time',
    'วันที่คิวงาน':            'search_date',
    'ประเภทรถ':               'truck_info',
    'ประเภทงาน':              'rc_type_product',
    'ป้ายทะเบียน':            'truck_registration',
    'ชื่อคนขับ':              'driver_name',
    'เบอร์โทร':               'driver_tel',
    'รถยังไม่ออกจาก DC':      'status_shipping',
    'Vendor Name':            'vendor_name',
  },
};

// รูปแบบชื่อไฟล์ → key + output path (สัมพัทธ์กับ DATA_DIR)
const FILE_PATTERNS = [
  { key: 'agingOutDom', out: 'outbound/aging-dom.json', pattern: /^aging.*dom/i },
  { key: 'agingOutImp', out: 'outbound/aging-imp.json', pattern: /^aging.*imp/i },
  { key: 'car',         out: 'outbound/car.json',        pattern: /^car/i },
  { key: 'pallet',      out: 'warehouse/pallet.json',    pattern: /^in\s*p/i },
  { key: 'in',          out: 'poi/in.json',              pattern: /^in(?!\s*p)/i },
  { key: 'uot',         out: 'poi/uot.json',             pattern: /^out/i },
];

function findFile(pattern) {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => /\.xlsx?$/i.test(f));
    const match = files.find(f => pattern.test(f));
    return match || null;
  } catch { return null; }
}

function readSheet(filename, keepCols, renameCols) {
  const fp = path.join(DATA_DIR, filename);
  try {
    const wb   = XLSX.readFile(fp, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    let rows   = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    // ตัด column ที่ไม่ต้องการ + rename ตาม API field name
    if (keepCols) {
      rows = rows.map(r => {
        const out = {};
        keepCols.forEach(c => {
          const newKey = renameCols?.[c] || c;
          out[newKey] = r[c] ?? '';
        });
        return out;
      });
    } else if (renameCols) {
      // keepCols = null (เก็บทั้งหมด) แต่ยัง rename ได้
      rows = rows.map(r => {
        const out = {};
        Object.entries(r).forEach(([k, v]) => { out[renameCols[k] || k] = v; });
        return out;
      });
    }

    console.log(`  ✓ ${filename}: ${rows.length} แถว${keepCols ? ` (${keepCols.length} cols)` : ''}`);
    return rows;
  } catch (err) {
    console.error(`  ✗ ${filename}: ${err.message}`);
    return [];
  }
}

function main() {
  console.log('\n[convert.js] แปลง Excel → data/*.json ...');

  const updatedAt = new Date().toISOString();
  const dataMap   = {};

  for (const { key, pattern } of FILE_PATTERNS) {
    const filename = findFile(pattern);
    if (filename) {
      dataMap[key] = readSheet(filename, KEEP_COLS[key], RENAME_COLS[key]);
    } else {
      console.warn(`  ⚠️  ไม่พบไฟล์ที่ตรงกับ pattern: ${pattern}`);
      dataMap[key] = [];
    }
  }

  // hash เฉพาะข้อมูล (ไม่รวม updatedAt)
  const hash     = crypto.createHash('md5').update(JSON.stringify(dataMap)).digest('hex');
  const lastHash = fs.existsSync(HASH_FILE)
    ? fs.readFileSync(HASH_FILE, 'utf8').trim()
    : '';

  if (hash === lastHash) {
    console.log('  ⏭  ข้อมูลไม่เปลี่ยนแปลง — ข้าม push\n');
    process.exit(2);
  }

  // เขียนแยกไฟล์ต่อ dataset
  let totalKb = 0;
  for (const { key, out } of FILE_PATTERNS) {
    const json = JSON.stringify(dataMap[key]);
    const fp   = path.join(DATA_DIR, out);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, json, 'utf8');
    const kb = (json.length / 1024).toFixed(1);
    totalKb += json.length / 1024;
    console.log(`  ✅ ${out}: ${kb} KB`);
  }

  // เขียน bundle.json (รวมทุก dataset = 1 HTTP request แทน 6)
  const bundleJson = JSON.stringify(dataMap);
  fs.writeFileSync(path.join(DATA_DIR, 'bundle.json'), bundleJson, 'utf8');
  console.log(`  ✅ bundle.json: ${(bundleJson.length / 1024).toFixed(1)} KB`);

  // เขียน meta.json (updatedAt)
  const metaJson = JSON.stringify({ updatedAt });
  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), metaJson, 'utf8');
  console.log(`  ✅ meta.json`);

  // อัพเดท cache-busting version ใน index.html → ?v=YYYYMMDD
  const d = new Date();
  const ver = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const indexPath = path.join(__dirname, 'index.html');
  try {
    const html = fs.readFileSync(indexPath, 'utf8');
    const updated = html.replace(/\?v=\d{8}/g, `?v=${ver}`);
    if (updated !== html) {
      fs.writeFileSync(indexPath, updated, 'utf8');
      console.log(`  🔖 index.html: cache version → v=${ver}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  อัพเดท cache version ไม่สำเร็จ: ${e.message}`);
  }

  fs.writeFileSync(HASH_FILE, hash, 'utf8');
  console.log(`  📦 รวม ${(totalKb / 1024).toFixed(1)} MB\n`);
  process.exit(0);
}

main();
