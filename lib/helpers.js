// ============ lib/helpers.js — ฟังก์ชันอรรถประโยชน์ทั่วไป ============

// ── Number / Format ──
const num   = v => parseFloat(String(v).replace(/,/g, '')) || 0;
const fmtN  = n => Math.round(n).toLocaleString('th-TH');
const fmtD  = (n, d = 2) => n.toFixed(d);
const fmtP  = n => (+n || 0).toLocaleString('th-TH', { maximumFractionDigits: 4, minimumFractionDigits: 0 });

// ── String ──
const esc   = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ── Day badge HTML ──
function db(c) {
  const cls = c > 30 ? 'hi' : c > 14 ? 'mi' : 'lo';
  return `<span class="db ${cls}">${c}</span>`;
}

// ── Status helpers (ใช้ STATUS_MAP จาก data/config.js) ──
function statusCls(s) { return (STATUS_MAP[s] || { cls: 's5' }).cls; }
function statusCol(s) { return (STATUS_MAP[s] || { col: '#94a3b8' }).col; }

// ── Array helpers ──
function groupBy(arr, k) {
  return arr.reduce((m, r) => {
    const v = r[k] || '(ไม่ระบุ)';
    (m[v] = m[v] || []).push(r);
    return m;
  }, {});
}
function uniqCount(arr, k) { return new Set(arr.map(r => r[k] || '').filter(Boolean)).size; }
function uniqVals(arr, k)  { return [...new Set(arr.map(r => r[k] || '').filter(Boolean))].sort(); }

// ── Chart factory ──
// สร้าง/destroy chart และ auto-patch สีตาม theme
function mkChart(id, type, data, opts) {
  if (CR[id]) CR[id].destroy();
  const c = document.getElementById(id);
  if (!c) return;
  const L = document.body.classList.contains('light');
  const tickC = L ? '#374151' : '#7b93b0';
  const gridC = L ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)';
  const dlC   = L ? '#111827' : '#e2e8f0';
  const lgC   = L ? '#1e293b' : '#93c5fd';
  if (opts.scales) Object.values(opts.scales).forEach(ax => {
    if (ax.ticks) ax.ticks.color = tickC;
    if (ax.grid)  ax.grid.color  = gridC;
    if (ax.title) ax.title.color = tickC;
  });
  if (opts.plugins?.legend?.labels) opts.plugins.legend.labels.color = lgC;
  if (type === 'bar' && opts.plugins?.datalabels && typeof opts.plugins.datalabels.color === 'string')
    opts.plugins.datalabels.color = dlC;
  if (type === 'bar' && !opts.layout) opts.layout = { padding: { top: 30 } };
  CR[id] = new Chart(c.getContext('2d'), {
    type, data,
    options: { responsive: true, maintainAspectRatio: false, ...opts }
  });
}

// ── Select / Checkbox helpers ──
function fillSel(el, vals) {
  const sv = el.value;
  el.innerHTML = '<option value="">ทั้งหมด</option>';
  vals.forEach(v => {
    const o = document.createElement('option');
    o.value = o.textContent = v;
    if (v === sv) o.selected = true;
    el.appendChild(o);
  });
}

function fillCBList(el, vals, prefix, labelFn) {
  el.innerHTML = '<button class="cb-drop-btn" type="button">ทั้งหมด</button><div class="cb-drop-panel"></div>';
  const btn   = el.querySelector('.cb-drop-btn');
  const panel = el.querySelector('.cb-drop-panel');
  panel.addEventListener('click', e => e.stopPropagation());
  const ctrl = document.createElement('div');
  ctrl.className = 'cb-drop-ctrl';
  ctrl.innerHTML = '<button type="button" class="cb-ctrl-all">ทั้งหมด</button><button type="button" class="cb-ctrl-none">ล้าง</button>';
  panel.appendChild(ctrl);
  vals.forEach(v => {
    const id = prefix + v.replace(/\s+/g, '_');
    const displayText = labelFn ? labelFn(v) : v;
    const lbl = document.createElement('label');
    lbl.className = 'cb-item';
    lbl.innerHTML = `<input type="checkbox" id="${id}" value="${v}" checked><span title="${displayText}">${displayText}</span>`;
    panel.appendChild(lbl);
  });
  function updBtn() {
    const sel = checkedVals(el).length, tot = vals.length;
    btn.textContent = sel === tot ? 'ทั้งหมด' : sel === 0 ? '(ไม่มี)' : `เลือก ${sel}/${tot}`;
  }
  el._updBtn = updBtn;
  panel.querySelectorAll('input').forEach(cb => cb.addEventListener('change', updBtn));
  ctrl.querySelector('.cb-ctrl-all').addEventListener('click', () => {
    panel.querySelectorAll('input').forEach(c => c.checked = true);
    updBtn();
    panel.querySelector('input')?.dispatchEvent(new Event('change'));
  });
  ctrl.querySelector('.cb-ctrl-none').addEventListener('click', () => {
    panel.querySelectorAll('input').forEach(c => c.checked = false);
    updBtn();
    panel.querySelector('input')?.dispatchEvent(new Event('change'));
  });
  btn.addEventListener('click', e => { e.stopPropagation(); el.classList.toggle('open'); });
}

function checkedVals(container) {
  return [...container.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
}

// ── Filter Tag helpers ──
const DATE_LBL = { '7':'7 วันล่าสุด','30':'30 วัน','90':'3 เดือน','180':'6 เดือน' };

function buildTagsHTML(container, tags, onClearAll) {
  if (!tags.length) { container.classList.add('hidden'); container.innerHTML = ''; return; }
  container.classList.remove('hidden');
  container.innerHTML = '';
  tags.forEach(t => {
    const el = document.createElement('span');
    el.className = 'ftag';
    el.innerHTML = `<span class="ftag-lbl">${esc(t.label)}</span><span class="ftag-sep">:</span><span class="ftag-val" title="${esc(t.value)}">${esc(t.value)}</span><span class="ftag-x" title="ลบตัวกรองนี้">✕</span>`;
    el.querySelector('.ftag-x').addEventListener('click', e => { e.stopPropagation(); t.remove(); });
    container.appendChild(el);
  });
  const clrBtn = document.createElement('button');
  clrBtn.className = 'ftag-clrall';
  clrBtn.innerHTML = '✕ Clear All';
  clrBtn.addEventListener('click', onClearAll);
  container.appendChild(clrBtn);
}

function getCBState(el) {
  const all = [...el.querySelectorAll('input[type=checkbox]')].map(c => c.value);
  const chk = [...el.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
  return { all, chk, isFiltered: chk.length < all.length && all.length > 0 };
}

function uncheckCB(el, value) {
  const cb = [...el.querySelectorAll('input[type=checkbox]')].find(c => c.value === value);
  if (cb) { cb.checked = false; if (el._updBtn) el._updBtn(); }
}

function checkAllCB(el) {
  el.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true);
  if (el._updBtn) el._updBtn();
}

// ── Chart.js global defaults (เรียกครั้งเดียวตอนโหลด) ──
function initChartDefaults() {
  Chart.register(ChartDataLabels);
  Chart.defaults.color        = '#7b93b0';
  Chart.defaults.borderColor  = 'rgba(255,255,255,.06)';
  Chart.defaults.plugins.legend.labels.color = '#93c5fd';
}
