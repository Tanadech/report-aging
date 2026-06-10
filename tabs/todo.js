// ============ tabs/todo.js — ผู้โดยสารตกค้าง Overview ============

// ── populate filter dropdowns ──
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

// ── Main render ──
function renderTodo() {
  _renderTodoOverview();
  _renderTodoDocsSection();
}

// ── ภาพรวมรายสาขา ──
function _renderTodoOverview() {
  const { fb, fd1, fd2, q } = _getTodoFilters();
  const norm = s => String(s || '').trim().toLowerCase();

  // ── 1. IMPORTED by-doc ──
  const impByDoc = {};
  dataUot.forEach(r => {
    const key = r['เลขที่เอกสารขอโอน'] || '(ไม่ระบุ)';
    if (!impByDoc[key]) {
      impByDoc[key] = {
        docNo: key, branch: r['ชื่อสาขา'] || '',
        branchCode: r['รหัสสาขา'] || '', branchAbr: r['ชื่อย่อสาขา'] || '',
        wh: r['คลังสินค้า'] || '', zone: r['Zone ID'] || '',
        locs: new Set(), locIds: new Set(), skus: new Set(),
        totalQty: 0, maxDays: 0, rows: []
      };
    }
    const d = +r['วันค้างส่ง'] || 0;
    if (d > impByDoc[key].maxDays) impByDoc[key].maxDays = d;
    if (r['Location']) impByDoc[key].locs.add(r['Location']);
    if (r['Location ID']) r['Location ID'].split(',').forEach(s => { const t = s.trim(); if (t) impByDoc[key].locIds.add(t); });
    if (r['รหัสสินค้า']) impByDoc[key].skus.add(r['รหัสสินค้า']);
    impByDoc[key].totalQty += +(r['จำนวนขอโอน'] || 0);
    impByDoc[key].rows.push(r);
  });
  window._todoImpByDoc = impByDoc;

  // ── 2. DOMESTIC by-doc ──
  const domByDoc = {};
  dataIn.forEach(r => {
    const key = r['เลขที่เอกสาร POI'] || '(ไม่ระบุ)';
    const abr = r['ชื่อย่อสาขา'] || '';
    if (!domByDoc[key]) {
      domByDoc[key] = {
        docNo: key, branch: BR_ABR_MAP[abr] || abr,
        branchCode: r['รหัสสาขา'] || '', branchAbr: abr,
        zone: r['Zone Name'] || '', wh: getWH(r),
        maxDays: 0, onetimes: new Set(), vendors: new Set(), rows: []
      };
    }
    const d = +r['วันคงค้าง'] || 0;
    if (d > domByDoc[key].maxDays) domByDoc[key].maxDays = d;
    if (r['เลขที่ onetime'])   domByDoc[key].onetimes.add(r['เลขที่ onetime']);
    if (r['ชื่อผู้จำหน่าย']) domByDoc[key].vendors.add(r['ชื่อผู้จำหน่าย']);
    domByDoc[key].rows.push(r);
  });
  window._todoDomByDoc = domByDoc;

  // ── 3. Reverse map full→abr ──
  const fullToAbr = {};
  Object.entries(BR_ABR_MAP).forEach(([abr, full]) => { fullToAbr[full] = abr; });
  dataIn.forEach(r => {
    const abr = (r['ชื่อย่อสาขา'] || '').trim();
    if (!abr) return;
    const full = BR_ABR_MAP[abr] || abr;
    if (!fullToAbr[full]) fullToAbr[full] = abr;
  });

  // ── 4. Branch map ──
  const bmap = {};
  const getOrMake = (fullName, abrCode) => {
    const key = (fullName || abrCode || '(ไม่ระบุ)').trim();
    if (!bmap[key]) bmap[key] = {
      key, fullName: key, abrCode: abrCode || '', branchCode: '',
      impDocs: new Set(), domDocs: new Set(),
      impMaxDays: 0, domMaxDays: 0,
      whDocs: {}, whMaxDays: {},
      todayCarDetail: {}, tomorrowCarDetail: {}
    };
    if (abrCode && !bmap[key].abrCode) bmap[key].abrCode = abrCode;
    return bmap[key];
  };

  Object.values(impByDoc).forEach(doc => {
    const abr = doc.branchAbr || fullToAbr[doc.branch] || '';
    const b = getOrMake(doc.branch, abr);
    b.impDocs.add(doc.docNo);
    if (doc.maxDays > b.impMaxDays) b.impMaxDays = doc.maxDays;
    if (doc.branchCode && !b.branchCode) b.branchCode = doc.branchCode;
    if (abr && !b.abrCode) b.abrCode = abr;
    if (doc.wh) {
      b.whDocs[doc.wh] = (b.whDocs[doc.wh] || 0) + 1;
      b.whMaxDays[doc.wh] = Math.max(b.whMaxDays[doc.wh] || 0, doc.maxDays);
    }
  });
  Object.values(domByDoc).forEach(doc => {
    const abr = doc.branchAbr || fullToAbr[doc.branch] || '';
    const b = getOrMake(doc.branch, abr);
    b.domDocs.add(doc.docNo);
    if (doc.maxDays > b.domMaxDays) b.domMaxDays = doc.maxDays;
    if (doc.branchCode && !b.branchCode) b.branchCode = doc.branchCode;
    if (abr && !b.abrCode) b.abrCode = abr;
    if (doc.wh) {
      b.whDocs[doc.wh] = (b.whDocs[doc.wh] || 0) + 1;
      b.whMaxDays[doc.wh] = Math.max(b.whMaxDays[doc.wh] || 0, doc.maxDays);
    }
  });

  Object.values(bmap).forEach(b => {
    b.maxDays   = Math.max(b.impMaxDays, b.domMaxDays);
    b.totalDocs = b.impDocs.size + b.domDocs.size;
  });

  // ── 5. Car data per branch ──
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const allWhs   = [...new Set(dataCar.map(r => (r['port_id'] || '').trim()).filter(Boolean))].sort();

  const normLookup = {};
  Object.values(bmap).forEach(b => {
    if (b.fullName) normLookup[norm(b.fullName)] = b;
    if (b.abrCode)  normLookup[norm(b.abrCode)]  = b;
  });

  dataCar.forEach(r => {
    const d = parseCarDate(r['search_date']);
    if (!d) return;
    const isToday    = sameDate(d, today);
    const isTomorrow = sameDate(d, tomorrow);
    if (!isToday && !isTomorrow) return;
    const b  = normLookup[norm(r['source_name'])] || normLookup[norm(r['source_code'])];
    if (!b) return;
    const wh      = (r['port_id'] || '').trim();
    const arrived  = r['สถานะ T1'] === 'Checked';
    const departed = r['สถานะ T4'] === 'Checked';
    if (isToday) {
      if (!b.todayCarDetail[wh]) b.todayCarDetail[wh] = { total: 0, arrived: 0, departed: 0 };
      b.todayCarDetail[wh].total++;
      if (arrived)  b.todayCarDetail[wh].arrived++;
      if (departed) b.todayCarDetail[wh].departed++;
    }
    if (isTomorrow) {
      if (!b.tomorrowCarDetail[wh]) b.tomorrowCarDetail[wh] = { total: 0, arrived: 0, departed: 0 };
      b.tomorrowCarDetail[wh].total++;
      if (arrived)  b.tomorrowCarDetail[wh].arrived++;
      if (departed) b.tomorrowCarDetail[wh].departed++;
    }
  });

  Object.values(bmap).forEach(b => {
    b.todayTotal    = Object.values(b.todayCarDetail).reduce((s, d) => s + d.total, 0);
    b.tomorrowTotal = Object.values(b.tomorrowCarDetail).reduce((s, d) => s + d.total, 0);
  });

  // unique doc warehouses (for dynamic columns)
  const allDocWhs = [...new Set(
    Object.values(bmap).flatMap(b => Object.keys(b.whDocs))
  )].sort();

  window._todoOvMap = bmap;
  window._todoOvWhs = allWhs;

  // ── 6. Filter + sort ──
  let rows = Object.values(bmap).filter(r => r.key !== '(ไม่ระบุ)').sort((a, b) => b.maxDays - a.maxDays);
  if (fb) rows = rows.filter(r => norm(r.fullName) === norm(fb) || norm(r.abrCode) === norm(fb));
  if (fd1 > 0)        rows = rows.filter(r => r.maxDays >= fd1);
  if (fd2 < Infinity) rows = rows.filter(r => r.maxDays <= fd2);
  if (q)  rows = rows.filter(r => norm(r.fullName).includes(q) || norm(r.abrCode).includes(q));

  const cntEl = document.getElementById('todo-ov-cnt');
  if (cntEl) cntEl.textContent = `${rows.length} สาขา`;

  // ── 8. Render table ──
  const carCell = (bKey, day, carDetail, total) => {
    if (!dataCar.length) return `<span style="color:var(--muted);font-size:12px;">—</span>`;
    const bkE = esc(bKey).replace(/'/g, "\\'");
    const whRows = allWhs.map(wh => {
      const d = carDetail[wh] || { total: 0, arrived: 0, departed: 0 };
      const dimmed = d.total === 0 ? 'opacity:.45;' : '';
      return `<div style="display:flex;align-items:center;gap:4px;padding:1px 5px;border-radius:4px;background:rgba(14,165,233,.07);border:1px solid rgba(14,165,233,.2);margin-bottom:2px;${dimmed}">
        <span style="color:#0ea5e9;font-weight:700;font-size:10.5px;min-width:26px;">${esc(wh)}</span>
        <span style="color:var(--text);font-size:10.5px;font-weight:800;">รวม ${d.total}</span>
        <span style="color:var(--muted);font-size:9px;">|</span>
        <span style="font-size:10px;color:#16a34a;font-weight:600;">เข้า <b>${d.arrived}</b></span>
        <span style="font-size:10px;color:#f59e0b;font-weight:600;">ออก <b>${d.departed}</b></span>
      </div>`;
    }).join('');
    const clickable = total > 0;
    return `<div style="padding:2px 4px;border-radius:6px;${clickable ? 'cursor:pointer;' : ''}"
      ${clickable ? `onclick="openTodoBranchCars('${bkE}','${day}')" onmouseover="this.style.background='rgba(56,189,248,.07)'" onmouseout="this.style.background=''"` : ''}>
      ${whRows}
    </div>`;
  };

  const totalCols = 7 + allDocWhs.length;
  let html = `<div style="overflow:auto;max-height:calc(100vh - 220px);border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl mtbl-sm" style="width:100%;font-size:12px;">
      <thead><tr>
        <th style="width:30px;text-align:center;">#</th>
        <th style="min-width:150px;">สาขา</th>
        <th style="text-align:center;min-width:55px;">ชื่อย่อ</th>
        <th style="text-align:center;min-width:68px;">รหัส</th>
        <th style="text-align:center;min-width:70px;">ผู้โดยสาร</th>
        <th style="text-align:center;min-width:90px;">วันตกค้างสูงสุด</th>
        <th style="text-align:center;min-width:55px;">IMP</th>
        <th style="text-align:center;min-width:55px;">DOM</th>
        ${allDocWhs.map(wh => `<th style="text-align:center;min-width:80px;">${esc(wh)}</th>`).join('')}
        <th style="min-width:200px;">🚛 รถ OUTBOUND วันนี้</th>
        <th style="min-width:200px;">🚛 รถ OUTBOUND พรุ่งนี้</th>
      </tr></thead><tbody>`;

  if (!rows.length) {
    html += `<tr><td colspan="${totalCols + 4}" style="text-align:center;color:var(--muted);padding:28px;">ไม่มีข้อมูล</td></tr>`;
  } else {
    rows.forEach((r, i) => {
      const totalBadge = `<span style="display:inline-block;padding:4px 12px;border-radius:7px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.45);color:#7c3aed;font-size:14px;font-weight:800;cursor:pointer;"
        onclick="openTodoBranchDocs('${esc(r.key).replace(/'/g, "\\'")}')"
        onmouseover="this.style.background='rgba(124,58,237,.25)'" onmouseout="this.style.background='rgba(124,58,237,.15)'">${r.totalDocs}</span>`;

      const numCell = (n, color, onclick) => n > 0
        ? `<span style="font-size:13px;font-weight:800;color:${color};${onclick ? 'cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;' : ''}"
            ${onclick ? `onclick="${onclick}" onmouseover="this.style.opacity='.65'" onmouseout="this.style.opacity='1'"` : ''}>${n}</span>`
        : `<span style="color:var(--muted);font-size:12px;">—</span>`;

      const bk = esc(r.key).replace(/'/g, "\\'");
      const whCells = allDocWhs.map(wh => {
        const n   = r.whDocs[wh] || 0;
        const md  = r.whMaxDays[wh] || 0;
        const whEsc = esc(wh).replace(/'/g, "\\'");
        const cnt = numCell(n, '#0284c7', n > 0 ? `openTodoBranchFilter('${bk}','wh','${whEsc}')` : '');
        const dayBadge = n > 0 ? `<br><span style="font-size:10px;color:var(--muted);">⏱${md}วัน</span>` : '';
        return `<td style="text-align:center;">${cnt}${dayBadge}</td>`;
      }).join('');

      html += `<tr>
        <td style="text-align:center;color:var(--muted);font-size:12px;">${i + 1}</td>
        <td style="font-size:13px;font-weight:600;">${esc(r.fullName)}</td>
        <td style="text-align:center;font-size:12px;color:#0891b2;font-weight:700;">${esc(r.branchCode || '—')}</td>
        <td style="text-align:center;font-size:12px;color:#0ea5e9;font-weight:700;">${esc(r.abrCode || '—')}</td>
        <td style="text-align:center;">${totalBadge}</td>
        <td style="text-align:center;">${_dayBadgeTd(r.maxDays)}</td>
        <td style="text-align:center;">${numCell(r.impDocs.size, '#7c3aed', r.impDocs.size > 0 ? `openTodoBranchFilter('${bk}','imp')` : '')}${r.impDocs.size > 0 ? `<br><span style="font-size:10px;color:var(--muted);">⏱${r.impMaxDays}วัน</span>` : ''}</td>
        <td style="text-align:center;">${numCell(r.domDocs.size, '#16a34a', r.domDocs.size > 0 ? `openTodoBranchFilter('${bk}','dom')` : '')}${r.domDocs.size > 0 ? `<br><span style="font-size:10px;color:var(--muted);">⏱${r.domMaxDays}วัน</span>` : ''}</td>
        ${whCells}
        <td>${carCell(r.key, 'today',    r.todayCarDetail,    r.todayTotal)}</td>
        <td>${carCell(r.key, 'tomorrow', r.tomorrowCarDetail, r.tomorrowTotal)}</td>
      </tr>`;
    });
  }

  html += '</tbody></table></div>';
  document.getElementById('todo-ov-tbl').innerHTML = html;
}

// ── Inline: รายละเอียดเอกสารตกค้าง (IMPORTED + DOMESTIC) ──
function _renderTodoDocsSection() {
  const { fb, fd1, fd2, q } = _getTodoFilters();
  const norm = s => String(s || '').trim().toLowerCase();

  // ── IMPORTED ──
  let impRows = Object.values(window._todoImpByDoc || {}).sort((a, b) => b.maxDays - a.maxDays);
  if (fb) impRows = impRows.filter(r => norm(r.branch) === norm(fb));
  if (fd1 > 0)        impRows = impRows.filter(r => r.maxDays >= fd1);
  if (fd2 < Infinity) impRows = impRows.filter(r => r.maxDays <= fd2);
  if (q)  impRows = impRows.filter(r =>
    norm(r.docNo).includes(q) || norm(r.branch).includes(q));

  let impHtml = `<div style="font-size:12px;font-weight:700;color:#0ea5e9;margin-bottom:8px;padding:5px 10px;background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.2);border-radius:5px;display:flex;align-items:center;gap:6px;">
    🌏 IMPORTED — ${impRows.length} เอกสาร
  </div>`;

  if (impRows.length) {
    impHtml += `<div style="overflow:auto;max-height:400px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
      <table class="mtbl" style="width:100%;font-size:13px;">
        <thead><tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>เลขที่เอกสาร</th>
          <th>สาขา</th>
          <th style="text-align:center;">คลัง</th>
          <th style="text-align:center;">Zone</th>
          <th style="text-align:center;">Location</th>
          <th style="text-align:center;">SKU</th>
          <th style="text-align:center;">จำนวน</th>
          <th style="text-align:center;">วันค้างส่ง</th>
        </tr></thead><tbody>`;
    impRows.forEach((r, i) => {
      impHtml += `<tr style="cursor:pointer;"
        onclick="window._todoBackState=null; openTodoBranchImpDoc('${esc(r.docNo).replace(/'/g,"\\'")}'); document.getElementById('td-doc-modal').classList.add('show');"
        onmouseover="this.style.background='rgba(56,189,248,.08)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:12px;">${i + 1}</td>
        <td style="color:#0284c7;font-weight:700;font-size:13px;">${esc(r.docNo)}</td>
        <td style="font-size:13px;">${esc(r.branch)}</td>
        <td style="text-align:center;"><span style="background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.4);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#16a34a;">${esc(r.wh || '—')}</span></td>
        <td style="text-align:center;font-size:12px;color:var(--muted);">${esc(r.zone || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#7c3aed;">${r.locs.size}</td>
        <td style="text-align:center;font-weight:700;color:#0ea5e9;">${r.skus.size}</td>
        <td style="text-align:center;font-weight:700;color:#16a34a;">${fmtN(Math.round(r.totalQty))}</td>
        <td style="text-align:center;">${_dayBadgeTd(r.maxDays)}</td>
      </tr>`;
    });
    impHtml += `</tbody></table></div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:4px;padding-left:2px;">💡 คลิกที่แถวเพื่อดูรายละเอียดสินค้าในเอกสารนั้น</div>`;
  } else {
    impHtml += `<div style="text-align:center;color:var(--muted);padding:16px;font-size:13px;">ไม่มีข้อมูล</div>`;
  }
  document.getElementById('todo-ds-imp').innerHTML = impHtml;

  // ── DOMESTIC ──
  let domRows = Object.values(window._todoDomByDoc || {}).sort((a, b) => b.maxDays - a.maxDays);
  if (fb) domRows = domRows.filter(r => norm(r.branch) === norm(fb));
  if (fd1 > 0)        domRows = domRows.filter(r => r.maxDays >= fd1);
  if (fd2 < Infinity) domRows = domRows.filter(r => r.maxDays <= fd2);
  if (q)  domRows = domRows.filter(r =>
    norm(r.docNo).includes(q) || norm(r.branch).includes(q));

  let domHtml = `<div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:8px;padding:5px 10px;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.2);border-radius:5px;">
    📦 DOMESTIC — ${domRows.length} เอกสาร
  </div>`;

  if (domRows.length) {
    domHtml += `<div style="overflow:auto;max-height:400px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
      <table class="mtbl" style="width:100%;font-size:13px;">
        <thead><tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>เลขที่เอกสาร POI</th>
          <th>สาขา</th>
          <th style="text-align:center;">คลัง</th>
          <th style="text-align:center;">Zone</th>
          <th style="text-align:center;">Onetime</th>
          <th style="text-align:center;">วันคงค้าง</th>
        </tr></thead><tbody>`;
    domRows.forEach((r, i) => {
      domHtml += `<tr style="cursor:pointer;"
        onclick="window._todoBackState=null; openTodoBranchDomDoc('${esc(r.docNo).replace(/'/g,"\\'")}'); document.getElementById('td-doc-modal').classList.add('show');"
        onmouseover="this.style.background='rgba(56,189,248,.08)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:12px;">${i + 1}</td>
        <td style="color:#0284c7;font-weight:700;font-size:13px;">${esc(r.docNo)}</td>
        <td style="font-size:13px;">${esc(r.branch)}</td>
        <td style="text-align:center;"><span style="background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.4);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#16a34a;">${esc(r.wh || '—')}</span></td>
        <td style="text-align:center;font-size:12px;color:var(--muted);">${esc(r.zone || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#d97706;">${r.onetimes.size}</td>
        <td style="text-align:center;">${_dayBadgeTd(r.maxDays)}</td>
      </tr>`;
    });
    domHtml += `</tbody></table></div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:4px;padding-left:2px;">💡 คลิกที่แถวเพื่อดูรายละเอียด Onetime ในเอกสารนั้น</div>`;
  } else {
    domHtml += `<div style="text-align:center;color:var(--muted);padding:16px;font-size:13px;">ไม่มีข้อมูล</div>`;
  }
  document.getElementById('todo-ds-dom').innerHTML = domHtml;

  const total = impRows.length + domRows.length;
  const cntEl = document.getElementById('todo-ds-cnt');
  if (cntEl) cntEl.textContent = `${fmtN(total)} เอกสาร`;
}

// ── Popup: เอกสารตกค้างของสาขา ──
function openTodoBranchDocs(bKey) {
  const b = (window._todoOvMap || {})[bKey];
  if (!b) return;
  window._todoBackState = { type: 'docs', bKey };

  document.getElementById('td-doc-title').innerHTML = `📋 เอกสารตกค้าง — ${esc(b.fullName)}`;
  document.getElementById('td-doc-sub').textContent =
    `IMPORTED: ${b.impDocs.size} เอกสาร  ·  DOMESTIC: ${b.domDocs.size} เอกสาร  ·  วันคงค้างสูงสุด ${b.maxDays} วัน`;

  let html = '';

  // IMPORTED section
  const impRows = Object.values(window._todoImpByDoc || {})
    .filter(d => d.branch === b.fullName).sort((a, c) => c.maxDays - a.maxDays);

  if (impRows.length) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:#7dd3fc;margin-bottom:8px;padding:5px 10px;background:rgba(0,184,217,.08);border:1px solid rgba(0,184,217,.15);border-radius:5px;">
        🌏 IMPORTED — ${impRows.length} เอกสาร
      </div>
      <div style="overflow:auto;max-height:260px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
        <table class="mtbl" style="width:100%;font-size:12px;">
          <thead><tr>
            <th style="width:30px;text-align:center;">#</th>
            <th>เลขที่เอกสาร</th><th>คลัง</th><th>Zone</th>
            <th style="text-align:center;">Location</th>
            <th style="text-align:center;">SKU</th>
            <th style="text-align:center;">จำนวน</th>
            <th style="text-align:center;">วันค้างส่ง</th>
          </tr></thead><tbody>`;
    impRows.forEach((d, i) => {
      html += `<tr style="cursor:pointer;" onclick="openTodoBranchImpDoc('${esc(d.docNo).replace(/'/g,"\\'")}') " onmouseover="this.style.background='rgba(56,189,248,.09)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td style="color:#38bdf8;font-weight:700;">${esc(d.docNo)}</td>
        <td><span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;color:#4ade80;">${esc(d.wh || '—')}</span></td>
        <td style="font-size:11px;color:var(--muted);">${esc(d.zone || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#c4b5fd;">${d.locs.size}</td>
        <td style="text-align:center;font-weight:700;color:#7dd3fc;">${d.skus.size}</td>
        <td style="text-align:center;font-weight:700;color:#4ade80;">${fmtN(Math.round(d.totalQty))}</td>
        <td style="text-align:center;">${_dayBadgeTd(d.maxDays)}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    html += `<div style="font-size:10.5px;color:var(--muted);margin-top:4px;padding-left:2px;">💡 คลิกที่แถวเพื่อดูรายละเอียดสินค้า</div>`;
    html += '</div>';
  }

  // DOMESTIC section
  const domRows = Object.values(window._todoDomByDoc || {})
    .filter(d => d.branch === b.fullName).sort((a, c) => c.maxDays - a.maxDays);

  if (domRows.length) {
    html += `<div>
      <div style="font-size:12px;font-weight:700;color:#4ade80;margin-bottom:8px;padding:5px 10px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15);border-radius:5px;">
        📦 DOMESTIC — ${domRows.length} เอกสาร
      </div>
      <div style="overflow:auto;max-height:260px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
        <table class="mtbl" style="width:100%;font-size:12px;">
          <thead><tr>
            <th style="width:30px;text-align:center;">#</th>
            <th>เลขที่เอกสาร POI</th><th>คลัง</th><th>Zone</th>
            <th style="text-align:center;">Onetime</th>
            <th style="text-align:center;">วันคงค้าง</th>
          </tr></thead><tbody>`;
    domRows.forEach((d, i) => {
      html += `<tr style="cursor:pointer;" onclick="openTodoBranchDomDoc('${esc(d.docNo).replace(/'/g,"\\'")}') " onmouseover="this.style.background='rgba(56,189,248,.09)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td style="color:#38bdf8;font-weight:700;">${esc(d.docNo)}</td>
        <td><span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;color:#4ade80;">${esc(d.wh || '—')}</span></td>
        <td style="font-size:11px;color:var(--muted);">${esc(d.zone || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#fda92d;">${d.onetimes.size}</td>
        <td style="text-align:center;">${_dayBadgeTd(d.maxDays)}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    html += `<div style="font-size:10.5px;color:var(--muted);margin-top:4px;padding-left:2px;">💡 คลิกที่แถวเพื่อดูรายละเอียด Onetime</div>`;
    html += '</div>';
  }

  if (!impRows.length && !domRows.length) {
    html = `<div style="text-align:center;color:var(--muted);padding:32px;">ไม่มีข้อมูลเอกสาร</div>`;
  }

  document.getElementById('td-doc-content').innerHTML = html;
  document.getElementById('td-doc-modal').classList.add('show');
}

// ── Back button helper ──
function _backBtn() {
  const s = window._todoBackState;
  if (!s) return '';
  let call;
  if (s.type === 'filter') {
    const bkE = s.bKey.replace(/'/g, "\\'");
    const ftE = s.ft.replace(/'/g, "\\'");
    call = s.fv
      ? `openTodoBranchFilter('${bkE}','${ftE}','${s.fv.replace(/'/g, "\\'")}')`
      : `openTodoBranchFilter('${bkE}','${ftE}')`;
  } else {
    call = `openTodoBranchDocs('${s.bKey.replace(/'/g, "\\'")}')`;
  }
  const label = s.type === 'filter'
    ? (s.ft === 'imp' ? '← กลับรายการ IMPORTED' : s.ft === 'dom' ? '← กลับรายการ DOMESTIC' : `← กลับรายการ ${s.fv || ''}`)
    : '← กลับรายการเอกสาร';
  return `<button onclick="${call}"
    style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:6px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);color:#0ea5e9;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:12px;font-family:inherit;">
    ${label}
  </button>`;
}

// ── Drill-down: IMPORTED doc → product list ──
function openTodoBranchImpDoc(docNo) {
  const doc = (window._todoImpByDoc || {})[docNo];
  if (!doc) return;

  document.getElementById('td-doc-title').innerHTML = `🌏 ${esc(docNo)}`;
  document.getElementById('td-doc-sub').textContent =
    `${doc.branch}  ·  ${doc.wh}  ·  Zone ${doc.zone}  ·  วันค้างสูงสุด ${doc.maxDays} วัน`;

  const rows = doc.rows.slice().sort((a, b) => {
    const la = a['Location'] || '', lb = b['Location'] || '';
    return la < lb ? -1 : la > lb ? 1 : 0;
  });

  let html = _backBtn();
  html += `<div class="modal-sum">
    <div class="modal-sum-item"><b>${fmtN(rows.length)}</b> รายการสินค้า</div>
    <div class="modal-sum-item"><b>${fmtN(doc.skus.size)}</b> SKU</div>
    <div class="modal-sum-item"><b>${fmtN(Math.round(doc.totalQty))}</b> จำนวนรวม</div>
    <div class="modal-sum-item"><b>${fmtN(doc.locs.size)}</b> Location</div>
  </div>`;

  html += `<div style="overflow:auto;max-height:480px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
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
      <td style="text-align:center;font-size:14px;font-weight:800;color:var(--text);white-space:nowrap;">${fmtN(+(r['จำนวนขอโอน'] || 0))}</td>
      <td style="text-align:center;color:var(--muted);font-size:12px;white-space:nowrap;">${esc(r['หน่วยนับ'] || '')}</td>
      <td style="white-space:nowrap;"><span class="spill ${statusCls(r['สถานะประมวลผล'] || '')}">${esc(r['สถานะประมวลผล'] || '—')}</span></td>
      <td style="text-align:center;white-space:nowrap;">${_dayBadgeTd(r['วันค้างส่ง'])}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('td-doc-content').innerHTML = html;
}

// ── Drill-down: DOMESTIC doc → onetime list ──
function openTodoBranchDomDoc(docNo) {
  const doc = (window._todoDomByDoc || {})[docNo];
  if (!doc) return;

  document.getElementById('td-doc-title').innerHTML = `📦 ${esc(docNo)}`;
  document.getElementById('td-doc-sub').textContent =
    `${doc.branch}  ·  ${doc.wh}  ·  Zone ${doc.zone}  ·  วันคงค้างสูงสุด ${doc.maxDays} วัน`;

  const rows = doc.rows.slice().sort((a, b) => (+b['วันคงค้าง'] || 0) - (+a['วันคงค้าง'] || 0));

  let html = _backBtn();
  html += `<div class="modal-sum">
    <div class="modal-sum-item"><b>${fmtN(rows.length)}</b> รายการ</div>
    <div class="modal-sum-item"><b>${fmtN(doc.onetimes.size)}</b> Onetime</div>
  </div>`;

  html += `<div style="overflow:auto;max-height:480px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl" style="width:100%;min-width:600px;font-size:13px;">
      <thead><tr>
        <th style="width:36px;text-align:center;white-space:nowrap;">#</th>
        <th style="white-space:nowrap;min-width:150px;">เลขที่ Onetime</th>
        <th style="white-space:nowrap;min-width:190px;">บาร์โค้ดพาเลท</th>
        <th style="white-space:nowrap;min-width:110px;">วันที่ Onetime</th>
        <th style="white-space:nowrap;min-width:60px;">หน่วย</th>
        <th style="text-align:center;white-space:nowrap;min-width:90px;">วันคงค้าง</th>
      </tr></thead><tbody>`;

  rows.forEach((r, i) => {
    html += `<tr>
      <td style="text-align:center;color:var(--muted);font-size:12px;">${i + 1}</td>
      <td style="font-family:monospace;font-size:12px;font-weight:700;color:#93c5fd;white-space:nowrap;">${esc(r['เลขที่ onetime'] || '—')}</td>
      <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${esc(r['บาร์โค้ดพาเลท'] || '—')}</td>
      <td style="font-size:12px;white-space:nowrap;">${esc(r['วันที่ onetime'] || '—')}</td>
      <td style="text-align:center;color:var(--muted);font-size:12px;white-space:nowrap;">${esc(r['หน่วยนับ'] || '—')}</td>
      <td style="text-align:center;white-space:nowrap;">${_dayBadgeTd(r['วันคงค้าง'])}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('td-doc-content').innerHTML = html;
}

// ── Popup: คิวรถ OUTBOUND ──
function openTodoBranchCars(bKey, day) {
  const b = (window._todoOvMap || {})[bKey];
  if (!b) return;

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tgt      = day === 'today' ? today : tomorrow;
  const dayLabel = day === 'today' ? 'วันนี้' : 'พรุ่งนี้';
  const norm     = s => String(s || '').trim().toLowerCase();

  const cars = dataCar.filter(r => {
    const d = parseCarDate(r['search_date']);
    if (!d || !sameDate(d, tgt)) return false;
    return (b.fullName && norm(r['source_name']) === norm(b.fullName)) ||
           (b.abrCode  && norm(r['source_code'])  === norm(b.abrCode));
  }).sort((a, c) => timeSlotStart(a['zone_time'] || '') - timeSlotStart(c['zone_time'] || ''));

  document.getElementById('td-doc-title').innerHTML = `🚛 รถ OUTBOUND ${dayLabel} — ${esc(b.fullName)}`;
  document.getElementById('td-doc-sub').textContent = `${cars.length} คัน`;

  const T_STEPS = [
    { key: 'T1', statusField: 'สถานะ T1', timeField: 'เวลาเข้า T1', label: 'เข้า DC' },
    { key: 'T2', statusField: 'สถานะ T2', timeField: 'เวลา T2',     label: 'ขึ้นสินค้า' },
    { key: 'T3', statusField: 'สถานะ T3', timeField: 'เวลา T3',     label: 'โหลดเสร็จ' },
    { key: 'T4', statusField: 'สถานะ T4', timeField: 'เวลา T4',     label: 'ออก DC' },
  ];
  const tStatusHtml = r => T_STEPS.map((step, idx) => {
    const checked = r[step.statusField] === 'Checked';
    const raw     = (r[step.timeField] || '').trim();
    const timeStr = raw.replace(/^\d{4}-\d{2}-\d{2}\s*/, '').replace(/:\d{2}$/, '');
    const sep     = idx < T_STEPS.length - 1
      ? `<span style="color:#9db5cc;font-size:9px;padding:0 1px;">→</span>` : '';
    if (checked) {
      return `<span style="display:inline-flex;flex-direction:column;align-items:center;padding:2px 7px;border-radius:6px;background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.35);">
        <span style="font-size:9px;font-weight:800;color:#16a34a;">✓ ${step.key}</span>
        <span style="font-size:9px;color:#4ade80;white-space:nowrap;font-weight:600;">${timeStr || '—'}</span>
      </span>${sep}`;
    }
    return `<span style="display:inline-flex;flex-direction:column;align-items:center;padding:2px 7px;border-radius:6px;background:rgba(145,158,171,.08);border:1px solid rgba(145,158,171,.18);">
      <span style="font-size:9px;color:var(--muted);">${step.key}</span>
      <span style="font-size:9px;color:var(--subtle);">—</span>
    </span>${sep}`;
  }).join('');

  const STATUS_STYLE = {
    'มาก่อนเวลา':    'background:rgba(22,163,74,.12);color:#16a34a;border:1px solid rgba(22,163,74,.3);',
    'มาหลังเวลานัด': 'background:rgba(239,68,68,.12);color:#dc2626;border:1px solid rgba(239,68,68,.3);',
    'ยกเลิกรับงาน':  'background:rgba(239,68,68,.12);color:#dc2626;border:1px solid rgba(239,68,68,.3);',
    'ยังไม่มาลงคิว': 'background:rgba(245,158,11,.12);color:#d97706;border:1px solid rgba(245,158,11,.3);',
  };

  let html = `<div style="overflow:auto;max-height:540px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
    <table class="mtbl" style="width:100%;min-width:800px;font-size:12px;">
      <thead><tr>
        <th style="width:30px;text-align:center;">#</th>
        <th style="white-space:nowrap;">เวลา</th>
        <th style="white-space:nowrap;">คลัง</th>
        <th style="white-space:nowrap;">ประเภทรถ</th>
        <th style="white-space:nowrap;">ประเภทงาน</th>
        <th style="white-space:nowrap;">ทะเบียนรถ</th>
        <th style="white-space:nowrap;">ชื่อคนขับ</th>
        <th style="white-space:nowrap;">เบอร์ติดต่อ</th>
        <th style="white-space:nowrap;min-width:240px;">สถานะ T1 → T4</th>
      </tr></thead><tbody>`;

  if (!cars.length) {
    html += `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:28px;">ไม่มีรถเข้า${dayLabel}</td></tr>`;
  } else {
    cars.forEach((r, i) => {
      const status  = r['สถานะลงคิว'] || '';
      const sSt     = STATUS_STYLE[status] || 'background:rgba(0,184,217,.1);color:#0891b2;border:1px solid rgba(0,184,217,.25);';
      const stBadge = status
        ? `<span style="padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap;${sSt}">${esc(status)}</span>`
        : '';
      html += `<tr>
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td style="font-weight:700;color:#0284c7;white-space:nowrap;">${esc(r['zone_time'] || '—')}</td>
        <td><span style="background:rgba(2,132,199,.1);border:1px solid rgba(2,132,199,.25);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#0284c7;">${esc(r['port_id'] || '—')}</span></td>
        <td style="font-size:12px;color:var(--text);">${esc(r['truck_info'] || '—')}</td>
        <td>${r['rc_type_product'] ? `<span style="background:rgba(253,169,45,.12);border:1px solid rgba(253,169,45,.3);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#b45309;">${esc(r['rc_type_product'])}</span>` : '—'}</td>
        <td style="font-family:monospace;font-size:12px;font-weight:800;color:var(--text);white-space:nowrap;">${esc(r['truck_registration'] || '—')}</td>
        <td style="font-size:12px;color:var(--text);">${esc(r['driver_name'] || '—')}</td>
        <td style="font-size:12px;color:#0891b2;font-family:monospace;white-space:nowrap;">${esc(r['driver_tel'] || '—')}</td>
        <td><div style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;">
          ${tStatusHtml(r)}
          ${stBadge ? `<div style="margin-top:2px;width:100%;">${stBadge}</div>` : ''}
        </div></td>
      </tr>`;
    });
  }

  html += '</tbody></table></div>';
  document.getElementById('td-doc-content').innerHTML = html;
  document.getElementById('td-doc-modal').classList.add('show');
}

// ── Popup: filter by IMP / DOM / WH ──
function openTodoBranchFilter(bKey, filterType, filterVal) {
  const b = (window._todoOvMap || {})[bKey];
  if (!b) return;
  window._todoBackState = { type: 'filter', bKey, ft: filterType, fv: filterVal || null };

  const impAll = Object.values(window._todoImpByDoc || {}).filter(d => d.branch === b.fullName);
  const domAll = Object.values(window._todoDomByDoc || {}).filter(d => d.branch === b.fullName);

  let impRows = [], domRows = [];
  if (filterType === 'imp') {
    impRows = impAll.sort((a, c) => c.maxDays - a.maxDays);
  } else if (filterType === 'dom') {
    domRows = domAll.sort((a, c) => c.maxDays - a.maxDays);
  } else if (filterType === 'wh') {
    impRows = impAll.filter(d => d.wh === filterVal).sort((a, c) => c.maxDays - a.maxDays);
    domRows = domAll.filter(d => d.wh === filterVal).sort((a, c) => c.maxDays - a.maxDays);
  }

  const total = impRows.length + domRows.length;
  const allDays = [...impRows, ...domRows].map(d => d.maxDays);
  const maxD = allDays.length ? Math.max(...allDays) : 0;

  const titleMap = {
    imp: `🌏 IMPORTED — ${esc(b.fullName)}`,
    dom: `📦 DOMESTIC — ${esc(b.fullName)}`,
    wh:  `🏭 ${esc(filterVal)} — ${esc(b.fullName)}`
  };
  document.getElementById('td-doc-title').innerHTML = titleMap[filterType];
  document.getElementById('td-doc-sub').textContent = filterType === 'wh'
    ? `${total} เอกสาร  ·  IMP:${impRows.length}  ·  DOM:${domRows.length}  ·  วันคงค้างสูงสุด ${maxD} วัน`
    : `${total} เอกสาร  ·  วันคงค้างสูงสุด ${maxD} วัน`;

  let html = _backBtn();

  if (impRows.length) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:#0ea5e9;margin-bottom:8px;padding:5px 10px;background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.2);border-radius:5px;">
        🌏 IMPORTED — ${impRows.length} เอกสาร
      </div>
      <div style="overflow:auto;max-height:260px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
        <table class="mtbl" style="width:100%;font-size:12px;">
          <thead><tr>
            <th style="width:30px;text-align:center;">#</th>
            <th>เลขที่เอกสาร</th><th>คลัง</th><th>Zone</th>
            <th style="text-align:center;">Location</th><th style="text-align:center;">SKU</th>
            <th style="text-align:center;">จำนวน</th><th style="text-align:center;">วันค้างส่ง</th>
          </tr></thead><tbody>`;
    impRows.forEach((d, i) => {
      html += `<tr style="cursor:pointer;" onclick="openTodoBranchImpDoc('${esc(d.docNo).replace(/'/g,"\\'")}') " onmouseover="this.style.background='rgba(56,189,248,.09)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td style="color:#38bdf8;font-weight:700;">${esc(d.docNo)}</td>
        <td><span style="background:rgba(22,163,74,.1);border:1px solid rgba(22,163,74,.35);padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;color:#16a34a;">${esc(d.wh || '—')}</span></td>
        <td style="font-size:11px;color:var(--muted);">${esc(d.zone || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#7c3aed;">${d.locs.size}</td>
        <td style="text-align:center;font-weight:700;color:#0ea5e9;">${d.skus.size}</td>
        <td style="text-align:center;font-weight:700;color:#16a34a;">${fmtN(Math.round(d.totalQty))}</td>
        <td style="text-align:center;">${_dayBadgeTd(d.maxDays)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:4px;padding-left:2px;">💡 คลิกที่แถวเพื่อดูรายละเอียดสินค้า</div></div>`;
  }

  if (domRows.length) {
    html += `<div>
      <div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:8px;padding:5px 10px;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.2);border-radius:5px;">
        📦 DOMESTIC — ${domRows.length} เอกสาร
      </div>
      <div style="overflow:auto;max-height:260px;border-radius:6px;border:1px solid rgba(56,189,248,.1);">
        <table class="mtbl" style="width:100%;font-size:12px;">
          <thead><tr>
            <th style="width:30px;text-align:center;">#</th>
            <th>เลขที่เอกสาร POI</th><th>คลัง</th><th>Zone</th>
            <th style="text-align:center;">Onetime</th><th style="text-align:center;">วันคงค้าง</th>
          </tr></thead><tbody>`;
    domRows.forEach((d, i) => {
      html += `<tr style="cursor:pointer;" onclick="openTodoBranchDomDoc('${esc(d.docNo).replace(/'/g,"\\'")}') " onmouseover="this.style.background='rgba(56,189,248,.09)'" onmouseout="this.style.background=''">
        <td style="text-align:center;color:var(--muted);font-size:11px;">${i + 1}</td>
        <td style="color:#38bdf8;font-weight:700;">${esc(d.docNo)}</td>
        <td><span style="background:rgba(22,163,74,.1);border:1px solid rgba(22,163,74,.35);padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;color:#16a34a;">${esc(d.wh || '—')}</span></td>
        <td style="font-size:11px;color:var(--muted);">${esc(d.zone || '—')}</td>
        <td style="text-align:center;font-weight:700;color:#d97706;">${d.onetimes.size}</td>
        <td style="text-align:center;">${_dayBadgeTd(d.maxDays)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:4px;padding-left:2px;">💡 คลิกที่แถวเพื่อดูรายละเอียด Onetime</div></div>`;
  }

  if (!total) {
    html += `<div style="text-align:center;color:var(--muted);padding:32px;">ไม่มีข้อมูล</div>`;
  }

  document.getElementById('td-doc-content').innerHTML = html;
  document.getElementById('td-doc-modal').classList.add('show');
}

// ── Modal close ──
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
