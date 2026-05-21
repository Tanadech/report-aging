// ============ lib/format.js — ฟังก์ชัน format ตัวเลขและ string ============

const num  = v => parseFloat(String(v).replace(/,/g, '')) || 0;
const fmtN = n => Math.round(n).toLocaleString('th-TH');
const fmtD = (n, d = 2) => n.toFixed(d);
const fmtP = n => (+n || 0).toLocaleString('th-TH', { maximumFractionDigits: 4, minimumFractionDigits: 0 });
const esc  = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
