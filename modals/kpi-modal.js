

const KPI_CONFIG = {
  today:    { title: 'รถเข้าวันนี้',      sub: 'เฉพาะคิววันนี้',                  useFull: true,  fn: (r, t, tm) => sameDate(parseCarDate0(r), t) },
  tomorrow: { title: 'รถเข้าพรุ่งนี้',    sub: 'เฉพาะคิวพรุ่งนี้',                useFull: true,  fn: (r, t, tm) => sameDate(parseCarDate0(r), tm) },
  view:     { title: 'รถในมุมมอง',        sub: 'ตามฟิลเตอร์ปัจจุบัน',             useFull: false, fn: () => true },
  wh:       { title: 'คลังที่ต้องเตรียม', sub: 'แบ่งตามคลัง × ประเภทรถ',          useFull: false, fn: () => true, byWH: true },
  early:    { title: 'มาก่อนเวลา',        sub: 'สถานะลงคิว = มาก่อนเวลา',         useFull: false, fn: r => (r['สถานะลงคิว'] || '').trim() === 'มาก่อนเวลา' },
  late:     { title: 'มาหลังเวลานัด',     sub: 'สถานะลงคิว = มาหลังเวลานัด',      useFull: false, fn: r => (r['สถานะลงคิว'] || '').trim() === 'มาหลังเวลานัด' },
  cancel:   { title: 'ยกเลิกรับงาน',      sub: 'สถานะลงคิว = ยกเลิกรับงาน',       useFull: false, fn: r => (r['สถานะลงคิว'] || '').trim() === 'ยกเลิกรับงาน' },
  notqueue: { title: 'ยังไม่มาลงคิว',     sub: 'สถานะลงคิว = ยังไม่มาลงคิว',      useFull: false, fn: r => (r['สถานะลงคิว'] || '').trim() === 'ยังไม่มาลงคิว' },
  stuck:    { title: 'รถตกค้าง',          sub: 'check "รถตกค้าง"',                useFull: false, fn: r => isChecked(r['รถตกค้าง']) },
  notout:   { title: 'ยังไม่ออก DC',      sub: 'check "รถยังไม่ออกจาก DC"',       useFull: false, fn: r => isChecked(r['รถยังไม่ออกจาก DC']) }
};

function parseCarDate0(r) {
  const d = parseCarDate(r['วันที่คิวงาน']);
  return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
}

function groupByTruckType(rows) {
  const grp = {};
  rows.forEach(r => { const t = (r['ประเภทรถ'] || '(ไม่ระบุ)').trim(); grp[t] = (grp[t] || 0) + 1; });
  return Object.entries(grp).sort((a, b) => b[1] - a[1]);
}

function groupByWH(rows) {
  const grp = {};
  rows.forEach(r => { const w = (r['คลังสินค้า'] || '(ไม่ระบุ)').trim(); (grp[w] = grp[w] || []).push(r); });
  return Object.entries(grp).sort((a, b) => b[1].length - a[1].length);
}

function renderKpiSection(label, cls, rows) {
  if (!rows.length) return '';
  const types = groupByTruckType(rows);
  const items = types.map(([t, c]) => `<li><span class="lbl">🚚 ${esc(t)}</span><b>${fmtN(c)} คัน</b></li>`).join('');
  return `<div class="kpi-sec">
    <div class="kpi-sec-hdr ${cls}">${label}<span class="kpi-sec-total">รวม ${fmtN(rows.length)} คัน</span></div>
    <ul>${items}</ul>
  </div>`;
}

function renderKpiSectionWH(label, cls, rows) {
  if (!rows.length) return '';
  const whs = groupByWH(rows);
  let html = `<div class="kpi-sec">
    <div class="kpi-sec-hdr ${cls}">${label}<span class="kpi-sec-total">รวม ${fmtN(rows.length)} คัน</span></div>`;
  whs.forEach(([wh, wrows]) => {
    const types = groupByTruckType(wrows);
    const items = types.map(([t, c]) => `<li><span class="lbl">&nbsp;&nbsp;🚚 ${esc(t)}</span><b>${fmtN(c)} คัน</b></li>`).join('');
    html += `<div style="margin-bottom:6px;">
      <div style="font-size:12px;font-weight:700;padding:4px 10px;background:rgba(34,211,238,.1);border-left:3px solid #22d3ee;border-radius:4px;margin-bottom:4px;color:#7dd3fc;">📦 ${esc(wh)} <span style="font-weight:400;color:var(--muted);font-size:11px;margin-left:4px;">${wrows.length} คัน</span></div>
      <ul>${items}</ul>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function openKpiDetail(kpiKey) {
  const cfg = KPI_CONFIG[kpiKey]; if (!cfg) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const source = cfg.useFull ? dataCar : getCarFiltered();
  const matched = source.filter(r => cfg.fn(r, today, tomorrow));

  const todayRows    = matched.filter(r => sameDate(parseCarDate0(r), today));
  const tomorrowRows = matched.filter(r => sameDate(parseCarDate0(r), tomorrow));
  const otherRows    = matched.filter(r => { const d = parseCarDate0(r); return d && !sameDate(d, today) && !sameDate(d, tomorrow); });
  const undatedRows  = matched.filter(r => !parseCarDate0(r));

  document.getElementById('km-title').textContent = cfg.title;
  document.getElementById('km-sub').textContent   = `${cfg.sub} • รวม ${fmtN(matched.length)} คัน`;

  let content = '';
  if (!matched.length) {
    content = `<div class="modal-empty"><span class="em">🚛</span>ไม่มีรถในประเภทนี้</div>`;
  } else {
    const sectionFn = cfg.byWH ? renderKpiSectionWH : renderKpiSection;
    content += sectionFn('🟢 วันนี้',   'today', todayRows);
    content += sectionFn('🟡 พรุ่งนี้', 'tmr',   tomorrowRows);
    if (otherRows.length)   content += sectionFn('⚪ วันอื่น',        'other', otherRows);
    if (undatedRows.length) content += sectionFn('❓ ไม่ระบุวันที่', 'other', undatedRows);
  }
  document.getElementById('km-content').innerHTML = content;
  document.getElementById('kpi-modal').classList.add('show');
}

function closeKpiDetail() { document.getElementById('kpi-modal').classList.remove('show'); }

document.getElementById('km-close').addEventListener('click', closeKpiDetail);
document.getElementById('kpi-modal').addEventListener('click', e => { if (e.target.id === 'kpi-modal') closeKpiDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('kpi-modal').classList.contains('show')) closeKpiDetail(); });

// Delegated click on KPI cards
document.getElementById('car-kpi').addEventListener('click', e => {
  const card = e.target.closest('[data-kpi]');
  if (card) openKpiDetail(card.getAttribute('data-kpi'));
});
