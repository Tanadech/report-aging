// ============ tabs/pay.js — เอกสารจ่าย OUTBOUND Tab ============

const PAY_PAGE_SIZE = 100;
let payFiltered = [], payPage = 0;

// ── Helpers ──
function _fmtPayDate(v) {
  if (!v && v !== 0) return '';
  const n = parseFloat(v);
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400000);
    const dd = d.getUTCDate().toString().padStart(2, '0');
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear() + 543}`;
  }
  if (typeof v === 'string' && v.includes('/')) return v;
  return String(v || '');
}

// ── Filter ──
function getPayFiltered() {
  const fbCB    = checkedVals(document.getElementById('p-fb-list'));
  const ftCB    = checkedVals(document.getElementById('p-ft-list'));
  const fcCB    = checkedVals(document.getElementById('p-fc-list'));
  const fsearch = (document.getElementById('p-fsearch').value || '').trim().toLowerCase();

  return dataAgingOut.filter(r => {
    if (fbCB.length && !fbCB.includes(r['ชื่อสาขา'])) return false;
    if (ftCB.length && !ftCB.includes(r['ประเภท'])) return false;
    if (fcCB.length && !fcCB.includes(r['Category Name'])) return false;
    if (fsearch) {
      const docNo = (r['เลขที่เอกสาร'] || '').toLowerCase();
      const poiNo = (r['เลขที่ขอโอน'] || '').toLowerCase();
      const brNm  = (r['ชื่อสาขา'] || '').toLowerCase();
      if (!docNo.includes(fsearch) && !poiNo.includes(fsearch) && !brNm.includes(fsearch)) return false;
    }
    return true;
  });
}

// ── Render all ──
function renderPay() {
  const kpiEl = document.getElementById('pay-kpi');
  if (!dataAgingOut.length) {
    kpiEl.innerHTML = '<div style="padding:50px;text-align:center;color:var(--muted);font-size:13px;">📂 กรุณาโหลดไฟล์ <strong>📤 AGING OUT</strong> ก่อนใช้งาน Tab นี้</div>';
    document.getElementById('p-tbl').innerHTML = '';
    return;
  }

  payFiltered = getPayFiltered();
  payPage = 0;

  // ── KPI ──
  const docs      = uniqCount(payFiltered, 'เลขที่เอกสาร');
  const pois      = uniqCount(payFiltered, 'เลขที่ขอโอน');
  const branches  = uniqCount(payFiltered, 'ชื่อสาขา');
  const cats      = uniqCount(payFiltered, 'Category Name');
  const totalBox  = payFiltered.reduce((s, r) => s + num(r['จำนวน(กล่อง)']), 0);
  const totalPcs  = payFiltered.reduce((s, r) => s + num(r['จำนวนโอน(ชิ้น)']), 0);

  // เชื่อมกับ IMPORTED หา POI ที่ยังค้าง
  const allPaidPOIs = new Set(dataAgingOut.map(r => r['เลขที่ขอโอน']).filter(Boolean));
  const hasImported = dataUot.length > 0;
  const remainPOIs  = hasImported
    ? [...new Set(dataUot.map(r => r['เลขที่เอกสารขอโอน']).filter(Boolean))].filter(p => !allPaidPOIs.has(p))
    : [];

  kpiEl.innerHTML = `
    <stat-card label="เอกสาร OUTBOUND" value="${fmtN(docs)}" unit="เลขที่เอกสาร"></stat-card>
    <stat-card label="เลขที่ขอโอน จ่ายแล้ว" value="${fmtN(pois)}" unit="เอกสาร POI" variant="ok"></stat-card>
    <stat-card label="รายการสินค้า" value="${fmtN(payFiltered.length)}" unit="รายการ"></stat-card>
    <stat-card label="จำนวนกล่องรวม" value="${fmtN(totalBox)}" unit="กล่อง"></stat-card>
    <stat-card label="จำนวนชิ้นรวม" value="${fmtN(totalPcs)}" unit="ชิ้น"></stat-card>
    <stat-card label="สาขา" value="${fmtN(branches)}" unit="สาขา" variant="inf"></stat-card>
    <stat-card label="Category" value="${fmtN(cats)}" unit="หมวด"></stat-card>
    ${hasImported ? `<stat-card label="POI ยังค้างจ่าย" value="${fmtN(remainPOIs.length)}" unit="เอกสาร POI" variant="${remainPOIs.length > 0 ? 'alr' : 'ok'}"></stat-card>` : ''}
  `;

  // ── Chart 1: ประเภท doughnut ──
  const byType  = groupBy(payFiltered, 'ประเภท');
  const typeEnt = Object.entries(byType).map(([k, v]) => [k || '(ไม่ระบุ)', uniqCount(v, 'เลขที่เอกสาร')]).sort((a, b) => b[1] - a[1]);
  mkChart('p-pie1', 'doughnut', {
    labels: typeEnt.map(e => e[0]),
    datasets: [{ data: typeEnt.map(e => e[1]), backgroundColor: PALETTE, borderWidth: 2, borderColor: 'rgba(6,16,30,.8)', hoverOffset: 6 }]
  }, {
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } },
      datalabels: { color: '#fff', font: { size: 11, weight: 'bold' }, formatter: (v, ctx) => typeEnt[ctx.dataIndex][0] + '\n' + fmtN(v), anchor: 'center', align: 'center', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
    }, cutout: '50%'
  });

  // ── Chart 2: จ่ายแล้ว vs ยังค้าง (ถ้ามี IMPORTED) ──
  const pie2Card = document.getElementById('p-pie2-wrap');
  if (hasImported) {
    pie2Card.style.display = '';
    mkChart('p-pie2', 'doughnut', {
      labels: ['จ่ายแล้ว', 'ยังค้างจ่าย'],
      datasets: [{ data: [allPaidPOIs.size, remainPOIs.length], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 2, borderColor: 'rgba(6,16,30,.8)', hoverOffset: 6 }]
    }, {
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } },
        datalabels: { color: '#fff', font: { size: 11, weight: 'bold' }, formatter: v => fmtN(v), anchor: 'center', align: 'center', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
      }, cutout: '50%'
    });
  } else {
    pie2Card.style.display = 'none';
  }

  // ── Chart 3: Top 8 สาขา (by กล่อง) ──
  const brData = Object.entries(groupBy(payFiltered, 'ชื่อสาขา'))
    .map(([k, v]) => ({ name: (k || '').replace(/^สาขา\s*/, ''), box: v.reduce((s, r) => s + num(r['จำนวน(กล่อง)']), 0), docs: uniqCount(v, 'เลขที่เอกสาร') }))
    .sort((a, b) => b.box - a.box).slice(0, 8);
  mkChart('p-c1', 'bar', {
    labels: brData.map(d => d.name),
    datasets: [
      { label: 'จำนวนกล่อง', data: brData.map(d => d.box), backgroundColor: '#22d3ee', borderRadius: 3 },
      { label: 'จำนวนเอกสาร', data: brData.map(d => d.docs), backgroundColor: '#a78bfa', borderRadius: 3 }
    ]
  }, {
    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } }, datalabels: { anchor: 'end', align: 'top', font: { size: 9, weight: 'bold' }, formatter: v => v > 0 ? fmtN(v) : '', color: '#e2e8f0' } },
    scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } }, x: { ticks: { font: { size: 9 }, maxRotation: 45 } } }
  });

  // ── Chart 4: By Category ──
  const catData = Object.entries(groupBy(payFiltered, 'Category Name'))
    .map(([k, v]) => ({ name: (k || 'ไม่ระบุ'), box: v.reduce((s, r) => s + num(r['จำนวน(กล่อง)']), 0) }))
    .sort((a, b) => b.box - a.box).slice(0, 12);
  const catEl = document.getElementById('p-c2');
  catEl.style.width = Math.max(600, catData.length * 65) + 'px';
  mkChart('p-c2', 'bar', {
    labels: catData.map(d => d.name),
    datasets: [{ label: 'จำนวนกล่อง', data: catData.map(d => d.box), backgroundColor: catData.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 3, borderWidth: 0 }]
  }, {
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', font: { size: 9, weight: 'bold' }, formatter: v => v > 0 ? fmtN(v) : '', color: '#e2e8f0' } },
    scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } }, x: { ticks: { font: { size: 9 }, maxRotation: 55 } } }
  });

  renderPayTable();
  renderPayTags();
}

// ── Table ──
function renderPayTable() {
  const pg = payPage;
  const sorted = [...payFiltered].sort((a, b) => {
    const da = parseFloat(a['วันที่']) || 0, db = parseFloat(b['วันที่']) || 0;
    if (db !== da) return db - da;
    return (a['เลขที่เอกสาร'] || '').localeCompare(b['เลขที่เอกสาร'] || '');
  });

  const total = sorted.length, pages = Math.ceil(total / PAY_PAGE_SIZE) || 1;
  const slice = sorted.slice(pg * PAY_PAGE_SIZE, (pg + 1) * PAY_PAGE_SIZE);

  document.getElementById('p-cnt').textContent      = `(${fmtN(total)} รายการ)`;
  document.getElementById('p-pg-info').textContent  = `หน้า ${pg + 1}/${pages}`;
  document.getElementById('p-prev').disabled        = pg === 0;
  document.getElementById('p-next').disabled        = pg >= pages - 1;

  let html = `<table class="gtbl"><thead><tr>
    <th>วันที่</th><th>เลขที่เอกสาร</th><th>สาขา</th>
    <th>เลขที่ขอโอน</th><th>เลขที่โอนออก</th>
    <th>รหัสสินค้า</th><th>ชื่อสินค้า</th>
    <th>กล่อง</th><th>ชิ้น</th><th>Category</th><th>ประเภท</th>
  </tr></thead><tbody>`;

  slice.forEach(r => {
    const brName = (r['ชื่อสาขา'] || '').replace(/^สาขา\s*/, '');
    html += `<tr>
      <td style="white-space:nowrap;font-size:11px;font-variant-numeric:tabular-nums;">${esc(_fmtPayDate(r['วันที่']))}</td>
      <td><span class="mdoc">${esc(r['เลขที่เอกสาร'] || '')}</span></td>
      <td style="font-size:11px;">${esc(brName)}</td>
      <td style="font-size:10.5px;color:#a5b4fc;">${esc(r['เลขที่ขอโอน'] || '')}</td>
      <td style="font-size:10.5px;color:#6ee7b7;">${esc(r['เลขที่โอนออก'] || '')}</td>
      <td style="font-size:10.5px;">${esc(r['รหัสสินค้า'] || '')}</td>
      <td style="font-size:10.5px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(r['ชื่อสินค้า'] || '')}">${esc(r['ชื่อสินค้า'] || '')}</td>
      <td style="text-align:right;">${fmtN(num(r['จำนวน(กล่อง)']))}</td>
      <td style="text-align:right;">${fmtN(num(r['จำนวนโอน(ชิ้น)']))}</td>
      <td style="font-size:10px;">${esc(r['Category Name'] || '')}</td>
      <td><span class="pay-type ${(r['ประเภท'] || '').toLowerCase()}">${esc(r['ประเภท'] || '')}</span></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('p-tbl').innerHTML = html;
}

// ── Filter Tags ──
function renderPayTags() {
  const container = document.getElementById('pay-tags');
  if (!container) return;
  const tags = [];

  const fbEl = document.getElementById('p-fb-list');
  const { chk: chkFb, isFiltered: fbActive } = getCBState(fbEl);
  if (fbActive) {
    if (chkFb.length === 0) tags.push({ label: 'สาขา', value: '(ไม่มีที่เลือก)', remove: () => { checkAllCB(fbEl); renderPay(); } });
    else chkFb.forEach(v => tags.push({ label: 'สาขา', value: v.replace(/^สาขา\s*/, ''), remove: () => { uncheckCB(fbEl, v); renderPay(); } }));
  }
  const ftEl = document.getElementById('p-ft-list');
  const { chk: chkFt, isFiltered: ftActive } = getCBState(ftEl);
  if (ftActive) {
    if (chkFt.length === 0) tags.push({ label: 'ประเภท', value: '(ไม่มีที่เลือก)', remove: () => { checkAllCB(ftEl); renderPay(); } });
    else chkFt.forEach(v => tags.push({ label: 'ประเภท', value: v, remove: () => { uncheckCB(ftEl, v); renderPay(); } }));
  }
  const fcEl = document.getElementById('p-fc-list');
  const { chk: chkFc, isFiltered: fcActive } = getCBState(fcEl);
  if (fcActive) {
    if (chkFc.length === 0) tags.push({ label: 'Category', value: '(ไม่มีที่เลือก)', remove: () => { checkAllCB(fcEl); renderPay(); } });
    else chkFc.forEach(v => tags.push({ label: 'Category', value: v, remove: () => { uncheckCB(fcEl, v); renderPay(); } }));
  }
  const fsearch = document.getElementById('p-fsearch').value;
  if (fsearch) tags.push({ label: 'ค้นหา', value: fsearch, remove: () => { document.getElementById('p-fsearch').value = ''; renderPay(); } });

  buildTagsHTML(container, tags, () => {
    checkAllCB(document.getElementById('p-fb-list'));
    checkAllCB(document.getElementById('p-ft-list'));
    checkAllCB(document.getElementById('p-fc-list'));
    document.getElementById('p-fsearch').value = '';
    renderPay();
  });
}

// ── Fill Filters ──
function fillPayFilters() {
  fillCBList(document.getElementById('p-fb-list'), uniqVals(dataAgingOut, 'ชื่อสาขา').sort(), 'pfb_');
  document.getElementById('p-fb-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderPay));
  fillCBList(document.getElementById('p-ft-list'), uniqVals(dataAgingOut, 'ประเภท').sort(), 'pft_');
  document.getElementById('p-ft-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderPay));
  fillCBList(document.getElementById('p-fc-list'), uniqVals(dataAgingOut, 'Category Name').sort(), 'pfc_');
  document.getElementById('p-fc-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderPay));
}

// ── Init Pagination & Events ──
function initPayTab() {
  document.getElementById('p-prev').addEventListener('click', () => {
    if (payPage > 0) { payPage--; renderPayTable(); }
  });
  document.getElementById('p-next').addEventListener('click', () => {
    const pages = Math.ceil(payFiltered.length / PAY_PAGE_SIZE) || 1;
    if (payPage < pages - 1) { payPage++; renderPayTable(); }
  });
  document.getElementById('p-fsearch').addEventListener('input', renderPay);
  document.getElementById('p-clr').addEventListener('click', () => {
    checkAllCB(document.getElementById('p-fb-list'));
    checkAllCB(document.getElementById('p-ft-list'));
    checkAllCB(document.getElementById('p-fc-list'));
    document.getElementById('p-fsearch').value = '';
    renderPay();
  });
}
