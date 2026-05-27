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

// รูปแบบชื่อไฟล์ → key + output filename
const FILE_PATTERNS = [
  { key: 'agingOutDom', out: 'aging-dom.json', pattern: /^aging.*dom/i },
  { key: 'agingOutImp', out: 'aging-imp.json', pattern: /^aging.*imp/i },
  { key: 'car',         out: 'car.json',        pattern: /^car/i },
  { key: 'pallet',      out: 'pallet.json',     pattern: /^in\s*p/i },
  { key: 'in',          out: 'in.json',          pattern: /^in(?!\s*p)/i },
  { key: 'uot',         out: 'uot.json',         pattern: /^out/i },
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
  console.log('\n[convert.js] แปลง Excel → data/*.json ...');

  const updatedAt = new Date().toISOString();
  const dataMap   = {};

  for (const { key, pattern } of FILE_PATTERNS) {
    const filename = findFile(pattern);
    if (filename) {
      dataMap[key] = readSheet(filename);
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
    fs.writeFileSync(fp, json, 'utf8');
    const kb = (json.length / 1024).toFixed(1);
    totalKb += json.length / 1024;
    console.log(`  ✅ ${out}: ${kb} KB`);
  }

  // เขียน meta.json (updatedAt)
  const metaJson = JSON.stringify({ updatedAt });
  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), metaJson, 'utf8');
  console.log(`  ✅ meta.json`);

  fs.writeFileSync(HASH_FILE, hash, 'utf8');
  console.log(`  📦 รวม ${(totalKb / 1024).toFixed(1)} MB\n`);
  process.exit(0);
}

main();
