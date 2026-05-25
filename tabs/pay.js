// ============ tabs/pay.js — เอกสารจ่าย OUTBOUND Tab ============

const PAY_PAGE_SIZE = 100;
let payFiltered = [], payPage = 0;
let _payCarInfo = {}; // doc → { wh, slot } — built before filter runs

// ── Helpers ──
function _getTodayDdMmYyyy() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function _getTomorrowDdMmYyyy() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// แปลงวันที่ dd/mm/yyyy → yyyymmdd (CE) รองรับทั้ง ค.ศ. และ พ.ศ.
function _toDateKey(v) {
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  let y = parseInt(m[3]);
  if (y > 2400) y -= 543; // พ.ศ. → ค.ศ.
  return `${y}${m[2].padStart(2,'0')}${m[1].padStart(2,'0')}`;
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
  const fbCB     = checkedVals(document.getElementById('p-fb-list'));
  const ftCB     = checkedVals(document.getElementById('p-ft-list'));
  const fcCB     = checkedVals(document.getElementById('p-fc-list'));
  const fwhCB    = checkedVals(document.getElementById('p-fwh-list'));
  const fsearch  = (document.getElementById('p-fsearch').value   || '').trim().toLowerCase();
  const fdateFrom = (document.getElementById('p-fdate-from')?.value || '').replace(/-/g, ''); // yyyymmdd
  const fdateTo   = (document.getElementById('p-fdate-to')?.value   || '').replace(/-/g, ''); // yyyymmdd

  return dataAgingOut.filter(r => {
    if (fbCB.length && !fbCB.includes(r['ชื่อสาขา'])) return false;
    if (ftCB.length && !ftCB.includes(r['ประเภท'])) return false;
    if (fcCB.length && !fcCB.includes(r['Category Name'])) return false;
    if (fwhCB.length) {
      const doc = String(r['เลขที่เอกสาร'] || '').trim();
      const wh  = _payCarInfo[doc]?.wh || r['คลังสินค้า'] || '';
      if (!fwhCB.includes(wh)) return false;
    }
    if (fdateFrom || fdateTo) {
      const rk = _payDateSort(r['วันที่']);
      if (fdateFrom && rk < fdateFrom) return false;
      if (fdateTo   && rk > fdateTo)   return false;
    }
    if (fsearch) {
      const docNo = (r['เลขที่เอกสาร']     || '').toLowerCase();
      const poiNo = (r['เลขที่ขอโอน']      || '').toLowerCase();
      const poi2  = (r['เลขที่เอกสาร POI'] || '').toLowerCase();
      const brNm  = (r['ชื่อสาขา']         || '').toLowerCase();
      if (!docNo.includes(fsearch) && !poiNo.includes(fsearch) && !poi2.includes(fsearch) && !brNm.includes(fsearch)) return false;
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

  // ── Build carInfo first so getPayFiltered() can use it for WH filter ──
  _payCarInfo = {};
  dataCar.forEach(r => {
    const doc = String(r['เลขที่เอกสาร'] || '').trim();
    if (!doc) return;
    _payCarInfo[doc] = {
      wh:   String(r['คลังสินค้า'] || '(ไม่ระบุ)').trim(),
      slot: String(r['ช่วงเวลา']   || '(ไม่ระบุ)').trim()
    };
  });

  payFiltered = getPayFiltered();
  payPage = 0;

  // ── KPI ──
  const branches  = uniqCount(payFiltered, 'ชื่อสาขา');
  const totalBox  = payFiltered.reduce((s, r) => s + num(r['จำนวน(กล่อง)']), 0);
  const totalPcs  = payFiltered.reduce((s, r) => s + num(r['จำนวนโอน(ชิ้น)']), 0);

  // docs ที่รถ "ออกแล้ว" — join dataCar
  const departedDocSet = new Set(
    dataCar.filter(r => isDcDeparted(String(r['รถยังไม่ออกจาก DC'] || '').trim()))
           .map(r => String(r['เลขที่เอกสาร'] || '').trim()).filter(Boolean)
  );
  const payDeparted   = payFiltered.filter(r => departedDocSet.has(String(r['เลขที่เอกสาร'] || '').trim()));
  const docsDepted    = uniqCount(payDeparted, 'เลขที่เอกสาร');
  const poisDepted    = uniqCount(payDeparted, 'เลขที่ขอโอน');

  // สถานะขึ้นสินค้า — นับจาก dataCar ที่ doc อยู่ใน payFiltered AND ออกแล้ว
  const payFilteredDocSet = new Set(payFiltered.map(r => String(r['เลขที่เอกสาร'] || '').trim()).filter(Boolean));
  const carsInPay     = dataCar.filter(r => {
    const doc = String(r['เลขที่เอกสาร'] || '').trim();
    return payFilteredDocSet.has(doc) && isDcDeparted(String(r['รถยังไม่ออกจาก DC'] || '').trim());
  });
  const cntStd    = carsInPay.filter(r => String(r['สถานะขึ้นสินค้า'] || '').trim() === 'ได้มาตราฐาน').length;
  const cntNonStd = carsInPay.filter(r => String(r['สถานะขึ้นสินค้า'] || '').trim() === 'ไม่ได้มาตราฐาน').length;

  kpiEl.innerHTML = `
    <stat-card label="เอกสาร OUTBOUND" value="${fmtN(docsDepted)}" unit="รถออกแล้ว"></stat-card>
    <stat-card label="เลขที่ขอโอน จ่ายแล้ว" value="${fmtN(poisDepted)}" unit="รถออกแล้ว" variant="ok"></stat-card>
    <stat-card label="จำนวนสินค้า" value="${fmtN(payFiltered.length)}" unit="รายการ"></stat-card>
    <stat-card label="จำนวนกล่องรวม" value="${fmtN(totalBox)}" unit="กล่อง"></stat-card>
    <stat-card label="จำนวนชิ้นรวม" value="${fmtN(totalPcs)}" unit="ชิ้น"></stat-card>
    <stat-card label="จำนวนสาขา" value="${fmtN(branches)}" unit="สาขา" variant="inf"></stat-card>
    <stat-card label="ได้มาตราฐาน" value="${fmtN(cntStd)}" unit="คัน" variant="ok"></stat-card>
    <stat-card label="ไม่ได้มาตราฐาน" value="${fmtN(cntNonStd)}" unit="คัน" variant="${cntNonStd > 0 ? 'alr' : 'ok'}"></stat-card>
  `;

  // ใช้สำหรับ Chart 2 (IMPORTED vs Aging Out)
  const allPaidPOIs = new Set(dataAgingOut.map(r => r['เลขที่ขอโอน']).filter(Boolean));
  const hasImported = dataUot.length > 0;
  const remainPOIs  = hasImported
    ? [...new Set(dataUot.map(r => r['เลขที่เอกสารขอโอน']).filter(Boolean))].filter(p => !allPaidPOIs.has(p))
    : [];

  // ── Chart 1: สัดส่วนตามคลัง (ผ่าน Car.xlsx) ──
  const byWh = {};
  payFiltered.forEach(r => {
    const doc = String(r['เลขที่เอกสาร'] || '').trim();
    const wh  = _payCarInfo[doc]?.wh || (dataCar.length ? '(ไม่พบใน Car)' : '(ไม่มีข้อมูล Car)');
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

  // ── Chart p-c4: คลังที่มีการจ่ายเอกสารตามช่วงเวลา Car ──
  const slotWhCnt = {};
  const allSlots4 = new Set();
  const allWhs4   = new Set();
  payFiltered.forEach(r => {
    const doc  = String(r['เลขที่เอกสาร'] || '').trim();
    const info = _payCarInfo[doc] || {};
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


  _renderPayCarKPIs();
  _renderPayTimeline();
  renderPayCarTable();
  renderPayTags();
}

// ── Car KPI Section (สถานะรถ OUTBOUND แยกคลัง + DC status) ──
function _renderPayCarKPIs() {
  const el = document.getElementById('pay-kpi-car');
  if (!el) return;
  if (!dataCar.length) { el.innerHTML = ''; return; }

  // นับรถแยกตามคลัง
  const whCnt = {};
  dataCar.forEach(r => {
    const wh = String(r['คลังสินค้า'] || '(ไม่ระบุ)').trim();
    whCnt[wh] = (whCnt[wh] || 0) + 1;
  });

  // นับรถตามสถานะ DC
  let cntWait = 0, cntLoading = 0, cntDep = 0, cntStuck = 0;
  dataCar.forEach(r => {
    const dcv   = String(r['รถยังไม่ออกจาก DC'] || '').trim();
    const stuck = isChecked(r['รถตกค้าง']);
    if (stuck)              { cntStuck++;   return; }
    if (isDcDeparted(dcv))  { cntDep++;     return; }
    if (isDcNotLeft(dcv))   { cntLoading++; return; }
    cntWait++;
  });

  const total = dataCar.length;
  const whCards = Object.entries(whCnt)
    .sort((a, b) => b[1] - a[1])
    .map(([wh, cnt]) =>
      `<div class="kpi inf"><div class="kpi-lbl">🏭 ${esc(wh)}</div><div class="kpi-val">${fmtN(cnt)}</div><div class="kpi-unit">คัน</div></div>`
    ).join('');

  el.innerHTML = `
    <div class="pay-car-kpi-lbl">🚛 สถานะรถ OUTBOUND (${fmtN(total)} คัน)</div>
    <div class="kpi-row pay-car-kpi-row">
      ${whCards}
      <div class="kpi warn"><div class="kpi-lbl">⏳ รอขึ้นสินค้า</div><div class="kpi-val">${fmtN(cntWait)}</div><div class="kpi-unit">คัน</div></div>
      <div class="kpi inf"><div class="kpi-lbl">🔵 กำลังขึ้นสินค้า</div><div class="kpi-val">${fmtN(cntLoading)}</div><div class="kpi-unit">คัน</div></div>
      <div class="kpi ok"><div class="kpi-lbl">✅ ออกแล้ว</div><div class="kpi-val">${fmtN(cntDep)}</div><div class="kpi-unit">คัน</div></div>
      ${cntStuck > 0 ? `<div class="kpi alr"><div class="kpi-lbl">⚠️ ตกค้าง</div><div class="kpi-val">${fmtN(cntStuck)}</div><div class="kpi-unit">คัน</div></div>` : ''}
    </div>`;
}

// ── Timeline Chart: สถานะรถตามช่วงเวลา ──
let _tlWhFilter = null;
let _tlWhList   = [];

function _setTlWh(i) { _tlWhFilter = i < 0 ? null : (_tlWhList[i] || null); _renderPayTimeline(); }

function _renderPayTimeline() {
  const bar = document.getElementById('p-tl-wh-bar');
  if (!bar) return;

  if (!dataCar.length) { bar.innerHTML = ''; return; }

  // Build warehouse list
  const whSet = new Set(dataCar.map(r => String(r['คลังสินค้า'] || '(ไม่ระบุ)').trim()));
  _tlWhList = [...whSet].sort();

  // Render filter buttons
  const btnBase = 'font-size:10px;padding:2px 9px;border-radius:12px;border:1px solid;cursor:pointer;transition:all .15s;';
  bar.innerHTML = [{ label: 'ทั้งหมด', idx: -1 }, ..._tlWhList.map((w, i) => ({ label: w, idx: i }))]
    .map(({ label, idx }) => {
      const active = idx < 0 ? _tlWhFilter === null : _tlWhList[idx] === _tlWhFilter;
      return `<button onclick="_setTlWh(${idx})" style="${btnBase}background:${active ? '#3b82f6' : 'rgba(255,255,255,.06)'};border-color:${active ? '#3b82f6' : 'rgba(255,255,255,.15)'};color:${active ? '#fff' : 'var(--muted)'};">${esc(label)}</button>`;
    }).join('');

  // Filter data by selected warehouse
  const cars = _tlWhFilter
    ? dataCar.filter(r => String(r['คลังสินค้า'] || '').trim() === _tlWhFilter)
    : dataCar;

  const slotData = {};
  cars.forEach(r => {
    const slot  = String(r['ช่วงเวลา'] || '(ไม่ระบุ)').trim();
    const dcv   = String(r['รถยังไม่ออกจาก DC'] || '').trim();
    const stuck = isChecked(r['รถตกค้าง']);
    let status;
    if (stuck)                 status = 'stuck';
    else if (isDcDeparted(dcv))  status = 'dep';
    else if (isDcNotLeft(dcv))   status = 'loading';
    else                         status = 'wait';
    if (!slotData[slot]) slotData[slot] = { wait: 0, loading: 0, dep: 0, stuck: 0 };
    slotData[slot][status]++;
  });

  const slots = Object.keys(slotData).sort((a, b) => timeSlotStart(a) - timeSlotStart(b));
  mkChart('p-timeline', 'bar', {
    labels: slots,
    datasets: [
      { label: '⏳ รอขึ้นสินค้า',    data: slots.map(s => slotData[s].wait),    backgroundColor: '#f59e0b', borderRadius: 3 },
      { label: '🔵 กำลังขึ้นสินค้า', data: slots.map(s => slotData[s].loading), backgroundColor: '#38bdf8', borderRadius: 3 },
      { label: '✅ ออกแล้ว',          data: slots.map(s => slotData[s].dep),     backgroundColor: '#10b981', borderRadius: 3 },
      { label: '⚠️ ตกค้าง',          data: slots.map(s => slotData[s].stuck),   backgroundColor: '#ef4444', borderRadius: 3 }
    ]
  }, {
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } },
      datalabels: { anchor: 'end', align: 'top', font: { size: 9, weight: 'bold' }, formatter: v => v > 0 ? fmtN(v) : '', color: '#e2e8f0', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
    },
    scales: {
      x: { ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } },
      y: { beginAtZero: true, ticks: { font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } }
    }
  });
}

// ── รายงาน คิวรถ OUTBOUND ออก DC แล้ว ──
// Primary: dataCar ที่ รถยังไม่ออกจาก DC = "ออกแล้ว" (ทุกคัน ไม่กรองวันที่)
// Join:    dataAgingOut on เลขที่เอกสาร → ดึงรายการเอกสาร aging
let _payCarRows = [];

function renderPayCarTable() {
  const el = document.getElementById('p-car-tbl');
  if (!el) return;
  _payCarRows = [];

  if (!dataCar.length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px;">📂 กรุณาโหลดไฟล์ <strong>Car.xlsx</strong> ก่อน</div>';
    return;
  }

  // ── 1. Build Aging Out lookup จาก payFiltered (ผ่าน filter เดียวกับตารางหลัก) ──
  const agingByDoc = {};
  const agingSource = dataAgingOut.length ? payFiltered : []; // ถ้าไม่มี Aging Out → ว่าง
  agingSource.forEach(r => {
    const d = String(r['เลขที่เอกสาร'] || '').trim();
    if (!d) return;
    if (!agingByDoc[d]) agingByDoc[d] = [];
    agingByDoc[d].push(r);
  });

  // ── 2. Primary: รถทุกคันที่ออก DC แล้ว
  //    ถ้าโหลด Aging Out แล้ว → กรองเฉพาะที่มีเอกสารผ่าน filter
  //    ถ้ายังไม่โหลด Aging Out → แสดงทุกคัน ──
  const agDocSet = new Set(Object.keys(agingByDoc));
  const departed = dataCar.filter(r => {
    if (!isDcDeparted(r['รถยังไม่ออกจาก DC'])) return false;
    if (!dataAgingOut.length) return true; // ยังไม่โหลด Aging Out → แสดงหมด
    const docNo = String(r['เลขที่เอกสาร'] || '').trim();
    return agDocSet.has(docNo); // มีใน filtered aging out ถึงแสดง
  });

  if (!departed.length) {
    const msg = dataAgingOut.length
      ? 'ไม่มีรถที่ตรงกับเงื่อนไขการกรอง'
      : 'ไม่มีรถที่ออก DC แล้ว';
    el.innerHTML = `<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px;">${msg}</div>`;
    return;
  }

  // ── 3. Sort by ช่วงเวลา แล้ว build rows ──
  departed
    .sort((a, b) => timeSlotStart(a['ช่วงเวลา'] || '') - timeSlotStart(b['ช่วงเวลา'] || ''))
    .forEach(r => {
      const docNo = String(r['เลขที่เอกสาร'] || '').trim();
      const aging = getAgingForBranch(r['ชื่อย่อสาขา'] || '', r['ชื่อสาขา'] || '', r['คลังสินค้า'] || '');
      _payCarRows.push({ ...r, _docNo: docNo, _agRows: agingByDoc[docNo] || [], _aging: aging });
    });

  // ── 4. Render ──
  const matchCnt   = _payCarRows.filter(r => r._agRows.length > 0).length;
  const agDocCount = uniqCount(dataAgingOut, 'เลขที่เอกสาร');
  let html = `<div style="font-size:10.5px;color:var(--muted);padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
    <span>รวม <b style="color:#e2e8f0;">${_payCarRows.length}</b> คัน ออก DC แล้ว</span>
    <span>มีข้อมูล Aging Out: <b style="color:#a5b4fc;">${matchCnt} / ${_payCarRows.length}</b> คัน</span>
    ${dataAgingOut.length
      ? `<span>Aging Out ที่โหลด: <b style="color:#34d399;">${agDocCount}</b> เลขที่เอกสาร / <b style="color:#34d399;">${dataAgingOut.length}</b> รายการ</span>`
      : `<span style="color:#fb923c;">⚠ ยังไม่โหลดไฟล์ Aging OUTBOUND</span>`}
    ${matchCnt < _payCarRows.length && dataAgingOut.length
      ? `<span style="color:#fb923c;">⚠ ไม่พบ Aging Out อีก ${_payCarRows.length - matchCnt} คัน — ตรวจสอบว่าโหลดไฟล์ครบถ้วน</span>`
      : ''}
  </div>`;

  html += `<table class="gtbl"><thead><tr>
    <th>วันที่คิวงาน</th><th>ช่วงเวลา</th><th>คลัง</th><th>สาขา</th><th>เลขที่เอกสาร</th>
    <th>ประเภทรถ</th><th>ประเภทงาน</th><th>ทะเบียน</th><th>คนขับ</th>
    <th>เวลาขึ้นสินค้า</th><th>สถานะขึ้นสินค้า</th>
    <th style="text-align:center;">เลขที่ขอโอน</th>
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
    const totalBox    = r._agRows.reduce((s, x) => s + num(x['จำนวน(กล่อง)']), 0);
    const totalPcs    = r._agRows.reduce((s, x) => s + num(x['จำนวนโอน(ชิ้น)']), 0);
    const dateDisp    = _fmtPayDate(r['วันที่คิวงาน'] || r['วันที่'] || '') || '—';
    const loadTime    = r['เวลาขึ้นสินค้า']    || '—';
    const loadStatus  = r['สถานะขึ้นสินค้า']   || '—';
    html += `<tr class="ctbl-row" onclick="openPayCarModal(${i})" title="คลิกเพื่อดูรายการเอกสาร Aging Out">
      <td style="font-size:11px;white-space:nowrap;">${esc(dateDisp)}</td>
      <td style="font-weight:700;color:#7dd3fc;white-space:nowrap;">${esc(r['ช่วงเวลา'] || '')}</td>
      <td style="text-align:center;font-weight:700;">${esc(r['คลังสินค้า'] || '')}</td>
      <td><span style="font-weight:600;">${esc(brDisp)}</span>${r['ชื่อย่อสาขา'] ? ` <span style="font-size:10px;color:#c4b5fd;">${esc(r['ชื่อย่อสาขา'])}</span>` : ''}</td>
      <td style="font-family:monospace;font-size:10.5px;color:#7dd3fc;white-space:nowrap;">${esc(r._docNo)}</td>
      <td style="font-size:11px;">${esc(r['ประเภทรถ'] || '')}</td>
      <td style="font-size:11px;">${esc(r['ประเภทงาน'] || '')}</td>
      <td style="font-family:monospace;font-size:11px;">${esc(r['ป้ายทะเบียน'] || '')}</td>
      <td style="font-size:11px;">${esc(r['ชื่อคนขับ'] || '')}${r['เบอร์โทร'] ? ` <span style="color:var(--muted);font-size:10px;">(${esc(r['เบอร์โทร'])})</span>` : ''}</td>
      <td style="font-size:11px;white-space:nowrap;">${esc(loadTime)}</td>
      <td style="font-size:11px;">${esc(loadStatus)}</td>
      <td style="text-align:center;">${r._agRows.length ? `<b style="color:#a5b4fc;">📑 ${uniqCount(r._agRows, 'เลขที่ขอโอน')}</b>` : '<span style="color:var(--muted)">—</span>'}</td>
      <td style="text-align:right;">${totalBox ? fmtN(totalBox) : '—'}</td>
      <td style="text-align:right;">${totalPcs ? fmtN(totalPcs) : '—'}</td>
      <td style="white-space:nowrap;"><span class="cstat dc-out" style="font-size:9.5px;">✅ ออก DC</span> <span class="cstat ${statCls}">${esc(statTxt)}</span></td>
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

    // Group by เลขที่ขอโอน
    const groups = {}, groupOrder = [];
    agRows.forEach(x => {
      const key = x['เลขที่ขอโอน'] || '(ไม่ระบุ)';
      if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
      groups[key].push(x);
    });

    body = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <span style="font-size:11px;padding:3px 10px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);border-radius:4px;color:#7dd3fc;">📄 ${esc(r._docNo)}</span>
      <span style="font-size:11px;padding:3px 10px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:4px;color:#34d399;">📦 ${fmtN(totalBox)} กล่อง</span>
      <span style="font-size:11px;padding:3px 10px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);border-radius:4px;color:#c4b5fd;">${fmtN(totalPcs)} ชิ้น</span>
      <span style="font-size:11px;padding:3px 10px;background:rgba(251,146,60,.1);border:1px solid rgba(251,146,60,.2);border-radius:4px;color:#fb923c;">${groupOrder.length} เลขที่ขอโอน</span>
    </div>`;

    groupOrder.forEach((key, gi) => {
      const items = groups[key];
      const gBox  = items.reduce((s, x) => s + num(x['จำนวน(กล่อง)']), 0);
      const gPcs  = items.reduce((s, x) => s + num(x['จำนวนโอน(ชิ้น)']), 0);
      const gid   = `pcm-grp-${gi}`;
      body += `<div style="margin-bottom:6px;border:1px solid rgba(255,255,255,.08);border-radius:6px;overflow:hidden;">
        <div onclick="(function(el){el.style.display=el.style.display==='none'?'block':'none'})(document.getElementById('${gid}'))"
          style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;background:rgba(255,255,255,.04);user-select:none;">
          <span style="font-size:11px;color:#a5b4fc;font-family:monospace;font-weight:700;">${esc(key)}</span>
          <span style="flex:1;"></span>
          <span style="font-size:10px;color:#34d399;">📦 ${fmtN(gBox)} กล่อง</span>
          <span style="font-size:10px;color:#c4b5fd;margin-left:6px;">${fmtN(gPcs)} ชิ้น</span>
          <span style="font-size:10px;color:var(--muted);margin-left:6px;">${items.length} รายการ ▼</span>
        </div>
        <div id="${gid}" style="display:none;">
          <table class="gtbl"><thead><tr>
            <th>รหัสสินค้า</th><th>ชื่อสินค้า</th>
            <th style="text-align:right;">กล่อง</th><th style="text-align:right;">ชิ้น</th>
            <th>Category</th><th>ประเภท</th>
          </tr></thead><tbody>`;
      items.forEach(x => {
        body += `<tr>
          <td style="font-size:10.5px;">${esc(x['รหัสสินค้า'] || '')}</td>
          <td style="font-size:10.5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(x['ชื่อสินค้า'] || '')}">${esc(x['ชื่อสินค้า'] || '')}</td>
          <td style="text-align:right;font-weight:600;">${fmtN(num(x['จำนวน(กล่อง)']))}</td>
          <td style="text-align:right;">${fmtN(num(x['จำนวนโอน(ชิ้น)']))}</td>
          <td style="font-size:10px;">${esc(x['Category Name'] || '')}</td>
          <td><span class="pay-type ${(x['ประเภท'] || '').toLowerCase()}">${esc(x['ประเภท'] || '')}</span></td>
        </tr>`;
      });
      body += `</tbody></table></div></div>`;
    });
  }
  document.getElementById('pcm-body').innerHTML = body;
  document.getElementById('pay-car-modal').classList.add('show');
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
  const fwhEl = document.getElementById('p-fwh-list');
  const { chk: chkWh, isFiltered: whActive } = getCBState(fwhEl);
  if (whActive) {
    if (chkWh.length === 0) tags.push({ label: 'คลัง', value: '(ไม่มีที่เลือก)', remove: () => { checkAllCB(fwhEl); renderPay(); } });
    else chkWh.forEach(v => tags.push({ label: 'คลัง', value: v, remove: () => { uncheckCB(fwhEl, v); renderPay(); } }));
  }
  const fdateFrom = document.getElementById('p-fdate-from')?.value;
  const fdateTo   = document.getElementById('p-fdate-to')?.value;
  if (fdateFrom) tags.push({ label: 'ตั้งแต่', value: fdateFrom, remove: () => { document.getElementById('p-fdate-from').value = ''; renderPay(); } });
  if (fdateTo)   tags.push({ label: 'ถึงวันที่', value: fdateTo,   remove: () => { document.getElementById('p-fdate-to').value   = ''; renderPay(); } });
  const fsearch = document.getElementById('p-fsearch').value;
  if (fsearch) tags.push({ label: 'ค้นหา', value: fsearch, remove: () => { document.getElementById('p-fsearch').value = ''; renderPay(); } });

  buildTagsHTML(container, tags, () => {
    checkAllCB(document.getElementById('p-fb-list'));
    checkAllCB(document.getElementById('p-ft-list'));
    checkAllCB(document.getElementById('p-fc-list'));
    checkAllCB(document.getElementById('p-fwh-list'));
    document.getElementById('p-fsearch').value   = '';
    document.getElementById('p-fdate-from').value = '';
    document.getElementById('p-fdate-to').value   = '';
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
  _fillPayWhFilter();
}

function _fillPayWhFilter() {
  const el = document.getElementById('p-fwh-list');
  if (!el) return;
  const whs = dataCar.length ? uniqVals(dataCar, 'คลังสินค้า').filter(Boolean).sort() : [];
  fillCBList(el, whs, 'pfwh_');
  el.querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderPay));
}

// ── Init Events ──
function initPayTab() {
  document.getElementById('p-fsearch').addEventListener('input', renderPay);
  document.getElementById('p-fdate-from').addEventListener('change', renderPay);
  document.getElementById('p-fdate-to').addEventListener('change', renderPay);
  document.getElementById('p-clr').addEventListener('click', () => {
    checkAllCB(document.getElementById('p-fb-list'));
    checkAllCB(document.getElementById('p-ft-list'));
    checkAllCB(document.getElementById('p-fc-list'));
    checkAllCB(document.getElementById('p-fwh-list'));
    document.getElementById('p-fsearch').value    = '';
    document.getElementById('p-fdate-from').value = '';
    document.getElementById('p-fdate-to').value   = '';
    renderPay();
  });
  // Pay Car Modal close
  document.getElementById('pcm-close').addEventListener('click', () => {
    document.getElementById('pay-car-modal').classList.remove('show');
  });
  document.getElementById('pay-car-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('pay-car-modal'))
      document.getElementById('pay-car-modal').classList.remove('show');
  });
}
