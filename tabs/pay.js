// ============ tabs/pay.js — เอกสารจ่าย OUTBOUND Tab ============

const PAY_PAGE_SIZE = 100;
let payFiltered = [], payPage = 0;

// ── Helpers ──
function _getTodayDdMmYyyy() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function _fmtPayDate(v) {
  if (!v) return '';
  const s = String(v);
  // รูปแบบ dd/mm/yyyy (Gregorian จาก XLSX) → แปลงเป็น พ.ศ.
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const y = parseInt(m[3]) > 2400 ? parseInt(m[3]) : parseInt(m[3]) + 543;
    return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${y}`;
  }
  return s;
}

function _payDateSort(v) {
  // แปลง dd/mm/yyyy เป็น yyyymmdd เพื่อ sort
  const s = String(v || '');
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}${m[2].padStart(2,'0')}${m[1].padStart(2,'0')}`;
  return s;
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
      datalabels: { color: '#fff', font: { size: 11, weight: 'bold' }, formatter: (v, ctx) => { const e = typeEnt[ctx.dataIndex]; return e ? e[0] + '\n' + fmtN(v) : fmtN(v); }, anchor: 'center', align: 'center', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
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
  renderPayComparison();
}

// ── Top 5 สาขา aging เปรียบเทียบกับ Aging Out วันนี้ ──
function renderPayComparison() {
  const wrap = document.getElementById('p-comparison');
  if (!wrap) return;

  // ต้องมีข้อมูล Car + IMPORTED หรือ DOMESTIC อย่างน้อยหนึ่ง
  if (!dataCar.length || (!dataUot.length && !dataIn.length)) {
    wrap.innerHTML = '<div style="padding:18px;text-align:center;color:var(--muted);font-size:12px;">📊 ต้องการข้อมูล <strong>Car.xlsx</strong> + <strong>IMPORTED/DOMESTIC</strong> เพื่อแสดงเปรียบเทียบ</div>';
    if (CR['p-c3']) { CR['p-c3'].destroy(); delete CR['p-c3']; }
    return;
  }

  // 1. เอกสารจ่ายวันนี้จาก Aging Out
  const todayStr  = _getTodayDdMmYyyy();
  const todayPaid = dataAgingOut.filter(r => r['วันที่'] === todayStr);
  const paidDocSet = new Set(todayPaid.map(r => r['เลขที่เอกสาร']).filter(Boolean));
  const paidBoxByDoc = {};
  todayPaid.forEach(r => {
    const d = r['เลขที่เอกสาร'] || '';
    if (d) paidBoxByDoc[d] = (paidBoxByDoc[d] || 0) + num(r['จำนวน(กล่อง)']);
  });

  // 2. รวม branch จาก Car — brAbr → brFullName
  const branchMap = {};
  dataCar.forEach(r => {
    const abr  = String(r['ชื่อย่อสาขา'] || '').trim();
    const full = String(r['ชื่อสาขา']    || '').trim();
    if (abr && !branchMap[abr]) branchMap[abr] = full || BR_ABR_MAP[abr] || abr;
  });

  // 3. Car docs by branch (เชื่อม เลขที่เอกสาร Car → Aging Out)
  const carDocsByBranch = {};
  dataCar.forEach(r => {
    const abr = String(r['ชื่อย่อสาขา'] || '').trim();
    const doc = String(r['เลขที่เอกสาร'] || '').trim();
    if (abr && doc) {
      if (!carDocsByBranch[abr]) carDocsByBranch[abr] = [];
      carDocsByBranch[abr].push(doc);
    }
  });

  // 4. คำนวณ aging ต่อสาขาจาก IMPORTED + DOMESTIC → top 5
  const brStats = Object.entries(branchMap).map(([abr, full]) => {
    const ag = getAgingForBranch(abr, full, '');
    return { abr, full, ...ag };
  }).filter(b => b.maxDays > 0 || b.totalDocs > 0)
    .sort((a, b) => b.maxDays - a.maxDays)
    .slice(0, 5);

  if (!brStats.length) {
    wrap.innerHTML = '<div style="padding:18px;text-align:center;color:var(--muted);font-size:12px;">ไม่พบข้อมูล aging สำหรับสาขาในรายการรถ</div>';
    return;
  }

  // 5. เพิ่มข้อมูล paid/pending จาก Car→AgingOut
  brStats.forEach(b => {
    const carDocs = carDocsByBranch[b.abr] || [];
    let paidCnt = 0, pendingCnt = 0, paidBoxes = 0;
    carDocs.forEach(docNo => {
      if (paidDocSet.has(docNo)) { paidCnt++; paidBoxes += paidBoxByDoc[docNo] || 0; }
      else pendingCnt++;
    });
    b.paidCnt    = paidCnt;
    b.pendingCnt = pendingCnt;
    b.paidBoxes  = paidBoxes;
  });

  // 6. Grouped bar chart
  const labels = brStats.map(b => (b.full || b.abr).replace(/^สาขา\s*/, ''));
  mkChart('p-c3', 'bar', {
    labels,
    datasets: [
      { label: 'วันค้างสูงสุด (วัน)',     data: brStats.map(b => b.maxDays),   backgroundColor: '#ef4444', borderRadius: 3 },
      { label: 'เอกสารคงค้าง (IN+OUT)', data: brStats.map(b => b.totalDocs), backgroundColor: '#f59e0b', borderRadius: 3 },
      { label: 'เอกสารจ่ายวันนี้',       data: brStats.map(b => b.paidCnt),  backgroundColor: '#10b981', borderRadius: 3 },
      { label: 'กล่องที่จ่ายวันนี้',      data: brStats.map(b => b.paidBoxes),backgroundColor: '#22d3ee', borderRadius: 3 }
    ]
  }, {
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } },
      datalabels: { anchor: 'end', align: 'top', font: { size: 9, weight: 'bold' }, formatter: v => v > 0 ? fmtN(v) : '', color: '#e2e8f0' }
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } },
      x: { ticks: { font: { size: 9 }, maxRotation: 30 } }
    }
  });

  // 7. ตาราง summary
  const todayDisp = _fmtPayDate(todayStr);
  let tbl = `<div style="font-size:10.5px;color:var(--muted);margin-bottom:6px;padding:0 2px;">📅 เปรียบเทียบวันที่ ${todayDisp} — เชื่อมผ่าน <b>เลขที่เอกสาร</b> (Car ↔ Aging Out)</div>`;
  tbl += `<table class="gtbl" style="font-size:11px;"><thead><tr>
    <th style="text-align:center;">#</th>
    <th>สาขา</th>
    <th style="text-align:center;color:#fca5a5;">วันค้างสูงสุด</th>
    <th style="text-align:center;color:#fcd34d;">เอกสารคงค้าง</th>
    <th style="text-align:center;color:#34d399;">เอกสารจ่ายวันนี้</th>
    <th style="text-align:center;color:#67e8f9;">กล่องที่จ่าย</th>
  </tr></thead><tbody>`;
  brStats.forEach((b, i) => {
    const brLabel = (b.full || b.abr).replace(/^สาขา\s*/, '');
    tbl += `<tr>
      <td style="text-align:center;font-weight:700;color:#94a3b8;">${i + 1}</td>
      <td><span style="font-weight:600;">${esc(brLabel)}</span>&nbsp;<span style="font-size:9.5px;color:#c4b5fd;">${esc(b.abr)}</span></td>
      <td style="text-align:center;font-weight:700;color:#fca5a5;">${b.maxDays > 0 ? b.maxDays + ' วัน' : '—'}</td>
      <td style="text-align:center;">${fmtN(b.totalDocs)}</td>
      <td style="text-align:center;font-weight:700;color:#34d399;">${b.paidCnt > 0 ? fmtN(b.paidCnt) : '—'}</td>
      <td style="text-align:center;color:#67e8f9;">${b.paidBoxes > 0 ? fmtN(b.paidBoxes) : '—'}</td>
    </tr>`;
  });
  tbl += '</tbody></table>';
  wrap.innerHTML = tbl;
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
