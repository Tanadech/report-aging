// ============ modals/car-modal.js ============
// CAR Detail Modal — เปิดเมื่อคลิก card หรือ row ใน CAR tab
// แสดงเอกสาร DOMESTIC (POI IN) + IMPORTED (POI OUT) คงค้างของสาขา

function openCarDetail(brAbr, brFullName, whFilter) {
  if (!brAbr && !brFullName) { alert('ไม่มีข้อมูลสาขา'); return; }
  const norm  = s => String(s == null ? '' : s).trim().toLowerCase();
  const whU   = s => String(s == null ? '' : s).trim().toUpperCase();
  const fullName = brFullName || BR_ABR_MAP[brAbr] || '';
  const dispName = (fullName || brAbr || '(ไม่ระบุ)').replace(/^สาขา\s*/, '');
  const wh   = String(whFilter || '').trim();
  const abrN = norm(brAbr);
  const fullN = norm(fullName);
  const whN  = whU(wh);

  // === POI IN: group by เลขที่เอกสาร POI ===
  const inRows = abrN ? dataIn.filter(r => norm(r['ชื่อย่อสาขา']) === abrN && (!whN || whU(getWH(r)) === whN)) : [];
  const inGrp  = groupBy(inRows, 'เลขที่เอกสาร POI');
  const inDocs = Object.entries(inGrp).map(([doc, rows]) => {
    const wh       = getWH(rows[0]);
    const days     = Math.max(...rows.map(r => num(r['วันคงค้าง'])));
    const onetimes = uniqCount(rows, 'เลขที่ onetime');
    const vendor   = rows[0]['ชื่อผู้จำหน่าย'] || '';
    const zone     = rows[0]['Zone Name'] || '';
    const pal      = palletForRows(rows);
    return { doc, wh, days, onetimes, vendor, zone, lines: rows.length, pal };
  }).sort((a, b) => b.days - a.days);

  // === POI OUT: group by เลขที่เอกสารขอโอน ===
  const outRows = fullN ? dataUot.filter(r => norm(r['ชื่อสาขา']) === fullN && (!whN || whU(r['คลังสินค้า']) === whN)) : [];
  const outGrp  = groupBy(outRows, 'เลขที่เอกสารขอโอน');
  const outDocs = Object.entries(outGrp).map(([doc, rows]) => {
    const days    = Math.max(...rows.map(r => num(r['วันค้างส่ง'])));
    const wh      = rows[0]['คลังสินค้า'] || '';
    const reqDate = rows[0]['วันที่ขอโอน'] || '';
    const skus    = uniqCount(rows, 'รหัสสินค้า');
    const pcs     = rows.reduce((s, r) => s + num(r['จำนวนคงค้างพาเลท']), 0);
    const boxes   = rows.reduce((s, r) => s + num(r['จำนวนคงค้างกล่อง']), 0);
    const sts     = [...new Set(rows.map(r => r['สถานะประมวลผล'] || ''))].filter(Boolean);
    const zone    = rows[0]['Zone ID'] || '';
    return { doc, wh, days, reqDate, skus, pcs, boxes, statuses: sts, zone };
  }).sort((a, b) => b.days - a.days);

  // === Header ===
  document.getElementById('cm-title').textContent = `รายละเอียดเอกสารคงค้าง — ${dispName}${wh ? ` (คลัง ${wh})` : ''}`;
  document.getElementById('cm-sub').textContent   = `${brAbr ? brAbr + ' • ' : ''}${wh ? '🏬 เฉพาะคลัง ' + wh + ' • ' : ''}DOMESTIC: ${inDocs.length} เอกสาร • IMPORTED: ${outDocs.length} เอกสาร`;
  document.getElementById('cm-in-cnt').textContent  = inDocs.length;
  document.getElementById('cm-out-cnt').textContent = outDocs.length;
  document.getElementById('cm-all-cnt').textContent = inDocs.length + outDocs.length;

  // === ALL section (combined, sorted by aging desc) ===
  const allDocs = [
    ...inDocs.map(d  => ({ type: 'dom', doc: d.doc, wh: d.wh, days: d.days, qty: d.onetimes, qtyLbl: 'Onetime', detail: d.vendor, zone: d.zone, lines: d.lines, pal: d.pal })),
    ...outDocs.map(d => ({ type: 'imp', doc: d.doc, wh: d.wh, days: d.days, qty: d.skus,     qtyLbl: 'SKU',     detail: (d.statuses || []).join(', ') || '-', zone: d.zone, pcs: d.pcs, reqDate: d.reqDate }))
  ].sort((a, b) => b.days - a.days);

  let allHtml = '';
  if (!allDocs.length) {
    allHtml = `<div class="modal-empty"><span class="em">📭</span>ไม่มีเอกสารคงค้างของสาขานี้</div>`;
  } else {
    const maxD = Math.max(...allDocs.map(d => d.days));
    allHtml = `<div class="modal-sum">
      <div class="modal-sum-item"><b>${fmtN(allDocs.length)}</b>เอกสารรวม</div>
      <div class="modal-sum-item"><b>${fmtN(inDocs.length)}</b>DOMESTIC</div>
      <div class="modal-sum-item"><b>${fmtN(outDocs.length)}</b>IMPORTED</div>
      <div class="modal-sum-item"><b>${fmtN(maxD)}</b>วันค้างสูงสุด</div>
    </div>
    <table class="mtbl"><thead><tr><th>ประเภท</th><th>เลขที่เอกสาร</th><th>คลัง</th><th style="text-align:center;">วันค้าง</th><th style="text-align:center;">SKU / Onetime</th><th style="text-align:center;">จำนวนพาเลท</th><th>Zone</th><th>รายละเอียด</th></tr></thead><tbody>`;
    allDocs.forEach(d => {
      const typeBadge = d.type === 'dom' ? '<span class="dtag dom">📦 DOMESTIC</span>' : '<span class="dtag imp">🌏 IMPORTED</span>';
      const skuTxt = d.type === 'dom'
        ? `<b style="color:#a78bfa;">${fmtN(d.qty)}</b> <span style="font-size:10px;color:var(--muted);">Onetime</span>`
        : `<b style="color:#7dd3fc;">${fmtN(d.qty)}</b> <span style="font-size:10px;color:var(--muted);">SKU</span>`;
      const palVal = d.type === 'dom' ? (d.pal || 0) : (d.pcs || 0);
      const palTxt = palVal > 0
        ? (d.type === 'dom' ? `<b style="color:#fbbf24;">${fmtN(palVal)}</b>` : `<b style="color:#fbbf24;">${fmtP(palVal)}</b>`)
        : `<span style="color:#475569;">-</span>`;
      const detailHtml = d.type === 'imp' && d.detail !== '-'
        ? (d.detail.split(', ').map(st => `<span class="spill ${statusCls(st)}">${esc(st)}</span>`).join(' '))
        : esc(d.detail || '-');
      allHtml += `<tr>
        <td>${typeBadge}</td>
        <td class="mdoc">${esc(d.doc)}</td>
        <td style="text-align:center;font-weight:700;">${esc(d.wh)}</td>
        <td style="text-align:center;">${db(d.days)}</td>
        <td style="text-align:center;font-size:11px;white-space:nowrap;">${skuTxt}</td>
        <td style="text-align:center;font-size:11px;">${palTxt}</td>
        <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;" title="${esc(d.zone)}">${esc(d.zone)}</td>
        <td style="font-size:11px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${(d.detail || '').replace(/"/g, '&quot;')}">${detailHtml}</td>
      </tr>`;
    });
    allHtml += '</tbody></table>';
  }
  document.getElementById('cm-sec-all').innerHTML = allHtml;

  // === DOMESTIC section ===
  let inHtml = '';
  if (!inDocs.length) {
    inHtml = `<div class="modal-empty"><span class="em">📭</span>ไม่มีเอกสาร DOMESTIC คงค้างของสาขานี้</div>`;
  } else {
    const totalLines   = inRows.length;
    const totalOnetime = uniqCount(inRows, 'เลขที่ onetime');
    const maxD         = Math.max(...inDocs.map(d => d.days));
    inHtml = `<div class="modal-sum">
      <div class="modal-sum-item"><b>${fmtN(inDocs.length)}</b>เอกสาร</div>
      <div class="modal-sum-item"><b>${fmtN(totalOnetime)}</b>Onetime</div>
      <div class="modal-sum-item"><b>${fmtN(totalLines)}</b>บรรทัด</div>
      <div class="modal-sum-item"><b>${fmtN(inDocs.reduce((s, d) => s + (d.pal || 0), 0))}</b>พาเลท</div>
      <div class="modal-sum-item"><b>${fmtN(maxD)}</b>วันค้างสูงสุด</div>
    </div>
    <table class="mtbl"><thead><tr><th>เลขที่เอกสาร POI</th><th>คลัง</th><th style="text-align:center;">วันคงค้าง</th><th style="text-align:center;">Onetime</th><th style="text-align:center;">จำนวนพาเลท</th><th style="text-align:center;">จำนวน (บรรทัด)</th><th>Zone</th><th>ผู้จำหน่าย</th></tr></thead><tbody>`;
    inDocs.forEach(d => {
      inHtml += `<tr>
        <td class="mdoc">${esc(d.doc)}</td>
        <td style="text-align:center;font-weight:700;">${esc(d.wh)}</td>
        <td style="text-align:center;">${db(d.days)}</td>
        <td style="text-align:center;">${fmtN(d.onetimes)}</td>
        <td style="text-align:center;">${d.pal > 0 ? `<b style="color:#fbbf24;">${fmtN(d.pal)}</b>` : '<span style="color:#475569;">-</span>'}</td>
        <td style="text-align:center;">${fmtN(d.lines)}</td>
        <td>${esc(d.zone)}</td>
        <td style="font-size:11px;">${esc(d.vendor)}</td>
      </tr>`;
    });
    inHtml += '</tbody></table>';
  }
  document.getElementById('cm-sec-in').innerHTML = inHtml;

  // === POI OUT section ===
  let outHtml = '';
  if (!outDocs.length) {
    outHtml = `<div class="modal-empty"><span class="em">📭</span>ไม่มีเอกสาร IMPORTED คงค้างของสาขานี้</div>`;
  } else {
    const totalSku = uniqCount(outRows, 'รหัสสินค้า');
    const totalPcs = outRows.reduce((s, r) => s + num(r['จำนวนคงค้างพาเลท']), 0);
    const maxD     = Math.max(...outDocs.map(d => d.days));
    outHtml = `<div class="modal-sum">
      <div class="modal-sum-item"><b>${fmtN(outDocs.length)}</b>เอกสาร</div>
      <div class="modal-sum-item"><b>${fmtN(totalSku)}</b>SKU</div>
      <div class="modal-sum-item"><b>${fmtP(totalPcs)}</b>พาเลท</div>
      <div class="modal-sum-item"><b>${fmtN(maxD)}</b>วันค้างสูงสุด</div>
    </div>
    <table class="mtbl"><thead><tr><th>เลขที่เอกสารขอโอน</th><th>วันที่ขอโอน</th><th>คลัง</th><th style="text-align:center;">วันค้าง</th><th style="text-align:center;">SKU</th><th style="text-align:right;">พาเลท</th><th style="text-align:right;">กล่อง</th><th>สถานะประมวลผล</th><th>Zone</th></tr></thead><tbody>`;
    outDocs.forEach(d => {
      const pillsHtml = d.statuses.map(st => `<span class="spill ${statusCls(st)}">${esc(st)}</span>`).join(' ');
      outHtml += `<tr>
        <td class="mdoc">${esc(d.doc)}</td>
        <td style="font-size:11px;color:var(--muted);white-space:nowrap;">${esc(d.reqDate)}</td>
        <td style="text-align:center;font-weight:700;">${esc(d.wh)}</td>
        <td style="text-align:center;">${db(d.days)}</td>
        <td style="text-align:center;">${fmtN(d.skus)}</td>
        <td style="text-align:right;font-weight:600;">${fmtP(d.pcs)}</td>
        <td style="text-align:right;">${fmtN(d.boxes)}</td>
        <td>${pillsHtml || '-'}</td>
        <td>${esc(d.zone)}</td>
      </tr>`;
    });
    outHtml += '</tbody></table>';
  }
  document.getElementById('cm-sec-out').innerHTML = outHtml;

  // Default tab: "ทั้งหมด"
  document.querySelectorAll('.mtab').forEach(b => b.classList.toggle('act', b.dataset.mtab === 'all'));
  document.querySelectorAll('.modal-section').forEach(s => s.classList.remove('act'));
  document.getElementById('cm-sec-all').classList.add('act');

  document.getElementById('car-modal').classList.add('show');
}

function closeCarDetail() { document.getElementById('car-modal').classList.remove('show'); }

document.getElementById('cm-close').addEventListener('click', closeCarDetail);
document.getElementById('car-modal').addEventListener('click', e => { if (e.target.id === 'car-modal') closeCarDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('car-modal').classList.contains('show')) closeCarDetail(); });

document.querySelectorAll('.mtab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mtab').forEach(x => x.classList.remove('act'));
  b.classList.add('act');
  document.querySelectorAll('.modal-section').forEach(s => s.classList.remove('act'));
  document.getElementById('cm-sec-' + b.dataset.mtab).classList.add('act');
}));

// Delegated click: card หรือ table row → เปิด modal
['car-cards', 'car-table'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', e => {
    const target = e.target.closest('[data-brabr],[data-brname]');
    if (!target) return;
    const abr   = target.getAttribute('data-brabr')  || '';
    const fname = target.getAttribute('data-brname') || '';
    const wh    = target.getAttribute('data-wh')     || '';
    if (!abr && !fname) return;
    openCarDetail(abr, fname, wh);
  });
});
