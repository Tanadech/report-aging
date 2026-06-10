// ============ tabs/todo.js — Todo List ติดตามสินค้าตกค้าง ============

function renderTodo() {
  _renderTodoImp();
  _renderTodoDom();
}

function _dayBadgeTd(d) {
  const n = +d || 0;
  const cls = n > 30 ? 'hi' : n > 14 ? 'mi' : 'lo';
  return `<span class="db ${cls}">${n}</span>`;
}

function _todoKpiRow(chips) {
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${
    chips.map(c => `<div style="display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:${c.bg};border:1px solid ${c.border};min-width:80px;">
      <span style="color:${c.color};font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;">${fmtN(c.val)}</span>
      <span style="color:var(--muted);font-size:10.5px;margin-top:2px;text-align:center;">${c.unit}</span>
    </div>`).join('')
  }</div>`;
}

// ── IMPORTED ──
function _renderTodoImp() {
  if (typeof dataUot === 'undefined') return;
  const search = (document.getElementById('todo-search')?.value || '').trim().toLowerCase();

  const byDoc = {};
  dataUot.forEach(r => {
    const key = r['เลขที่เอกสารขอโอน'] || '(ไม่ระบุ)';
    if (!byDoc[key]) {
      byDoc[key] = {
        docNo:   key,
        branch:  r['ชื่อสาขา']      || '',
        zone:    r['Zone ID']       || '',
        wh:      r['คลังสินค้า']    || '',
        status:  r['สถานะประมวลผล'] || '',
        maxDays: 0,
        skus:    new Set()
      };
    }
    const d = +r['วันค้างส่ง'] || 0;
    if (d > byDoc[key].maxDays) byDoc[key].maxDays = d;
    if (r['รหัสสินค้า']) byDoc[key].skus.add(r['รหัสสินค้า']);
  });

  const allRows = Object.values(byDoc).sort((a, b) => b.maxDays - a.maxDays);
  const filtered = search
    ? allRows.filter(r =>
        r.docNo.toLowerCase().includes(search) ||
        r.branch.toLowerCase().includes(search) ||
        r.zone.toLowerCase().includes(search))
    : allRows;

  const maxDays  = allRows.length ? allRows[0].maxDays : 0;
  const over30   = allRows.filter(r => r.maxDays > 30).length;
  const branches = new Set(allRows.map(r => r.branch).filter(Boolean)).size;

  document.getElementById('todo-imp-kpi').innerHTML = _todoKpiRow([
    { val: allRows.length, unit: 'เอกสารคงค้าง',    color: '#7dd3fc', bg: 'rgba(0,184,217,.1)',   border: 'rgba(0,184,217,.25)' },
    { val: branches,       unit: 'สาขา',             color: '#4ade80', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.25)' },
    { val: maxDays,        unit: 'วันค้างสูงสุด',    color: '#fbbf24', bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.25)' },
    { val: over30,         unit: 'ค้างเกิน 30 วัน',  color: '#f87171', bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.25)' },
  ]);

  const cntEl = document.getElementById('todo-imp-cnt');
  if (cntEl) cntEl.textContent = `${fmtN(filtered.length)} รายการ${search ? ' (กรอง)' : ''}`;

  let html = `<div style="overflow:auto;max-height:440px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl" style="width:100%;">
      <thead><tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>เลขที่เอกสาร</th>
        <th>สาขา</th>
        <th>Zone</th>
        <th>คลัง</th>
        <th>สถานะ</th>
        <th style="text-align:center;width:60px;">SKU</th>
        <th style="text-align:center;width:85px;">วันค้างส่ง</th>
      </tr></thead><tbody>`;

  if (!filtered.length) {
    html += `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px;">ไม่มีข้อมูล</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      html += `<tr>
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td class="mdoc">${esc(r.docNo)}</td>
        <td style="font-size:12px;">${esc(r.branch)}</td>
        <td><span style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#7dd3fc;">${esc(r.zone || '—')}</span></td>
        <td><span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#4ade80;">${esc(r.wh || '—')}</span></td>
        <td><span class="spill ${statusCls(r.status)}">${esc(r.status || '—')}</span></td>
        <td style="text-align:center;font-weight:700;color:#7dd3fc;">${r.skus.size}</td>
        <td style="text-align:center;">${_dayBadgeTd(r.maxDays)}</td>
      </tr>`;
    });
  }

  html += '</tbody></table></div>';
  document.getElementById('todo-imp-tbl').innerHTML = html;
}

// ── DOMESTIC ──
function _renderTodoDom() {
  if (typeof dataIn === 'undefined') return;
  const search = (document.getElementById('todo-search')?.value || '').trim().toLowerCase();

  const byDoc = {};
  dataIn.forEach(r => {
    const key = r['เลขที่เอกสาร POI'] || '(ไม่ระบุ)';
    const abr = r['ชื่อย่อสาขา'] || '';
    if (!byDoc[key]) {
      byDoc[key] = {
        docNo:    key,
        branch:   BR_ABR_MAP[abr] || abr,
        zone:     r['Zone Name']       || '',
        wh:       getWH(r),
        vendor:   r['ชื่อผู้จำหน่าย'] || '',
        maxDays:  0,
        onetimes: new Set()
      };
    }
    const d = +r['วันคงค้าง'] || 0;
    if (d > byDoc[key].maxDays) byDoc[key].maxDays = d;
    if (r['เลขที่ onetime']) byDoc[key].onetimes.add(r['เลขที่ onetime']);
  });

  const allRows = Object.values(byDoc).sort((a, b) => b.maxDays - a.maxDays);
  const filtered = search
    ? allRows.filter(r =>
        r.docNo.toLowerCase().includes(search) ||
        r.branch.toLowerCase().includes(search) ||
        r.vendor.toLowerCase().includes(search))
    : allRows;

  const maxDays  = allRows.length ? allRows[0].maxDays : 0;
  const over30   = allRows.filter(r => r.maxDays > 30).length;
  const branches = new Set(allRows.map(r => r.branch).filter(Boolean)).size;

  document.getElementById('todo-dom-kpi').innerHTML = _todoKpiRow([
    { val: allRows.length, unit: 'เอกสารคงค้าง',    color: '#7dd3fc', bg: 'rgba(0,184,217,.1)',   border: 'rgba(0,184,217,.25)' },
    { val: branches,       unit: 'สาขา',             color: '#4ade80', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.25)' },
    { val: maxDays,        unit: 'วันคงค้างสูงสุด',  color: '#fbbf24', bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.25)' },
    { val: over30,         unit: 'ค้างเกิน 30 วัน',  color: '#f87171', bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.25)' },
  ]);

  const cntEl = document.getElementById('todo-dom-cnt');
  if (cntEl) cntEl.textContent = `${fmtN(filtered.length)} รายการ${search ? ' (กรอง)' : ''}`;

  let html = `<div style="overflow:auto;max-height:440px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl" style="width:100%;">
      <thead><tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>เลขที่เอกสาร POI</th>
        <th>สาขา</th>
        <th>Zone</th>
        <th>คลัง</th>
        <th>ผู้จำหน่าย</th>
        <th style="text-align:center;width:70px;">Onetime</th>
        <th style="text-align:center;width:85px;">วันคงค้าง</th>
      </tr></thead><tbody>`;

  if (!filtered.length) {
    html += `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px;">ไม่มีข้อมูล</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      html += `<tr>
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td class="mdoc">${esc(r.docNo)}</td>
        <td style="font-size:12px;">${esc(r.branch)}</td>
        <td><span style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#7dd3fc;">${esc(r.zone || '—')}</span></td>
        <td><span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#4ade80;">${esc(r.wh || '—')}</span></td>
        <td style="font-size:11px;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.vendor)}">${esc(r.vendor || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#7dd3fc;">${r.onetimes.size}</td>
        <td style="text-align:center;">${_dayBadgeTd(r.maxDays)}</td>
      </tr>`;
    });
  }

  html += '</tbody></table></div>';
  document.getElementById('todo-dom-tbl').innerHTML = html;
}
