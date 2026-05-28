// watch.js — ตรวจจับไฟล์ Excel เปลี่ยนแปลง → auto convert + git push
// รัน: node watch.js
// หยุด: Ctrl+C

const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT      = __dirname;
const DATA_DIR  = path.join(ROOT, 'data');
const LOG_FILE  = path.join(ROOT, 'logs', 'update.log');
const DEBOUNCE  = 3000; // รอ 3 วินาทีหลังไฟล์เปลี่ยน ก่อนรัน

// ---- Logging ----
if (!fs.existsSync(path.join(ROOT, 'logs'))) {
  fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
}
function log(msg) {
  const line = `[${new Date().toLocaleString('th-TH')}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

// ---- Update pipeline ----
let debounceTimer = null;
let isRunning     = false;

function scheduleUpdate(reason) {
  log(`📁 ${reason} — รอ ${DEBOUNCE / 1000}s...`);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runUpdate, DEBOUNCE);
}

function runUpdate() {
  if (isRunning) { log('⏳ กำลังรันอยู่ — ข้าม trigger นี้'); return; }
  isRunning = true;
  log('🔄 เริ่ม convert + push...');

  exec('node convert.js', { cwd: ROOT }, (err, stdout, stderr) => {
    if (stdout.trim()) log(stdout.trim());
    if (stderr.trim()) log('WARN: ' + stderr.trim());

    // exit code 2 = ไม่มีการเปลี่ยนแปลง
    if (err && err.code === 2) {
      log('⏭  ข้อมูลไม่เปลี่ยนแปลง — ข้าม push');
      isRunning = false;
      return;
    }
    if (err) {
      log('❌ convert.js ล้มเหลว: ' + err.message);
      isRunning = false;
      return;
    }

    const dt      = new Date().toLocaleString('th-TH');
    const pushCmd = [
      'git add data/aging-dom.json data/aging-imp.json data/car.json data/pallet.json data/in.json data/uot.json data/meta.json index.html',
      `git commit -m "data: auto-update ${dt}"`,
      'git push'
    ].join(' && ');

    exec(pushCmd, { cwd: ROOT }, (pushErr, pushOut, pushErrOut) => {
      if (pushOut.trim()) log(pushOut.trim());
      const gitMsg = pushErrOut.trim();
      if (gitMsg && !gitMsg.includes('Everything up-to-date')) log('git: ' + gitMsg);

      if (pushErr) {
        log('❌ git push ล้มเหลว: ' + pushErr.message);
      } else {
        log('✅ push สำเร็จ — dashboard อัพเดทใน ~1 นาที');
      }
      isRunning = false;
    });
  });
}

// ---- Watch Excel files ----
const XLSX_REGEX = /\.xlsx?$/i;

function watchFile(filename) {
  const fp = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fp)) return false;
  fs.watch(fp, () => scheduleUpdate(`ไฟล์เปลี่ยน: ${filename}`));
  return true;
}

// Watch directory for any xlsx change (รองรับทั้งไฟล์เดิมและไฟล์ใหม่)
log('👀 เริ่ม watch: ' + DATA_DIR);

const watched = new Set();
function refreshWatchers() {
  try {
    fs.readdirSync(DATA_DIR)
      .filter(f => XLSX_REGEX.test(f) && !watched.has(f))
      .forEach(f => {
        if (watchFile(f)) {
          watched.add(f);
          log(`  ✓ watching: ${f}`);
        }
      });
  } catch {}
}

refreshWatchers();

// Watch directory เพื่อจับไฟล์ใหม่ที่วางลงมา
fs.watch(DATA_DIR, (eventType, filename) => {
  if (!filename || !XLSX_REGEX.test(filename)) return;
  if (!watched.has(filename)) {
    refreshWatchers();
  }
  scheduleUpdate(`directory change: ${filename}`);
});

log('✅ watch.js พร้อมทำงาน (กด Ctrl+C เพื่อหยุด)\n');
