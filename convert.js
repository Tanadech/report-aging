// convert.js — แปลง Excel ใน data/ → data/data.json
// รัน: node convert.js
// exit code 0 = มีการเปลี่ยนแปลง (ให้ push)
// exit code 2 = ไม่มีการเปลี่ยนแปลง (ข้าม push)

const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR  = path.join(__dirname, 'data');
const OUT_FILE  = path.join(DATA_DIR, 'data.json');
const HASH_FILE = path.join(__dirname, '.last-hash');

// รูปแบบชื่อไฟล์ → key ใน data.json
// ใช้ regex match เพื่อรองรับชื่อที่มีวันที่ต่อท้าย เช่น "Car 20052026.xlsx"
const FILE_PATTERNS = [
  { key: 'agingOutDom', pattern: /^aging.*dom/i },  // Aging OUTBOUND DOM (ในประเทศ)
  { key: 'agingOutImp', pattern: /^aging.*imp/i },  // Aging OUTBOUND IMP (ต่างประเทศ)
  { key: 'car',         pattern: /^car/i },
  { key: 'pallet',      pattern: /^in\s*p/i },
  { key: 'in',          pattern: /^in(?!\s*p)/i },
  { key: 'uot',         pattern: /^out/i },
];

function findFile(pattern) {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => /\.xlsx?$/i.test(f));
    const match = files.find(f => pattern.test(f));
    return match || null;
  } catch { return null; }
}

function readSheet(filename) {
  const fp = path.join(DATA_DIR, filename);
  try {
    const wb   = XLSX.readFile(fp, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    console.log(`  ✓ ${filename}: ${rows.length} แถว`);
    return rows;
  } catch (err) {
    console.error(`  ✗ ${filename}: ${err.message}`);
    return [];
  }
}

function main() {
  console.log('\n[convert.js] แปลง Excel → data.json ...');

  const data = { updatedAt: new Date().toISOString() };

  for (const { key, pattern } of FILE_PATTERNS) {
    const filename = findFile(pattern);
    if (filename) {
      data[key] = readSheet(filename);
    } else {
      console.warn(`  ⚠️  ไม่พบไฟล์ที่ตรงกับ pattern: ${pattern}`);
      data[key] = [];
    }
  }

  // hash เฉพาะข้อมูล (ไม่รวม updatedAt เพื่อให้ detect การเปลี่ยนแปลงจริง)
  const { updatedAt: _ts, ...dataOnly } = data;
  const hash     = crypto.createHash('md5').update(JSON.stringify(dataOnly)).digest('hex');
  const lastHash = fs.existsSync(HASH_FILE)
    ? fs.readFileSync(HASH_FILE, 'utf8').trim()
    : '';

  if (hash === lastHash) {
    console.log('  ⏭  ข้อมูลไม่เปลี่ยนแปลง — ข้าม push\n');
    process.exit(2);
  }

  const json = JSON.stringify(data);
  fs.writeFileSync(OUT_FILE, json, 'utf8');
  fs.writeFileSync(HASH_FILE, hash, 'utf8');

  const kb = (json.length / 1024).toFixed(1);
  console.log(`  ✅ เขียน data.json สำเร็จ (${kb} KB)\n`);
  process.exit(0);
}

main();
