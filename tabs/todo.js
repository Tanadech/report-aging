// ============ tabs/todo.js — Todo List ติดตามสินค้าตกค้าง ============

function renderTodo() {
  _renderTodoImp();
  _renderTodoDom();
}

// ── populate filter dropdowns จาก dataUot + dataIn ──
function fillTodoFilters() {
  const fwEl = document.getElementById('td-fw');
  const fbEl = document.getElementById('td-fb');
  if (!fwEl || !fbEl) return;

  const curFw = fwEl.value;
  const curFb = fbEl.value;

  const whs = [...new Set([
    ...dataUot.map(r => r['คลังสินค้า'] || '').filter(Boolean),
    ...dataIn.map(r => getWH(r)).filter(v => v && v !== '(อื่นๆ)')
  ])].sort();
  fwEl.innerHTML = '<option value="">ทั้งหมด</option>' +
    whs.map(w => `<option${w === curFw ? ' selected' : ''}>${esc(w)}</option>`).join('');

  const brs = [...new Set([
    ...dataUot.map(r => r['ชื่อสาขา'] || '').filter(Boolean),
    ...dataIn.map(r => BR_ABR_MAP[r['ชื่อย่อสาขา'] || ''] || r['ชื่อย่อสาขา'] || '').filter(Boolean)
  ])].sort((a, b) => a.localeCompare(b, 'th'));
  fbEl.innerHTML = '<option value="">ทั้งหมด</option>' +
    brs.map(b => `<option${b === curFb ? ' selected' : ''}>${esc(b)}</option>`).join('');
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

function _getTodoFilters() {
  return {
    fw:  (document.getElementById('td-fw')?.value  || '').trim(),
    fb:  (document.getElementById('td-fb')?.value  || '').trim(),
    fd1: +(document.getElementById('td-fd1')?.value || 0),
    fd2: +(document.getElementById('td-fd2')?.value || 0) || Infinity,
    q:   (document.getElementById('todo-search')?.value || '').trim().toLowerCase()
  };
}

// จำกัดความยาวของ joined string
function _joinUniq(set, maxShow) {
  const arr = [...set].filter(Boolean).sort();
  if (!arr.length) return '—';
  if (arr.length <= maxShow) return arr.join(', ');
  return arr.slice(0, maxShow).join(', ') + ` +${arr.length - maxShow}`;
}

// ── IMPORTED ──
function _renderTodoImp() {
  if (typeof dataUot === 'undefined') return;
  const { fw, fb, fd1, fd2, q } = _getTodoFilters();

  // group by เลขที่เอกสารขอโอน
  const byDoc = {};
  dataUot.forEach(r => {
    const key = r['เลขที่เอกสารขอโอน'] || '(ไม่ระบุ)';
    if (!byDoc[key]) {
      byDoc[key] = {
        docNo:      key,
        branch:     r['ชื่อสาขา']      || '',
        wh:         r['คลังสินค้า']    || '',
        zone:       r['Zone ID']       || '',
        locs:       new Set(),
        locIds:     new Set(),
        skus:       new Set(),
        totalQty:   0,
        maxDays:    0,
        rows:       []
      };
    }
    const d = +r['วันค้างส่ง'] || 0;
    if (d > byDoc[key].maxDays) byDoc[key].maxDays = d;
    if (r['Location'])    byDoc[key].locs.add(r['Location']);
    if (r['Location ID']) r['Location ID'].split(',').forEach(s => { const t = s.trim(); if (t) byDoc[key].locIds.add(t); });
    if (r['รหัสสินค้า']) byDoc[key].skus.add(r['รหัสสินค้า']);
    byDoc[key].totalQty += +(r['จำนวนขอโอน'] || 0);
    byDoc[key].rows.push(r);
  });

  const allRows = Object.values(byDoc).sort((a, b) => b.maxDays - a.maxDays);

  let filtered = allRows;
  if (fw) filtered = filtered.filter(r => r.wh === fw);
  if (fb) filtered = filtered.filter(r => r.branch === fb);
  if (fd1 > 0)        filtered = filtered.filter(r => r.maxDays >= fd1);
  if (fd2 < Infinity) filtered = filtered.filter(r => r.maxDays <= fd2);
  if (q)  filtered = filtered.filter(r =>
    r.docNo.toLowerCase().includes(q) ||
    r.branch.toLowerCase().includes(q) ||
    [...r.locs].some(l => l.toLowerCase().includes(q)));

  const maxDays  = filtered.length ? filtered[0].maxDays : 0;
  const over30   = filtered.filter(r => r.maxDays > 30).length;
  const branches = new Set(filtered.map(r => r.branch).filter(Boolean)).size;

  document.getElementById('todo-imp-kpi').innerHTML = _todoKpiRow([
    { val: filtered.length, unit: 'เอกสารคงค้าง',   color: '#7dd3fc', bg: 'rgba(0,184,217,.1)',  border: 'rgba(0,184,217,.25)' },
    { val: branches,        unit: 'สาขา',            color: '#4ade80', bg: 'rgba(34,197,94,.1)',  border: 'rgba(34,197,94,.25)' },
    { val: maxDays,         unit: 'วันค้างสูงสุด',   color: '#fbbf24', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)' },
    { val: over30,          unit: 'ค้างเกิน 30 วัน', color: '#f87171', bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.25)' },
  ]);

  const isFiltered = fw || fb || fd1 > 0 || fd2 < Infinity || q;
  const cntEl = document.getElementById('todo-imp-cnt');
  if (cntEl) cntEl.textContent = `${fmtN(filtered.length)} รายการ${isFiltered ? ' (กรอง)' : ''}`;

  const _numBadge = (n, bg, border, color) =>
    `<span style="display:inline-block;min-width:32px;padding:3px 10px;border-radius:6px;background:${bg};border:1px solid ${border};color:${color};font-size:13px;font-weight:800;text-align:center;">${n}</span>`;

  let html = `<div style="overflow:auto;max-height:480px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl" style="width:100%;font-size:13px;">
      <thead><tr>
        <th style="width:36px;text-align:center;font-size:12px;">#</th>
        <th style="font-size:13px;">เลขที่เอกสาร</th>
        <th style="font-size:13px;">สาขา</th>
        <th style="text-align:center;font-size:13px;">คลัง</th>
        <th style="text-align:center;font-size:13px;">Zone</th>
        <th style="text-align:center;font-size:13px;">Location</th>
        <th style="text-align:center;font-size:13px;">Location ID</th>
        <th style="text-align:center;width:70px;font-size:13px;">Product</th>
        <th style="text-align:center;width:90px;font-size:13px;">จำนวน</th>
        <th style="text-align:center;width:90px;font-size:13px;">วันค้างส่ง</th>
      </tr></thead><tbody>`;

  if (!filtered.length) {
    html += `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px;">ไม่มีข้อมูล</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      html += `<tr style="cursor:pointer;" onclick="openTodoDocDetail('${esc(r.docNo).replace(/'/g,'\\\'')}')"
        onmouseover="this.style.background='rgba(56,189,248,.09)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:12px;">${i + 1}</td>
        <td class="mdoc" style="color:#38bdf8;font-size:13px;">${esc(r.docNo)}</td>
        <td style="font-size:13px;">${esc(r.branch)}</td>
        <td style="text-align:center;"><span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);padding:2px 9px;border-radius:5px;font-size:12px;font-weight:700;color:#4ade80;">${esc(r.wh || '—')}</span></td>
        <td style="text-align:center;"><span style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);padding:2px 9px;border-radius:5px;font-size:12px;font-weight:700;color:#7dd3fc;">${esc(r.zone || '—')}</span></td>
        <td style="text-align:center;">${_numBadge(r.locs.size,   'rgba(167,139,250,.15)', 'rgba(167,139,250,.4)', '#c4b5fd')}</td>
        <td style="text-align:center;">${_numBadge(r.locIds.size, 'rgba(253,169,45,.15)',  'rgba(253,169,45,.4)',  '#fda92d')}</td>
        <td style="text-align:center;">${_numBadge(r.skus.size,   'rgba(0,184,217,.15)',   'rgba(0,184,217,.4)',   '#7dd3fc')}</td>
        <td style="text-align:center;">${_numBadge(fmtN(Math.round(r.totalQty)), 'rgba(34,197,94,.12)', 'rgba(34,197,94,.35)', '#4ade80')}</td>
        <td style="text-align:center;">${_dayBadgeTd(r.maxDays)}</td>
      </tr>`;
    });
  }

  html += '</tbody></table></div>';
  html += `<div style="font-size:10.5px;color:var(--muted);margin-top:6px;padding-left:4px;">💡 คลิกที่แถวเพื่อดูรายละเอียดสินค้าทุกรายการในเอกสารนั้น</div>`;
  document.getElementById('todo-imp-tbl').innerHTML = html;

  // เก็บ byDoc ไว้สำหรับ popup
  window._todoImpByDoc = byDoc;
}

// ── Popup: รายละเอียดสินค้าใน IMPORTED document ──
function openTodoDocDetail(docNo) {
  const doc = (window._todoImpByDoc || {})[docNo];
  if (!doc) return;

  document.getElementById('td-doc-title').textContent = docNo;
  document.getElementById('td-doc-sub').textContent =
    `${doc.branch}  ·  ${doc.wh}  ·  Zone ${doc.zone}  ·  วันค้างสูงสุด ${doc.maxDays} วัน`;

  const rows = doc.rows.slice().sort((a, b) => {
    const la = a['Location'] || '', lb = b['Location'] || '';
    return la < lb ? -1 : la > lb ? 1 : 0;
  });

  let html = `<div class="modal-sum">
    <div class="modal-sum-item"><b>${fmtN(rows.length)}</b> รายการสินค้า</div>
    <div class="modal-sum-item"><b>${fmtN(doc.skus.size)}</b> SKU</div>
    <div class="modal-sum-item"><b>${fmtN(Math.round(doc.totalQty))}</b> จำนวนรวม</div>
    <div class="modal-sum-item"><b>${fmtN(doc.locs.size)}</b> Location</div>
  </div>`;

  html += `<div style="overflow:auto;max-height:520px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl" style="width:100%;min-width:900px;font-size:13px;">
      <thead><tr>
        <th style="width:36px;text-align:center;white-space:nowrap;">#</th>
        <th style="white-space:nowrap;min-width:140px;">รหัสสินค้า</th>
        <th style="min-width:280px;">ชื่อสินค้า</th>
        <th style="text-align:center;white-space:nowrap;min-width:90px;">Location</th>
        <th style="white-space:nowrap;min-width:160px;">Location ID</th>
        <th style="text-align:center;white-space:nowrap;min-width:70px;">จำนวน</th>
        <th style="text-align:center;white-space:nowrap;min-width:55px;">หน่วย</th>
        <th style="white-space:nowrap;min-width:130px;">สถานะ</th>
        <th style="text-align:center;white-space:nowrap;min-width:90px;">วันค้างส่ง</th>
      </tr></thead><tbody>`;

  rows.forEach((r, i) => {
    const locIds = (r['Location ID'] || '').split(',').map(s => s.trim()).filter(Boolean).join(', ');
    html += `<tr>
      <td style="text-align:center;color:var(--muted);font-size:12px;">${i + 1}</td>
      <td style="font-family:monospace;font-size:12px;font-weight:700;color:#93c5fd;white-space:nowrap;">${esc(r['รหัสสินค้า'] || '—')}</td>
      <td style="font-size:13px;">${esc(r['ชื้อสินค้า'] || r['ชื่อสินค้า'] || '—')}</td>
      <td style="text-align:center;white-space:nowrap;"><span style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700;color:#7dd3fc;">${esc(r['Location'] || '—')}</span></td>
      <td style="font-size:12px;color:var(--muted);white-space:nowrap;" title="${esc(locIds)}">${esc(locIds || '—')}</td>
      <td style="text-align:center;font-size:13px;font-weight:700;color:#e2e8f0;white-space:nowrap;">${fmtN(+(r['จำนวนขอโอน'] || 0))}</td>
      <td style="text-align:center;color:var(--muted);font-size:12px;white-space:nowrap;">${esc(r['หน่วยนับ'] || '')}</td>
      <td style="white-space:nowrap;"><span class="spill ${statusCls(r['สถานะประมวลผล'] || '')}">${esc(r['สถานะประมวลผล'] || '—')}</span></td>
      <td style="text-align:center;white-space:nowrap;">${_dayBadgeTd(r['วันค้างส่ง'])}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('td-doc-content').innerHTML = html;
  document.getElementById('td-doc-modal').classList.add('show');
}

// ── Close modal ──
document.getElementById('td-doc-close').addEventListener('click', _closeTodoDocModal);
document.getElementById('td-doc-modal').addEventListener('click', e => {
  if (e.target.id === 'td-doc-modal') _closeTodoDocModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('td-doc-modal').classList.contains('show'))
    _closeTodoDocModal();
});
function _closeTodoDocModal() {
  document.getElementById('td-doc-modal').classList.remove('show');
}

// ── DOMESTIC ──
function _renderTodoDom() {
  if (typeof dataIn === 'undefined') return;
  const { fw, fb, fd1, fd2, q } = _getTodoFilters();

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

  let filtered = allRows;
  if (fw) filtered = filtered.filter(r => r.wh === fw);
  if (fb) filtered = filtered.filter(r => r.branch === fb);
  if (fd1 > 0)        filtered = filtered.filter(r => r.maxDays >= fd1);
  if (fd2 < Infinity) filtered = filtered.filter(r => r.maxDays <= fd2);
  if (q)  filtered = filtered.filter(r =>
    r.docNo.toLowerCase().includes(q) ||
    r.branch.toLowerCase().includes(q) ||
    r.vendor.toLowerCase().includes(q));

  const maxDays  = filtered.length ? filtered[0].maxDays : 0;
  const over30   = filtered.filter(r => r.maxDays > 30).length;
  const branches = new Set(filtered.map(r => r.branch).filter(Boolean)).size;

  document.getElementById('todo-dom-kpi').innerHTML = _todoKpiRow([
    { val: filtered.length, unit: 'เอกสารคงค้าง',    color: '#7dd3fc', bg: 'rgba(0,184,217,.1)',  border: 'rgba(0,184,217,.25)' },
    { val: branches,        unit: 'สาขา',             color: '#4ade80', bg: 'rgba(34,197,94,.1)',  border: 'rgba(34,197,94,.25)' },
    { val: maxDays,         unit: 'วันคงค้างสูงสุด',  color: '#fbbf24', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)' },
    { val: over30,          unit: 'ค้างเกิน 30 วัน',  color: '#f87171', bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.25)' },
  ]);

  const isFiltered = fw || fb || fd1 > 0 || fd2 < Infinity || q;
  const cntEl = document.getElementById('todo-dom-cnt');
  if (cntEl) cntEl.textContent = `${fmtN(filtered.length)} รายการ${isFiltered ? ' (กรอง)' : ''}`;

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
