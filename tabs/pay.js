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

  // ── Shared: Car doc → { wh, slot } (ใช้ร่วมหลาย chart) ──
  const carInfo = {};
  if (dataCar.length) {
    dataCar.forEach(r => {
      const doc = String(r['เลขที่เอกสาร'] || '').trim();
      if (!doc) return;
      carInfo[doc] = {
        wh:   String(r['คลังสินค้า'] || '(ไม่ระบุ)').trim(),
        slot: String(r['ช่วงเวลา']   || '(ไม่ระบุ)').trim()
      };
    });
  }

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

  // ── Chart 1: สัดส่วนตามคลัง (ผ่าน Car.xlsx) ──
  const byWh = {};
  payFiltered.forEach(r => {
    const doc = String(r['เลขที่เอกสาร'] || '').trim();
    const wh  = carInfo[doc]?.wh || (dataCar.length ? '(ไม่พบใน Car)' : '(ไม่มีข้อมูล Car)');
    if (!byWh[wh]) byWh[wh] = new Set();
    byWh[wh].add(doc);
  });
  const whEnt = Object.entries(byWh).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1]);
  mkChart('p-pie1', 'doughnut', {
    labels: whEnt.map(e => e[0]),
    datasets: [{ data: whEnt.map(e => e[1]), backgroundColor: PALETTE, borderWidth: 2, borderColor: 'rgba(6,16,30,.8)', hoverOffset: 6 }]
  }, {
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } },
      datalabels: { color: '#fff', font: { size: 11, weight: 'bold' }, formatter: (v, ctx) => { const e = whEnt[ctx.dataIndex]; return e ? e[0] + '\n' + fmtN(v) : fmtN(v); }, anchor: 'center', align: 'center', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
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

  // ── Chart 3: Top 5 สาขาที่มีการจ่ายมากที่สุดวันนี้ ──
  const todayStr2 = _getTodayDdMmYyyy();
  const todayRows = payFiltered.filter(r => r['วันที่'] === todayStr2);
  const baseRows  = todayRows.length ? todayRows : payFiltered;
  const brData    = Object.entries(groupBy(baseRows, 'ชื่อสาขา'))
    .map(([k, v]) => ({ name: (k || '').replace(/^สาขา\s*/, ''), docs: uniqCount(v, 'เลขที่เอกสาร'), box: v.reduce((s, r) => s + num(r['จำนวน(กล่อง)']), 0) }))
    .sort((a, b) => b.docs - a.docs).slice(0, 5);
  mkChart('p-c1', 'bar', {
    labels: brData.map(d => d.name),
    datasets: [
      { label: 'จำนวนเอกสาร', data: brData.map(d => d.docs), backgroundColor: '#10b981', borderRadius: 3 },
      { label: 'จำนวนกล่อง',   data: brData.map(d => d.box),  backgroundColor: '#22d3ee', borderRadius: 3 }
    ]
  }, {
    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } }, datalabels: { anchor: 'end', align: 'top', font: { size: 9, weight: 'bold' }, formatter: v => v > 0 ? fmtN(v) : '', color: '#e2e8f0' } },
    scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } }, x: { ticks: { font: { size: 9 }, maxRotation: 30 } } }
  });

  // ── Chart p-c4: คลังที่มีการจ่ายเอกสารตามช่วงเวลา Car ──
  const slotWhCnt = {};
  const allSlots4 = new Set();
  const allWhs4   = new Set();
  payFiltered.forEach(r => {
    const doc  = String(r['เลขที่เอกสาร'] || '').trim();
    const info = carInfo[doc] || {};
    const slot = info.slot || '(ไม่ระบุ)';
    const wh   = info.wh   || '(ไม่ระบุ)';
    allSlots4.add(slot);
    allWhs4.add(wh);
    if (!slotWhCnt[slot]) slotWhCnt[slot] = {};
    slotWhCnt[slot][wh] = (slotWhCnt[slot][wh] || 0) + 1;
  });
  const slotsArr4 = [...allSlots4].sort();
  const whsArr4   = [...allWhs4].sort();
  const c4El = document.getElementById('p-c4');
  if (c4El) c4El.style.width = Math.max(320, slotsArr4.length * 100) + 'px';
  mkChart('p-c4', 'bar', {
    labels: slotsArr4,
    datasets: whsArr4.map((wh, i) => ({
      label: wh,
      data: slotsArr4.map(slot => slotWhCnt[slot]?.[wh] || 0),
      backgroundColor: PALETTE[i % PALETTE.length],
      borderRadius: 3
    }))
  }, {
    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } }, datalabels: { anchor: 'end', align: 'top', font: { size: 9, weight: 'bold' }, formatter: v => v > 0 ? fmtN(v) : '', color: '#e2e8f0' } },
    scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } }, x: { ticks: { font: { size: 9 }, maxRotation: 30 } } }
  });


  renderPayCarTable();
  renderPayTags();
}

// ── Car OUTBOUND Table (ออก DC แล้ว) ──
let _payCarRows = [];

function renderPayCarTable() {
  const el = document.getElementById('p-car-tbl');
  if (!el) return;
  _payCarRows = [];

  if (!dataCar.length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px;">📂 กรุณาโหลดไฟล์ <strong>Car.xlsx</strong> เพื่อแสดงคิวรถ OUTBOUND</div>';
    return;
  }

  // Build Aging Out lookup: docNo → rows
  const agingByDoc = {};
  dataAgingOut.forEach(r => {
    const d = String(r['เลขที่เอกสาร'] || '').trim();
    if (d) { if (!agingByDoc[d]) agingByDoc[d] = []; agingByDoc[d].push(r); }
  });

  // รถที่ออก DC แล้ว = ค่าในคอลัมน์ = "ออกแล้ว"
  const departed = dataCar.filter(r => isDcDeparted(r['รถยังไม่ออกจาก DC']));

  if (!departed.length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px;">ไม่มีรถที่ออก DC แล้ว หรือยังไม่โหลดข้อมูล</div>';
    return;
  }

  const allCnt = dataCar.length;
  const dcCnt  = allCnt - departed.length;
  departed.sort((a, b) => (a['ช่วงเวลา'] || '').localeCompare(b['ช่วงเวลา'] || '')).forEach(r => {
    const docNo  = String(r['เลขที่เอกสาร'] || '').trim();
    const agRows = agingByDoc[docNo] || [];
    const aging  = getAgingForBranch(r['ชื่อย่อสาขา'] || '', r['ชื่อสาขา'] || '', r['คลังสินค้า'] || '');
    _payCarRows.push({ ...r, _docNo: docNo, _agRows: agRows, _aging: aging });
  });

  let html = `<div style="font-size:10.5px;color:var(--muted);padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.05);">
    รวม ${_payCarRows.length} คัน (จากทั้งหมด ${allCnt} คัน)
    ${dcCnt > 0 ? ` &nbsp;·&nbsp; <span style="color:#fb923c;">🚧 ยังไม่ออก DC: ${dcCnt} คัน</span>` : ''}
  </div>`;
  html += `<table class="gtbl"><thead><tr>
    <th>ช่วงเวลา</th><th>คลัง</th><th>สาขา</th><th>ประเภทรถ</th><th>ประเภทงาน</th><th>ทะเบียน</th><th>คนขับ</th>
    <th style="text-align:center;">DOMESTIC</th><th style="text-align:center;">IMPORTED</th>
    <th style="text-align:center;">เอกสาร Aging Out รวม</th>
    <th style="text-align:right;">กล่อง</th><th style="text-align:right;">ชิ้น</th>
    <th>สถานะ</th>
  </tr></thead><tbody>`;

  _payCarRows.forEach((r, i) => {
    const brDisp  = (r['ชื่อสาขา'] || BR_ABR_MAP[r['ชื่อย่อสาขา']] || r['ชื่อย่อสาขา'] || '').replace(/^สาขา\s*/, '');
    const stuck   = isChecked(r['รถตกค้าง']);
    let statCls   = 'unknown', statTxt = r['สถานะลงคิว'] || '-';
    if (stuck)                                                              { statCls = 'late';    statTxt = '⚠ ตกค้าง'; }
    else if (statTxt.includes('ยังไม่'))                                    statCls = 'pending';
    else if (statTxt.includes('สำเร็จ') || statTxt.includes('เรียบร้อย')) statCls = 'done';
    const ag       = r._aging;
    const totalBox = r._agRows.reduce((s, x) => s + num(x['จำนวน(กล่อง)']), 0);
    const totalPcs = r._agRows.reduce((s, x) => s + num(x['จำนวนโอน(ชิ้น)']), 0);
    html += `<tr class="ctbl-row" onclick="openPayCarModal(${i})" title="คลิกเพื่อดูรายการเอกสาร Aging Out">
      <td style="font-weight:700;color:#7dd3fc;white-space:nowrap;">${esc(r['ช่วงเวลา'] || '')}</td>
      <td style="text-align:center;font-weight:700;">${esc(r['คลังสินค้า'] || '')}</td>
      <td><span style="font-weight:600;">${esc(brDisp)}</span>${r['ชื่อย่อสาขา'] ? ` <span style="font-size:10px;color:#c4b5fd;">${esc(r['ชื่อย่อสาขา'])}</span>` : ''}</td>
      <td style="font-size:11px;">${esc(r['ประเภทรถ'] || '')}</td>
      <td style="font-size:11px;">${esc(r['ประเภทงาน'] || '')}</td>
      <td style="font-family:monospace;font-size:11px;">${esc(r['ป้ายทะเบียน'] || '')}</td>
      <td style="font-size:11px;">${esc(r['ชื่อคนขับ'] || '')}${r['เบอร์โทร'] ? ` <span style="color:var(--muted);font-size:10px;">(${esc(r['เบอร์โทร'])})</span>` : ''}</td>
      <td style="text-align:center;">${ag.inDocs  ? `<b style="color:#7dd3fc;">${ag.inDocs}</b>`  : '—'}</td>
      <td style="text-align:center;">${ag.outDocs ? `<b style="color:#fbbf24;">${ag.outDocs}</b>` : '—'}</td>
      <td style="text-align:center;">${r._agRows.length ? `<b style="color:#a5b4fc;">📑 ${r._agRows.length}</b>` : '<span style="color:var(--muted)">—</span>'}</td>
      <td style="text-align:right;">${totalBox ? fmtN(totalBox) : '—'}</td>
      <td style="text-align:right;">${totalPcs ? fmtN(totalPcs) : '—'}</td>
      <td><span class="cstat ${statCls}">${esc(statTxt)}</span></td>
    </tr>`;
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}

// ── Popup: รายละเอียดเอกสารในรถ ──
function openPayCarModal(idx) {
  const r = _payCarRows[idx];
  if (!r) return;
  const brDisp = (r['ชื่อสาขา'] || BR_ABR_MAP[r['ชื่อย่อสาขา']] || r['ชื่อย่อสาขา'] || '').replace(/^สาขา\s*/, '');
  document.getElementById('pcm-title').textContent = `${brDisp} — คลัง ${r['คลังสินค้า'] || '-'}`;
  document.getElementById('pcm-sub').textContent   = `⏰ ${r['ช่วงเวลา'] || '-'}  |  🔖 ${r['ป้ายทะเบียน'] || '-'}${r['ชื่อคนขับ'] ? '  |  👤 ' + r['ชื่อคนขับ'] : ''}`;

  const agRows = r._agRows || [];
  let body = '';
  if (!agRows.length) {
    body = `<div style="padding:30px;text-align:center;color:var(--muted);">ไม่พบรายการเอกสารใน Aging OUTBOUND<br><span style="font-size:10px;">ต้องโหลดไฟล์ Aging Out ก่อน</span></div>`;
  } else {
    const totalBox = agRows.reduce((s, x) => s + num(x['จำนวน(กล่อง)']), 0);
    const totalPcs = agRows.reduce((s, x) => s + num(x['จำนวนโอน(ชิ้น)']), 0);
    body = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <span style="font-size:11px;padding:3px 10px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);border-radius:4px;color:#7dd3fc;">📄 ${esc(r._docNo)}</span>
      <span style="font-size:11px;padding:3px 10px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:4px;color:#34d399;">📦 ${fmtN(totalBox)} กล่อง</span>
      <span style="font-size:11px;padding:3px 10px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);border-radius:4px;color:#c4b5fd;">${fmtN(totalPcs)} ชิ้น</span>
      <span style="font-size:11px;padding:3px 10px;background:rgba(251,146,60,.1);border:1px solid rgba(251,146,60,.2);border-radius:4px;color:#fb923c;">${agRows.length} รายการสินค้า</span>
    </div>
    <table class="gtbl"><thead><tr>
      <th>เลขที่ขอโอน</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th>
      <th style="text-align:right;">กล่อง</th><th style="text-align:right;">ชิ้น</th>
      <th>Category</th><th>ประเภท</th>
    </tr></thead><tbody>`;
    agRows.forEach(x => {
      body += `<tr>
        <td style="font-size:10.5px;color:#a5b4fc;white-space:nowrap;">${esc(x['เลขที่ขอโอน'] || '')}</td>
        <td style="font-size:10.5px;">${esc(x['รหัสสินค้า'] || '')}</td>
        <td style="font-size:10.5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(x['ชื่อสินค้า'] || '')}">${esc(x['ชื่อสินค้า'] || '')}</td>
        <td style="text-align:right;font-weight:600;">${fmtN(num(x['จำนวน(กล่อง)']))}</td>
        <td style="text-align:right;">${fmtN(num(x['จำนวนโอน(ชิ้น)']))}</td>
        <td style="font-size:10px;">${esc(x['Category Name'] || '')}</td>
        <td><span class="pay-type ${(x['ประเภท'] || '').toLowerCase()}">${esc(x['ประเภท'] || '')}</span></td>
      </tr>`;
    });
    body += '</tbody></table>';
  }
  document.getElementById('pcm-body').innerHTML = body;
  document.getElementById('pay-car-modal').classList.add('open');
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

// ── Init Events ──
function initPayTab() {
  document.getElementById('p-fsearch').addEventListener('input', renderPay);
  document.getElementById('p-clr').addEventListener('click', () => {
    checkAllCB(document.getElementById('p-fb-list'));
    checkAllCB(document.getElementById('p-ft-list'));
    checkAllCB(document.getElementById('p-fc-list'));
    document.getElementById('p-fsearch').value = '';
    renderPay();
  });
  // Pay Car Modal close
  document.getElementById('pcm-close').addEventListener('click', () => {
    document.getElementById('pay-car-modal').classList.remove('open');
  });
  document.getElementById('pay-car-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('pay-car-modal'))
      document.getElementById('pay-car-modal').classList.remove('open');
  });
}
