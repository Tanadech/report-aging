// ============ tabs/car.js — คิวรถ OUTBOUND Tab ============

const CAR_DATE_LBL = { 'today':'วันนี้','tomorrow':'พรุ่งนี้','todaytomorrow':'วันนี้ + พรุ่งนี้','week':'7 วันข้างหน้า' };

// ── Date helpers ──
function parseCarDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return null;
  let y = parseInt(m[3]);
  if (y < 100) y += (y > 50 ? 2500 : 2600);
  if (y > 2400) y -= 543;
  const dt = new Date(y, parseInt(m[2])-1, parseInt(m[1]));
  return isNaN(dt) ? null : dt;
}

function sameDate(a, b) {
  return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function timeSlotStart(slot) {
  const m = String(slot||'').match(/^(\d{1,2})[\.:](\d{2})/);
  return m ? parseInt(m[1])*60+parseInt(m[2]) : 99999;
}

function isChecked(v) {
  const s = String(v||'').toLowerCase();
  return s==='checked'||s==='true'||s==='1'||s==='✓'||s==='x';
}

// ── Aging join: POI IN + POI OUT เฉพาะสาขา + คลัง ──
function getAgingForBranch(brAbr, brFullName, whFilter) {
  const norm = s => String(s==null?'':s).trim().toLowerCase();
  const whU  = s => String(s==null?'':s).trim().toUpperCase();
  const abrN = norm(brAbr);
  const whN  = whU(whFilter);
  const fullNameRaw = String(brFullName||'').trim() || BR_ABR_MAP[String(brAbr||'').trim()] || '';
  const fullN = norm(fullNameRaw);

  const inRows  = abrN ? dataIn.filter(r => norm(r['ชื่อย่อสาขา'])===abrN && (!whN||whU(getWH(r))===whN)) : [];
  const outRows = fullN ? dataUot.filter(r => norm(r['ชื่อสาขา'])===fullN && (!whN||whU(r['คลังสินค้า'])===whN)) : [];

  const inDocs  = uniqCount(inRows,'เลขที่เอกสาร POI');
  const inMax   = inRows.length  ? Math.max(...inRows.map(r=>num(r['วันคงค้าง'])))  : 0;
  const outDocs = uniqCount(outRows,'เลขที่เอกสารขอโอน');
  const outMax  = outRows.length ? Math.max(...outRows.map(r=>num(r['วันค้างส่ง']))) : 0;
  return { inDocs, inMax, outDocs, outMax, totalDocs:inDocs+outDocs, maxDays:Math.max(inMax,outMax) };
}

// ── Filter ──
function getCarFiltered() {
  const fdate = document.getElementById('c-fdate').value;
  const fwhCB = checkedVals(document.getElementById('c-fwh-list'));
  const fctCB = checkedVals(document.getElementById('c-fct-list'));
  const fwkCB = checkedVals(document.getElementById('c-fwk-list'));
  const fbrCB = checkedVals(document.getElementById('c-fbr-list'));
  const fstCB = checkedVals(document.getElementById('c-fst-list'));
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const weekEnd  = new Date(today); weekEnd.setDate(today.getDate()+7);

  return dataCar.filter(r => {
    if (fdate) {
      const d  = parseCarDate(r['วันที่คิวงาน']); if (!d) return false;
      const d0 = new Date(d.getFullYear(),d.getMonth(),d.getDate());
      if (fdate==='today'         && !sameDate(d0,today))    return false;
      if (fdate==='tomorrow'      && !sameDate(d0,tomorrow)) return false;
      if (fdate==='todaytomorrow' && !sameDate(d0,today) && !sameDate(d0,tomorrow)) return false;
      if (fdate==='week'          && (d0<today||d0>weekEnd)) return false;
    }
    if (fwhCB.length && !fwhCB.includes(r['คลังสินค้า']))                   return false;
    if (fctCB.length && !fctCB.includes(r['ประเภทรถ']))                      return false;
    if (fwkCB.length && !fwkCB.includes(r['ประเภทงาน']))                     return false;
    if (fbrCB.length && !fbrCB.includes(r['ชื่อย่อสาขา']))                   return false;
    if (fstCB.length && !fstCB.includes(r['สถานะลงคิว']||'(ไม่ระบุ)'))      return false;
    return true;
  });
}

// ── Rebuild filters (เรียกตอนโหลดไฟล์รถ) ──
function rebuildCar() {
  [['c-fwh-list','คลังสินค้า','cfwh_',null],
   ['c-fct-list','ประเภทรถ',  'cfct_',null],
   ['c-fwk-list','ประเภทงาน', 'cfwk_',null],
   ['c-fbr-list','ชื่อย่อสาขา','cfbr_',v=>BR_ABR_MAP[v]||v]
  ].forEach(([id, col, pfx, lFn]) => {
    fillCBList(document.getElementById(id), uniqVals(dataCar, col), pfx, lFn);
    document.getElementById(id).querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderCar));
  });
  const stVals = [...new Set(dataCar.map(r=>r['สถานะลงคิว']||'(ไม่ระบุ)'))].sort();
  fillCBList(document.getElementById('c-fst-list'), stVals, 'cfst_');
  document.getElementById('c-fst-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderCar));
}

// ── Render ──
function renderCar() {
  let f = getCarFiltered();
  const fdateEl = document.getElementById('c-fdate');

  // Smart fallback: ถ้า filter 'วันนี้+พรุ่งนี้' ไม่พบ → switch เป็น ทั้งหมด
  if (!f.length && dataCar.length && fdateEl.value==='todaytomorrow') {
    fdateEl.value = '';
    f = getCarFiltered();
    if (f.length) {
      const tagsEl = document.getElementById('car-tags');
      if (tagsEl) {
        const dates = [...new Set(dataCar.map(r=>{const d=parseCarDate(r['วันที่คิวงาน']);return d?d.toLocaleDateString('th-TH'):'';}).filter(Boolean))].sort();
        const dateStr = dates.slice(0,3).join(', ')+(dates.length>3?'...':'');
        tagsEl.classList.remove('hidden');
        tagsEl.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:7px;font-size:12px;color:#fbbf24;width:100%;">
          <span style="font-size:16px;">⚠</span>
          <span>ไม่พบรถวันนี้/พรุ่งนี้ — แสดงข้อมูลทั้งหมด (${fmtN(dataCar.length)} คัน) จากวันที่ <b style="color:#fcd34d;">${esc(dateStr)}</b></span>
          <button style="margin-left:auto;padding:4px 10px;background:rgba(245,158,11,.2);border:1px solid rgba(245,158,11,.4);border-radius:5px;color:#fbbf24;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;" onclick="document.getElementById('c-fdate').value='todaytomorrow';renderCar();">↺ กลับไป 'วันนี้+พรุ่งนี้'</button>
        </div>`;
      }
    }
  }

  // KPI
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const inRange  = (rows,tgt) => rows.filter(r=>{ const d=parseCarDate(r['วันที่คิวงาน']); return d&&sameDate(new Date(d.getFullYear(),d.getMonth(),d.getDate()),tgt); });
  const cntBySt  = st => f.filter(r=>(r['สถานะลงคิว']||'').trim()===st).length;

  document.getElementById('car-kpi').innerHTML = `
    <stat-card variant="inf"  data-kpi="today"    label="รถเข้าวันนี้"     value="${fmtN(inRange(dataCar,today).length)}"    unit="คัน"></stat-card>
    <stat-card                data-kpi="tomorrow" label="รถเข้าพรุ่งนี้"   value="${fmtN(inRange(dataCar,tomorrow).length)}" unit="คัน"></stat-card>
    <stat-card variant="inf"  data-kpi="view"     label="รถในมุมมอง"       value="${fmtN(f.length)}"                        unit="คัน"></stat-card>
    <stat-card variant="ok"   data-kpi="wh"       label="คลังที่ต้องเตรียม" value="${fmtN(uniqCount(f,'คลังสินค้า'))}"      unit="คลัง"></stat-card>
    <stat-card variant="ok"   data-kpi="early"    label="มาก่อนเวลา"       value="${fmtN(cntBySt('มาก่อนเวลา'))}"          unit="คัน"></stat-card>
    <stat-card variant="warn" data-kpi="late"     label="มาหลังเวลานัด"     value="${fmtN(cntBySt('มาหลังเวลานัด'))}"      unit="คัน"></stat-card>
    <stat-card variant="alr"  data-kpi="cancel"   label="ยกเลิกรับงาน"     value="${fmtN(cntBySt('ยกเลิกรับงาน'))}"       unit="คัน"></stat-card>
    <stat-card                data-kpi="notqueue" label="ยังไม่มาลงคิว"     value="${fmtN(cntBySt('ยังไม่มาลงคิว'))}"      unit="คัน"></stat-card>
    <stat-card variant="alr"  data-kpi="stuck"    label="รถตกค้าง"         value="${fmtN(f.filter(r=>isChecked(r['รถตกค้าง'])).length)}"            unit="คัน"></stat-card>
    <stat-card variant="warn" data-kpi="notout"   label="ยังไม่ออก DC"     value="${fmtN(f.filter(r=>isChecked(r['รถยังไม่ออกจาก DC'])).length)}"   unit="คัน"></stat-card>
  `;
  // ต้อง set data-kpi ให้ stat-card ทุกตัวด้วย (attributeChangedCallback ไม่รู้จัก data-kpi)
  document.querySelectorAll('#car-kpi stat-card[data-kpi]').forEach(el => { el.dataset.kpi = el.getAttribute('data-kpi'); });

  // Timeline chart
  const slots  = [...new Set(f.map(r=>r['ช่วงเวลา']||'').filter(Boolean))].sort((a,b)=>timeSlotStart(a)-timeSlotStart(b));
  const whKeys = [...new Set(f.map(r=>r['คลังสินค้า']||'').filter(Boolean))].sort();
  const wPal   = ['#22d3ee','#10b981','#a78bfa','#fb923c','#f87171','#3b82f6','#fbbf24'];
  mkChart('c-c1','bar',{
    labels:slots,
    datasets:whKeys.map((wh,i)=>({
      label:wh, backgroundColor:wPal[i%wPal.length], borderRadius:4, borderWidth:0,
      data:slots.map(s=>f.filter(r=>r['ช่วงเวลา']===s&&r['คลังสินค้า']===wh).length)
    }))
  },{
    plugins:{
      legend:{position:'bottom',labels:{font:{size:11},boxWidth:10,padding:8}},
      datalabels:{anchor:'center',align:'center',font:{size:11,weight:'bold'},color:'#fff',formatter:v=>v>0?v:'',display:ctx=>ctx.dataset.data[ctx.dataIndex]>0}
    },
    scales:{
      x:{stacked:true,ticks:{font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}},
      y:{stacked:true,beginAtZero:true,ticks:{stepSize:1,font:{size:10}},grid:{color:'rgba(255,255,255,.05)'},title:{display:true,text:'จำนวนรถ',font:{size:10}}}
    }
  });

  // Enrich + sort
  const enriched = f.map(r=>({...r,_slot:timeSlotStart(r['ช่วงเวลา']||''),_aging:getAgingForBranch(r['ชื่อย่อสาขา']||'',r['ชื่อสาขา']||'',r['คลังสินค้า']||'')}));
  enriched.sort((a,b)=>a._slot!==b._slot?a._slot-b._slot:(b._aging.maxDays||0)-(a._aging.maxDays||0));
  const grouped = {};
  enriched.forEach(r=>{ const k=r['ช่วงเวลา']||'(ไม่ระบุเวลา)'; (grouped[k]=grouped[k]||[]).push(r); });
  const slotsOrdered = Object.keys(grouped).sort((a,b)=>timeSlotStart(a)-timeSlotStart(b));

  if (carView === 'card') {
    _renderCarCards(enriched, slotsOrdered, grouped, today, tomorrow);
  } else {
    _renderCarTable(enriched);
  }
  renderCarTags();
}

function _renderCarCards(enriched, slotsOrdered, grouped, today, tomorrow) {
  if (!enriched.length) {
    document.getElementById('car-cards').innerHTML = `<div class="ccard-empty"><span class="emoji">🚛</span>ไม่มีข้อมูลรถ — กรุณาโหลดไฟล์ Car.xlsx</div>`;
  } else {
    let html = '';
    slotsOrdered.forEach(slot => {
      const rows = grouped[slot];
      const whCnt = {};
      rows.forEach(r=>{ const w=r['คลังสินค้า']||'(ไม่ระบุ)'; whCnt[w]=(whCnt[w]||0)+1; });
      const whChips = Object.entries(whCnt).sort((a,b)=>b[1]-a[1]).map(([wh,c])=>`<span class="tslot-wh">📦 ${esc(wh)}<span class="tslot-wh-cnt">${c}</span></span>`).join('');
      html += `<div class="tslot"><div class="tslot-hdr"><span class="tslot-time">⏰ ${esc(slot)}</span><span class="tslot-count">${rows.length} คัน</span><span class="tslot-whs"><span class="tslot-whs-lbl">คลังที่เรียกรถ:</span>${whChips}</span></div><div class="tslot-body">`;
      rows.forEach(r => {
        const ag      = r._aging;
        const stuck   = isChecked(r['รถตกค้าง']);
        const inDc    = isChecked(r['รถยังไม่ออกจาก DC']);
        const cardCls = stuck?'urgent-stuck':(ag.maxDays>30?'urgent':ag.totalDocs>0?'has-aging':'');
        const brDisp  = (r['ชื่อสาขา']||BR_ABR_MAP[r['ชื่อย่อสาขา']]||r['ชื่อย่อสาขา']||'(ไม่ระบุสาขา)').replace(/^สาขา\s*/,'');
        const brAbr   = r['ชื่อย่อสาขา']||'';
        let agingHtml;
        if (ag.totalDocs > 0) {
          const urgCls = ag.maxDays>30?'urg':ag.maxDays>14?'':'ok';
          const parts  = [];
          if (ag.inDocs>0)  parts.push(`IN ${ag.inDocs}`);
          if (ag.outDocs>0) parts.push(`OUT ${ag.outDocs}`);
          agingHtml = `<div class="ccard-aging ${urgCls}" title="เฉพาะสาขา ${esc(brAbr||'-')} ที่คลัง ${esc(r['คลังสินค้า']||'-')}"><span>📑 ${parts.join(' • ')}</span><span class="ccard-aging-max">⏱ ${ag.maxDays} วัน</span></div>`;
        } else {
          agingHtml = `<div class="ccard-aging none">— ไม่มีเอกสารคงค้าง —</div>`;
        }
        let statCls='unknown', statTxt=r['สถานะลงคิว']||'-';
        if (stuck)                                                    { statCls='late'; statTxt='⚠ ตกค้าง'; }
        else if (inDc)                                                { statCls='late'; statTxt='🚧 ยังไม่ออก DC'; }
        else if (statTxt.includes('ยังไม่'))                          statCls='pending';
        else if (statTxt.includes('สำเร็จ')||statTxt.includes('เรียบร้อย')) statCls='done';
        const _d = parseCarDate(r['วันที่คิวงาน']);
        let dayBadge = '';
        if (_d) {
          const _d0 = new Date(_d.getFullYear(),_d.getMonth(),_d.getDate());
          if (sameDate(_d0,today))    dayBadge='<span class="ccard-day today">วันนี้</span>';
          else if (sameDate(_d0,tomorrow)) dayBadge='<span class="ccard-day tmr">พรุ่งนี้</span>';
          else dayBadge=`<span class="ccard-day other" title="${esc(r['วันที่คิวงาน']||'')}">${_d0.getDate()}/${_d0.getMonth()+1}</span>`;
        }
        html += `<div class="ccard ${cardCls}" data-brabr="${esc(brAbr)}" data-brname="${esc(r['ชื่อสาขา']||'')}" data-wh="${esc(r['คลังสินค้า']||'')}" title="คลิกเพื่อดูรายละเอียดเอกสารคงค้าง (เฉพาะคลัง ${esc(r['คลังสินค้า']||'-')})">
          <div class="ccard-r1">
            <span class="ccard-wh">${esc(r['คลังสินค้า']||'-')}</span>
            <span class="ccard-br" title="${esc(brDisp)}">${esc(brDisp)}</span>
            ${brAbr?`<span class="ccard-br-abr">${esc(brAbr)}</span>`:''}
            ${dayBadge}
          </div>
          <div class="ccard-r2"><span>🚚 ${esc(r['ประเภทรถ']||'-')}</span><span class="sep">•</span><span>${esc(r['ประเภทงาน']||'-')}</span></div>
          <div class="ccard-r2"><span>🔖 ${esc(r['ป้ายทะเบียน']||'-')}</span>${r['ชื่อคนขับ']?`<span class="sep">•</span><span class="ccard-driver">👤 ${esc(r['ชื่อคนขับ'])}${r['เบอร์โทร']?` (${esc(r['เบอร์โทร'])})`:''}</span>`:''}</div>
          ${agingHtml}
          <div class="ccard-r3"><span class="cstat ${statCls}">${esc(statTxt)}</span><span style="opacity:.6;">${esc(r['Vendor Name']||'')}</span></div>
        </div>`;
      });
      html += `</div></div>`;
    });
    document.getElementById('car-cards').innerHTML = html;
  }
  document.getElementById('car-cards').style.display = 'block';
  document.getElementById('car-table').style.display = 'none';
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
      const brDisp  = (r['ชื่อสาขา']||BR_ABR_MAP[r['ชื่อย่อสาขา']]||r['ชื่อย่อสาขา']||'').replace(/^สาขา\s*/,'');
      let statTxt   = r['สถานะลงคิว']||'-', statCls='unknown';
      if (stuck)  { statCls='late'; statTxt='⚠ ตกค้าง'; }
      else if (inDc) { statCls='late'; statTxt='🚧 ยังไม่ออก DC'; }
      else if (statTxt.includes('ยังไม่')) statCls='pending';
      else if (statTxt.includes('สำเร็จ')||statTxt.includes('เรียบร้อย')) statCls='done';
      html += `<tr class="ctbl-row" data-brabr="${esc(r['ชื่อย่อสาขา']||'')}" data-brname="${esc(r['ชื่อสาขา']||'')}" data-wh="${esc(r['คลังสินค้า']||'')}">
        <td style="font-weight:700;color:#7dd3fc;white-space:nowrap;">${esc(r['ช่วงเวลา']||'')}</td>
        <td style="text-align:center;font-weight:700;">${esc(r['คลังสินค้า']||'')}</td>
        <td><span style="font-weight:600;">${esc(brDisp)}</span>${r['ชื่อย่อสาขา']?` <span style="font-size:10px;color:#c4b5fd;">${esc(r['ชื่อย่อสาขา'])}</span>`:''}</td>
        <td>${esc(r['ประเภทรถ']||'')}</td><td>${esc(r['ประเภทงาน']||'')}</td>
        <td style="font-family:monospace;">${esc(r['ป้ายทะเบียน']||'')}</td>
        <td style="font-size:11px;">${esc(r['ชื่อคนขับ']||'')}</td>
        <td style="text-align:center;">${ag.inDocs?`<b style="color:#7dd3fc;">${ag.inDocs}</b>`:'-'}</td>
        <td style="text-align:center;">${ag.outDocs?`<b style="color:#fbbf24;">${ag.outDocs}</b>`:'-'}</td>
        <td style="text-align:center;">${ag.maxDays?db(ag.maxDays):'-'}</td>
        <td><span class="cstat ${statCls}">${esc(statTxt)}</span></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    document.getElementById('car-table').innerHTML = html;
  }
  document.getElementById('car-cards').style.display = 'none';
  document.getElementById('car-table').style.display = 'block';
}

// ── Filter Tags ──
function renderCarTags() {
  const container = document.getElementById('car-tags');
  if (!container) return;
  const tags = [];
  const fdate = document.getElementById('c-fdate').value;
  if (fdate && fdate!=='todaytomorrow') {
    tags.push({label:'ช่วงวันที่', value:CAR_DATE_LBL[fdate]||fdate, remove:()=>{ document.getElementById('c-fdate').value='todaytomorrow'; renderCar(); }});
  }
  const fields = [
    {id:'c-fwh-list',lbl:'คลัง',      lFn:null},
    {id:'c-fct-list',lbl:'ประเภทรถ',   lFn:null},
    {id:'c-fwk-list',lbl:'ประเภทงาน',  lFn:null},
    {id:'c-fbr-list',lbl:'สาขา',       lFn:v=>(BR_ABR_MAP[v]||v).replace(/^สาขา\s*/,'')},
    {id:'c-fst-list',lbl:'สถานะลงคิว', lFn:null}
  ];
  fields.forEach(({id,lbl,lFn}) => {
    const el = document.getElementById(id);
    const {chk,isFiltered} = getCBState(el);
    if (isFiltered) {
      if (chk.length===0) tags.push({label:lbl, value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(el); renderCar(); }});
      else chk.forEach(v=>tags.push({label:lbl, value:lFn?lFn(v):v, remove:()=>{ uncheckCB(el,v); renderCar(); }}));
    }
  });
  buildTagsHTML(container, tags, ()=>{
    document.getElementById('c-fdate').value='todaytomorrow';
    ['c-fwh-list','c-fct-list','c-fwk-list','c-fbr-list','c-fst-list'].forEach(id=>checkAllCB(document.getElementById(id)));
    renderCar();
  });
}
