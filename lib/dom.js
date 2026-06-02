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

// สร้าง ApexCharts radialBar (0–270°) พร้อม barLabels แสดงค่าจริง
// values = ค่าจริง (ใช้แสดงใน label), series % normalize ตาม max
function mkRadialBar(id, labels, values, colors, onClickFilter) {
  const el = document.getElementById(id);
  if (!el || !labels.length) return;

  const key = '_apex_' + id;
  if (CR[key]) { try { CR[key].destroy(); } catch(_) {} delete CR[key]; }
  el.innerHTML = '';

  const maxVal = Math.max(...values, 1);
  const series = values.map(v => +(v / maxVal * 100).toFixed(1));
  const isDark = !document.body.classList.contains('light');
  const heightPx = parseInt(el.parentElement?.style?.height) || 260;

  const apex = new ApexCharts(el, {
    series,
    chart: {
      type: 'radialBar',
      height: heightPx,
      background: 'transparent',
      foreColor: isDark ? '#94a3b8' : '#475569',
      toolbar: { show: false },
      animations: { speed: 500, animateGradually: { enabled: false } },
      ...(onClickFilter ? { events: { dataPointSelection: (e, ctx, cfg) => onClickFilter(labels[cfg.dataPointIndex]) } } : {}),
    },
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: 0,
        endAngle: 270,
        hollow: { margin: 5, size: '30%', background: 'transparent' },
        track: {
          background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)',
          strokeWidth: '97%', margin: 5,
        },
        dataLabels: { name: { show: false }, value: { show: false } },
        barLabels: {
          enabled: true,
          useSeriesColors: true,
          offsetX: -20,
          fontSize: '13px',
          formatter: (seriesName, opts) =>
            seriesName + ':  ' + fmtN(values[opts.seriesIndex]),
        },
      },
    },
    colors: colors.length ? colors : ['#22d3ee'],
    labels,
    stroke: { lineCap: 'round' },
  });

  CR[key] = apex;
  requestAnimationFrame(() => {
    if (CR[key] === apex) apex.render().catch(() => {});
  });
}

// สร้าง ApexCharts grouped/stacked bar ตามรูปแบบมาตราฐาน
// series = [{ name, data, color? }]
// opts.colors ถ้าให้ไว้จะ override สีแทน series.color (ใช้กับ distributed)
function mkApexBar(id, categories, series, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;

  const key = '_apex_' + id;
  if (CR[key]) { try { CR[key].destroy(); } catch(_) {} delete CR[key]; }
  el.innerHTML = '';

  const isDark = !document.body.classList.contains('light');
  const {
    stacked      = false,
    distributed  = false,
    yTitle       = '',
    xRotate      = 0,
    columnWidth  = '55%',
    hideLegend   = false,
    colors       : overrideColors = null,
    formatter    = v => fmtN(v),
    onClick      = null,
  } = opts;

  const colors     = overrideColors || series.map(s => s.color || '#22d3ee');
  const apexSeries = series.map(s => ({ name: s.name, data: s.data }));
  const heightPx   = parseInt(el.parentElement?.style?.height) || 240;

  const apex = new ApexCharts(el, {
    series: apexSeries,
    chart: {
      type: 'bar',
      height: heightPx,
      width: '100%',
      background: 'transparent',
      foreColor: isDark ? '#94a3b8' : '#475569',
      stacked,
      toolbar: { show: false },
      animations: { speed: 400, animateGradually: { enabled: false } },
      ...(onClick ? { events: { dataPointSelection: (e, ctx, cfg) => onClick(categories[cfg.dataPointIndex], apexSeries[cfg.seriesIndex]?.name) } } : {}),
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth,
        borderRadius: 5,
        borderRadiusApplication: 'end',
        distributed,
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    colors,
    xaxis: {
      categories,
      labels: {
        style: { colors: isDark ? '#7b93b0' : '#374151', fontSize: '11px' },
        rotate: xRotate,
        rotateAlways: xRotate !== 0,
      },
      axisBorder: { color: isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)' },
    },
    yaxis: {
      title: yTitle ? {
        text: yTitle,
        style: { color: isDark ? '#7b93b0' : '#374151', fontSize: '11px' },
      } : undefined,
      labels: {
        style: { colors: isDark ? '#7b93b0' : '#374151', fontSize: '10px' },
        formatter,
      },
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter },
    },
    legend: hideLegend ? { show: false } : {
      position: 'bottom',
      fontSize: '12px',
      offsetY: 4,
      labels: { colors: isDark ? '#93c5fd' : '#1e293b' },
      markers: { width: 10, height: 10 },
    },
    grid: {
      borderColor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)',
      strokeDashArray: 3,
    },
  });

  CR[key] = apex;
  requestAnimationFrame(() => {
    if (CR[key] === apex) apex.render().catch(() => {});
  });
}

// ลงทะเบียน plugin และตั้งค่า defaults ของ Chart.js (เรียกครั้งเดียวตอน init)
function initChartDefaults() {
  Chart.register(ChartDataLabels);
  Chart.defaults.color       = '#7b93b0';
  Chart.defaults.borderColor = 'rgba(255,255,255,.06)';
  Chart.defaults.plugins.legend.labels.color = '#93c5fd';
}
