// ============ tabs/car/views.js — Card view, Table view, Filter tags ============

function _renderCarCards(enriched, slotsOrdered, grouped, today, tomorrow) {
  if (!enriched.length) {
    document.getElementById('car-cards').innerHTML = `<div class="ccard-empty"><span class="emoji">🚛</span>ไม่มีข้อมูลรถ — กรุณาโหลดไฟล์ Car.xlsx</div>`;
  } else {
    let html = '';
    slotsOrdered.forEach(slot => {
      const rows  = grouped[slot];
      const whCnt = {};
      rows.forEach(r => { const w = r['คลังสินค้า'] || '(ไม่ระบุ)'; whCnt[w] = (whCnt[w] || 0) + 1; });
      const whChips = Object.entries(whCnt).sort((a,b) => b[1]-a[1])
        .map(([wh,c]) => `<span class="tslot-wh">📦 ${esc(wh)}<span class="tslot-wh-cnt">${c}</span></span>`).join('');
      html += `<div class="tslot"><div class="tslot-hdr"><span class="tslot-time">⏰ ${esc(slot)}</span><span class="tslot-count">${rows.length} คัน</span><span class="tslot-whs"><span class="tslot-whs-lbl">คลังที่เรียกรถ:</span>${whChips}</span></div><div class="tslot-body">`;
      rows.forEach(r => {
        const ag      = r._aging;
        const stuck   = isChecked(r['รถตกค้าง']);
        const inDc    = isChecked(r['รถยังไม่ออกจาก DC']);
        const cardCls = stuck ? 'urgent-stuck' : (ag.maxDays > 30 ? 'urgent' : ag.totalDocs > 0 ? 'has-aging' : '');
        const brDisp  = (r['ชื่อสาขา'] || BR_ABR_MAP[r['ชื่อย่อสาขา']] || r['ชื่อย่อสาขา'] || '(ไม่ระบุสาขา)').replace(/^สาขา\s*/, '');
        const brAbr   = r['ชื่อย่อสาขา'] || '';
        let agingHtml;
        if (ag.totalDocs > 0) {
          const urgCls = ag.maxDays > 30 ? 'urg' : ag.maxDays > 14 ? '' : 'ok';
          const parts  = [];
          if (ag.inDocs  > 0) parts.push(`IN ${ag.inDocs}`);
          if (ag.outDocs > 0) parts.push(`OUT ${ag.outDocs}`);
          agingHtml = `<div class="ccard-aging ${urgCls}" title="เฉพาะสาขา ${esc(brAbr||'-')} ที่คลัง ${esc(r['คลังสินค้า']||'-')}"><span>📑 ${parts.join(' • ')}</span><span class="ccard-aging-max">⏱ ${ag.maxDays} วัน</span></div>`;
        } else {
          agingHtml = `<div class="ccard-aging none">— ไม่มีเอกสารคงค้าง —</div>`;
        }
        let statCls = 'unknown', statTxt = r['สถานะลงคิว'] || '-';
        if (stuck)                                                           { statCls = 'late'; statTxt = '⚠ ตกค้าง'; }
        else if (statTxt.includes('ยังไม่'))                                   statCls = 'pending';
        else if (statTxt.includes('สำเร็จ') || statTxt.includes('เรียบร้อย')) statCls = 'done';
        const dcBadge = inDc ? `<span class="cstat in-dc">🚧 ยังไม่ออก DC</span>` : '';
        const _d = parseCarDate(r['วันที่คิวงาน']);
        let dayBadge = '';
        if (_d) {
          const _d0 = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate());
          if      (sameDate(_d0, today))    dayBadge = '<span class="ccard-day today">วันนี้</span>';
          else if (sameDate(_d0, tomorrow)) dayBadge = '<span class="ccard-day tmr">พรุ่งนี้</span>';
          else dayBadge = `<span class="ccard-day other" title="${esc(r['วันที่คิวงาน']||'')}">${_d0.getDate()}/${_d0.getMonth()+1}</span>`;
        }
        html += `<div class="ccard ${cardCls}" data-brabr="${esc(brAbr)}" data-brname="${esc(r['ชื่อสาขา']||'')}" data-wh="${esc(r['คลังสินค้า']||'')}" title="คลิกเพื่อดูรายละเอียดเอกสารคงค้าง (เฉพาะคลัง ${esc(r['คลังสินค้า']||'-')})">
          <div class="ccard-r1">
            <span class="ccard-wh">${esc(r['คลังสินค้า']||'-')}</span>
            <span class="ccard-br" title="${esc(brDisp)}">${esc(brDisp)}</span>
            ${brAbr ? `<span class="ccard-br-abr">${esc(brAbr)}</span>` : ''}
            ${dayBadge}
          </div>
          <div class="ccard-r2"><span>🚚 ${esc(r['ประเภทรถ']||'-')}</span><span class="sep">•</span><span>${esc(r['ประเภทงาน']||'-')}</span></div>
          <div class="ccard-r2"><span>🔖 ${esc(r['ป้ายทะเบียน']||'-')}</span>${r['ชื่อคนขับ'] ? `<span class="sep">•</span><span class="ccard-driver">👤 ${esc(r['ชื่อคนขับ'])}${r['เบอร์โทร'] ? ` (${esc(r['เบอร์โทร'])})` : ''}</span>` : ''}</div>
          ${agingHtml}
          <div class="ccard-r3"><span class="cstat ${statCls}">${esc(statTxt)}</span>${dcBadge}<span style="opacity:.6;">${esc(r['Vendor Name']||'')}</span></div>
        </div>`;
      });
      html += `</div></div>`;
    });
    document.getElementById('car-cards').innerHTML = html;
  }
  document.getElementById('car-cards').style.display = 'block';
  document.getElementById('car-table').style.display  = 'none';
}

function _renderCarTable(enriched) {
  if (!enriched.length) {
    document.getElementById('car-table').innerHTML = `<div class="ccard-empty"><span class="emoji">🚛</span>ไม่มีข้อมูลรถ — กรุณาโหลดไฟล์ Car.xlsx</div>`;
  } else {
    let html = '<div class="tbl-wrap" style="max-height:none;"><table class="gtbl"><thead><tr><th>ช่วงเวลา</th><th>คลัง</th><th>สาขา</th><th>ประเภทรถ</th><th>ประเภทงาน</th><th>ทะเบียน</th><th>คนขับ</th><th>DOMESTIC</th><th>IMPORTED</th><th>วันค้างสูงสุด</th><th>สถานะ</th></tr></thead><tbody>';
    enriched.forEach(r => {
      const ag      = r._aging;
      const stuck   = isChecked(r['รถตกค้าง']);
      const inDc    = isChecked(r['รถยังไม่ออกจาก DC']);
      const brDisp  = (r['ชื่อสาขา'] || BR_ABR_MAP[r['ชื่อย่อสาขา']] || r['ชื่อย่อสาขา'] || '').replace(/^สาขา\s*/, '');
      let statTxt   = r['สถานะลงคิว'] || '-', statCls = 'unknown';
      if (stuck)                                                             { statCls = 'late'; statTxt = '⚠ ตกค้าง'; }
      else if (statTxt.includes('ยังไม่'))                                   statCls = 'pending';
      else if (statTxt.includes('สำเร็จ') || statTxt.includes('เรียบร้อย')) statCls = 'done';
      const dcBadgeTbl = inDc ? `<span class="cstat in-dc">🚧 ยังไม่ออก DC</span>` : '';
      html += `<tr class="ctbl-row" data-brabr="${esc(r['ชื่อย่อสาขา']||'')}" data-brname="${esc(r['ชื่อสาขา']||'')}" data-wh="${esc(r['คลังสินค้า']||'')}">
        <td style="font-weight:700;color:#7dd3fc;white-space:nowrap;">${esc(r['ช่วงเวลา']||'')}</td>
        <td style="text-align:center;font-weight:700;">${esc(r['คลังสินค้า']||'')}</td>
        <td><span style="font-weight:600;">${esc(brDisp)}</span>${r['ชื่อย่อสาขา'] ? ` <span style="font-size:10px;color:#c4b5fd;">${esc(r['ชื่อย่อสาขา'])}</span>` : ''}</td>
        <td>${esc(r['ประเภทรถ']||'')}</td><td>${esc(r['ประเภทงาน']||'')}</td>
        <td style="font-family:monospace;">${esc(r['ป้ายทะเบียน']||'')}</td>
        <td style="font-size:11px;">${esc(r['ชื่อคนขับ']||'')}</td>
        <td style="text-align:center;">${ag.inDocs  ? `<b style="color:#7dd3fc;">${ag.inDocs}</b>`  : '-'}</td>
        <td style="text-align:center;">${ag.outDocs ? `<b style="color:#fbbf24;">${ag.outDocs}</b>` : '-'}</td>
        <td style="text-align:center;">${ag.maxDays ? db(ag.maxDays) : '-'}</td>
        <td style="white-space:nowrap;"><span class="cstat ${statCls}">${esc(statTxt)}</span>${dcBadgeTbl}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    document.getElementById('car-table').innerHTML = html;
  }
  document.getElementById('car-cards').style.display = 'none';
  document.getElementById('car-table').style.display  = 'block';
}

function renderCarTags() {
  const container = document.getElementById('car-tags');
  if (!container) return;
  const tags  = [];
  const fdate = document.getElementById('c-fdate').value;
  if (fdate && fdate !== 'todaytomorrow') {
    tags.push({ label:'ช่วงวันที่', value: CAR_DATE_LBL[fdate] || fdate, remove: () => { document.getElementById('c-fdate').value = 'todaytomorrow'; renderCar(); } });
  }
  const fields = [
    { id:'c-fwh-list', lbl:'คลัง',       lFn: null },
    { id:'c-fct-list', lbl:'ประเภทรถ',    lFn: null },
    { id:'c-fwk-list', lbl:'ประเภทงาน',   lFn: null },
    { id:'c-fbr-list', lbl:'สาขา',        lFn: v => (BR_ABR_MAP[v] || v).replace(/^สาขา\s*/, '') },
    { id:'c-fst-list', lbl:'สถานะลงคิว',  lFn: null }
  ];
  fields.forEach(({ id, lbl, lFn }) => {
    const el = document.getElementById(id);
    const { chk, isFiltered } = getCBState(el);
    if (isFiltered) {
      if (chk.length === 0) tags.push({ label: lbl, value: '(ไม่มีที่เลือก)', remove: () => { checkAllCB(el); renderCar(); } });
      else chk.forEach(v => tags.push({ label: lbl, value: lFn ? lFn(v) : v, remove: () => { uncheckCB(el, v); renderCar(); } }));
    }
  });
  buildTagsHTML(container, tags, () => {
    document.getElementById('c-fdate').value = 'todaytomorrow';
    ['c-fwh-list','c-fct-list','c-fwk-list','c-fbr-list','c-fst-list'].forEach(id => checkAllCB(document.getElementById(id)));
    renderCar();
  });
}
