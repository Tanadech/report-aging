// ============ lib/csv-parser.js — แปลง CSV text → array of objects ============

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];
  const hdrs = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c && c.trim()))
    .map(r => { const o = {}; hdrs.forEach((h, i) => o[h] = (r[i] || '').trim()); return o; });
}

async function fetchCSV(sheet) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const t = await r.text();
  if (t.includes('<!DOCTYPE') || t.startsWith('<HTML')) throw new Error('Sheet ไม่ public');
  return parseCSV(t);
}
