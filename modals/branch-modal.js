// ============ modals/branch-modal.js — Branch Aging Detail Modal ============
// ใช้ร่วมกันทั้ง IMPORTED (openUotBranchDetail) และ DOMESTIC (openInBranchDetail)

function closeBranchModal() {
  document.getElementById('branch-modal').classList.remove('show');
}

document.getElementById('bm-close').addEventListener('click', closeBranchModal);
document.getElementById('branch-modal').addEventListener('click', e => {
  if (e.target.id === 'branch-modal') closeBranchModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('branch-modal').classList.contains('show'))
    closeBranchModal();
});

// ── คิวรถ OUTBOUND วันนี้ + พรุ่งนี้ สำหรับสาขานี้ ──
// fullName = ชื่อสาขาเต็ม (source_name ใน dataCar)
// abrCode  = ชื่อย่อสาขา  (source_code ใน dataCar)
function _branchCarSection(fullName, abrCode) {
  if (typeof dataCar === 'undefined' || !dataCar.length) return '';

  const norm  = s => String(s || '').trim().toLowerCase();
  const fullN = norm(fullName);
  const abrN  = norm(abrCode);
  if (!fullN && !abrN) return '';

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const cars = dataCar.filter(r => {
    const d = parseCarDate(r['search_date']);
    if (!d) return false;
    const isT = sameDate(d, today), isTm = sameDate(d, tomorrow);
    if (!isT && !isTm) return false;
    const rF = norm(r['source_name']);
    const rA = norm(r['source_code']);
    return (fullN && rF === fullN) || (abrN && rA === abrN);
  }).map(r => {
    const d = parseCarDate(r['search_date']);
    return {
      isToday: sameDate(d, today),
      slot:    r['zone_time']          || '-',
      wh:      r['port_id']            || '',
      truck:   r['truck_info']         || '-',
      reg:     r['truck_registration'] || '-',
      driver:  r['driver_name']        || '-',
      status:  r['สถานะลงคิว']        || '',
      docNo:   r['doc_no']             || ''
    };
  }).sort((a, b) => {
    if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
    return timeSlotStart(a.slot) - timeSlotStart(b.slot);
  });

  // ไม่มีรถ
  if (!cars.length) {
    return `<div style="margin-bottom:10px;padding:8px 12px;background:rgba(100,116,139,.1);border:1px solid rgba(100,116,139,.2);border-radius:7px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);">
      🚛 <span>ไม่มีรถเข้าวันนี้หรือพรุ่งนี้</span>
    </div>`;
  }

  const STATUS_STYLE = {
    'มาก่อนเวลา':    'background:rgba(16,185,129,.18);color:#34d399;',
    'มาหลังเวลานัด': 'background:rgba(239,68,68,.18);color:#f87171;',
    'ยกเลิกรับงาน':  'background:rgba(239,68,68,.18);color:#f87171;',
    'ยังไม่มาลงคิว': 'background:rgba(245,158,11,.18);color:#fbbf24;',
  };

  const renderRow = c => {
    const sSt = STATUS_STYLE[c.status] || 'background:rgba(56,189,248,.12);color:#7dd3fc;';
    const stBadge = c.status
      ? `<span style="font-size:10px;padding:1px 7px;border-radius:999px;font-weight:700;${sSt}">${esc(c.status)}</span>`
      : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);font-size:11.5px;flex-wrap:wrap;">
      <span style="font-weight:700;color:#00B8D9;white-space:nowrap;min-width:130px;">⏰ ${esc(c.slot)}</span>
      <span style="background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.2);padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#7dd3fc;">${esc(c.wh || '—')}</span>
      <span style="color:var(--muted);">🚚 ${esc(c.truck)}</span>
      <span style="font-family:monospace;color:#e2e8f0;font-weight:600;">${esc(c.reg)}</span>
      <span style="color:var(--muted);font-size:11px;">${esc(c.driver)}</span>
      ${stBadge}
    </div>`;
  };

  const todayCars    = cars.filter(c => c.isToday);
  const tomorrowCars = cars.filter(c => !c.isToday);

  let html = `<div style="margin-bottom:12px;padding:10px 12px;background:rgba(0,184,217,.06);border:1px solid rgba(0,184,217,.2);border-radius:8px;">
    <div style="font-size:11.5px;font-weight:700;color:#7dd3fc;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
      🚛 คิวรถ OUTBOUND (วันนี้ + พรุ่งนี้)
      <span style="padding:1px 8px;border-radius:999px;background:rgba(0,184,217,.2);font-size:10px;font-weight:700;color:#00B8D9;">${cars.length} คัน</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;">`;

  if (todayCars.length) {
    html += `<div style="font-size:10px;font-weight:700;color:#34d399;padding:2px 0 4px 2px;">🟢 วันนี้ — ${todayCars.length} คัน</div>`;
    todayCars.forEach(c => { html += renderRow(c); });
  }
  if (tomorrowCars.length) {
    html += `<div style="font-size:10px;font-weight:700;color:#fbbf24;padding:${todayCars.length ? '10px' : '2px'} 0 4px 2px;">🟡 พรุ่งนี้ — ${tomorrowCars.length} คัน</div>`;
    tomorrowCars.forEach(c => { html += renderRow(c); });
  }

  html += '</div></div>';
  return html;
}
