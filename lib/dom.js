// ============ lib/dom.js — DOM helpers: badge, status, chart factory ============

// วันค้างแต่ละระดับ → badge HTML
function db(c) {
  const cls = c > 30 ? 'hi' : c > 14 ? 'mi' : 'lo';
  return `<span class="db ${cls}">${c}</span>`;
}

// ดึง class/color จาก STATUS_MAP (config/constants.js)
function statusCls(s) { return (STATUS_MAP[s] || { cls: 's5' }).cls; }
function statusCol(s) { return (STATUS_MAP[s] || { col: '#94a3b8' }).col; }

// สร้าง/ทำลาย Chart และปรับสีตาม theme อัตโนมัติ
function mkChart(id, type, data, opts) {
  if (CR[id]) CR[id].destroy();
  const c = document.getElementById(id);
  if (!c) return;
  const L     = document.body.classList.contains('light');
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

// ลงทะเบียน plugin และตั้งค่า defaults ของ Chart.js (เรียกครั้งเดียวตอน init)
function initChartDefaults() {
  Chart.register(ChartDataLabels);
  Chart.defaults.color       = '#7b93b0';
  Chart.defaults.borderColor = 'rgba(255,255,255,.06)';
  Chart.defaults.plugins.legend.labels.color = '#93c5fd';
}
