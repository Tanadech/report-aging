// ============ tabs/uot.js — IMPORTED (ต่างประเทศ) Tab ============

const UOT_PAGE_SIZE = 50;
let uotFiltered = [], uotPage = 0;

// ── Filter ──
function getUotFiltered() {
  const fzCB  = checkedVals(document.getElementById('u-fz-list'));
  const fd1   = num(document.getElementById('u-fd1').value) || 0;
  const fd2   = num(document.getElementById('u-fd2').value) || Infinity;
  const fdate = num(document.getElementById('u-fdate').value) || 0;
  const fbCB  = checkedVals(document.getElementById('u-fb-list'));
  const fsCB  = checkedVals(document.getElementById('u-fs-list'));
  const fw    = document.getElementById('u-fw').value;
  const now   = new Date();

  return dataUot.filter(r => {
    if (fzCB.length && !fzCB.includes(r['Zone ID'])) return false;
    const d = num(r['วันค้างส่ง']);
    if (fd1 > 0 && d < fd1) return false;
    if (fd2 < Infinity && d > fd2) return false;
    if (fbCB.length && !fbCB.includes(r['ชื่อสาขา'])) return false;
    if (fsCB.length && !fsCB.includes(r['สถานะประมวลผล'])) return false;
    if (fw && r['คลังสินค้า'] !== fw) return false;
    if (fdate > 0) {
      const dtStr = r['วันที่ขอโอน'] || '';
      const parts = dtStr.split('/');
      if (parts.length === 3) {
        const y  = parseInt(parts[2]) > 2500 ? parseInt(parts[2]) - 543 : parseInt(parts[2]);
        const dt = new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]));
        if ((now - dt) / 86400000 > fdate) return false;
      }
    }
    return true;
  });
}

// ── Render all (KPI + Charts + Table) ──
function renderUot() {
  uotFiltered = getUotFiltered();
  uotPage = 0;

  const docs     = uniqCount(uotFiltered, 'เลขที่เอกสารขอโอน');
  const prods    = uniqCount(uotFiltered, 'รหัสสินค้า');
  const branches = uniqCount(uotFiltered, 'ชื่อสาขา');
  const zones    = uniqCount(uotFiltered, 'Zone ID');
  const pcs      = uotFiltered.reduce((s, r) => s + num(r['จำนวนคงค้างพาเลท']), 0);
  const boxUnit  = uotFiltered.reduce((s, r) => s + num(r['จำนวนต่อกล่อง']), 0);
  const days     = uotFiltered.map(r => num(r['วันค้างส่ง']));
  const mx       = days.length ? Math.max(...days) : 0;
  const over30   = uotFiltered.filter(r => num(r['วันค้างส่ง']) > 30).length;
  const pct30    = uotFiltered.length ? (over30 / uotFiltered.length * 100).toFixed(1) : '0.0';

  document.getElementById('uot-kpi').innerHTML = `
    <stat-card variant="inf"  label="จำนวนโซนที่แสดง"      value="${fmtN(zones)}"   unit="Zone"></stat-card>
    <stat-card                label="จำนวนสินค้ารวม"        value="${fmtN(prods)}"   unit="รหัส SKU"></stat-card>
    <stat-card                label="เลขที่เอกสารคงค้าง"    value="${fmtN(docs)}"    unit="เอกสาร"></stat-card>
    <stat-card variant="ok"   label="สาขาที่รอจ่าย"         value="${fmtN(branches)}" unit="สาขา"></stat-card>
    <stat-card variant="warn" label="วันคงค้างสูงสุด"       value="${fmtN(mx)}"      unit="วัน"></stat-card>
    <stat-card variant="alr"  label="ค้างส่ง &gt; 30 วัน"  value="${fmtN(over30)}"  unit="${pct30}% ของทั้งหมด"></stat-card>
    <stat-card                label="จำนวนคงค้างพาเลทรวม"  value="${fmtP(pcs)}"     unit="พาเลท"></stat-card>
    <stat-card                label="จำนวนต่อกล่อง (รวม)"  value="${fmtN(boxUnit)}" unit="หน่วย"></stat-card>
  `;

  // Pie 1: ขอโอน vs โอนออก
  const totalReq = uotFiltered.reduce((s, r) => s + num(r['จำนวนขอโอน']), 0);
  const totalOut = uotFiltered.reduce((s, r) => s + num(r['จำนวนโอนออก']), 0);
  mkChart('u-pie1', 'doughnut', {
    labels: ['จำนวนขอโอน', 'จำนวนโอนออก'],
    datasets: [{ data:[totalReq,totalOut], backgroundColor:['#22d3ee','#10b981'], borderWidth:2, borderColor:'rgba(6,16,30,.8)', hoverOffset:6 }]
  }, {
    plugins: {
      legend: { position:'bottom', labels:{ font:{size:10}, boxWidth:10, padding:8 } },
      datalabels: { color:'#fff', font:{size:11,weight:'bold'}, formatter:v=>fmtN(v), anchor:'center', align:'center', display:ctx=>ctx.dataset.data[ctx.dataIndex]>0 }
    }, cutout:'55%'
  });

  // Pie 2: สถานะ / SKU
  const byStatus = groupBy(uotFiltered, 'สถานะประมวลผล');
  const statEnt  = Object.entries(byStatus).map(([k,v]) => [k, uniqCount(v,'รหัสสินค้า')]).sort((a,b) => b[1]-a[1]);
  mkChart('u-pie2', 'doughnut', {
    labels: statEnt.map(e => e[0]),
    datasets: [{ data:statEnt.map(e=>e[1]), backgroundColor:statEnt.map(e=>statusCol(e[0])), borderWidth:2, borderColor:'rgba(6,16,30,.8)', hoverOffset:6 }]
  }, {
    plugins: {
      legend: { position:'bottom', labels:{ font:{size:10}, boxWidth:10, padding:6 } },
      datalabels: { color:'#fff', font:{size:10,weight:'bold'}, formatter:v=>fmtN(v), anchor:'center', align:'center', display:ctx=>ctx.dataset.data[ctx.dataIndex]>0 }
    }, cutout:'55%'
  });

  // Bar 1: Top 5 สาขา
  const brData = _rankBranches(uotFiltered);
  mkChart('u-c2', 'bar', {
    labels: brData.map(d => d.name),
    datasets: [
      { label:'วันค้างสูงสุด',    data:brData.map(d=>d.max),                    backgroundColor:'#22d3ee', borderRadius:3 },
      { label:'จำนวนเอกสารค้าง', data:brData.map(d=>d.docs),                   backgroundColor:'#10b981', borderRadius:3 },
      { label:'จำนวนสินค้า',     data:brData.map(d=>d.skus),                   backgroundColor:'#a78bfa', borderRadius:3 },
      { label:'พาเลทคงค้าง',     data:brData.map(d=>+d.pal.toFixed(2)),        backgroundColor:'#fbbf24', borderRadius:3 }
    ]
  }, {
    plugins: {
      legend: { position:'bottom', labels:{ font:{size:10}, boxWidth:10, padding:6 } },
      datalabels: { anchor:'end', align:'top', font:{size:9,weight:'bold'}, formatter:(v,ctx)=>v>0?(ctx.datasetIndex===3?fmtP(v):fmtN(v)):'', color:'#e2e8f0' }
    },
    scales: { y:{ beginAtZero:true, ticks:{stepSize:50,font:{size:9}}, grid:{color:'rgba(255,255,255,.05)'} }, x:{ ticks:{font:{size:10}} } }
  });

  // Bar 2: ช่วงเวลา
  const timeBuckets = [
    {lbl:'1-3 วัน',min:1,max:3},{lbl:'4-7 วัน',min:4,max:7},{lbl:'8-14 วัน',min:8,max:14},
    {lbl:'15-21 วัน',min:15,max:21},{lbl:'22-30 วัน',min:22,max:30},{lbl:'> 30 วัน',min:31,max:99999}
  ];
  const tb3 = timeBuckets.map(b => {
    const rows = uotFiltered.filter(r => { const d=num(r['วันค้างส่ง']); return d>=b.min&&d<=b.max; });
    return { lbl:b.lbl, skus:uniqCount(rows,'รหัสสินค้า'), docs:uniqCount(rows,'เลขที่เอกสารขอโอน'), branches:uniqCount(rows,'ชื่อสาขา') };
  });
  mkChart('u-c3', 'bar', {
    labels: tb3.map(b => b.lbl),
    datasets: [
      { label:'จำนวนรหัสสินค้า', data:tb3.map(b=>b.skus),     backgroundColor:'#22d3ee', borderRadius:3 },
      { label:'จำนวนเอกสาร',    data:tb3.map(b=>b.docs),     backgroundColor:'#3b82f6', borderRadius:3 },
      { label:'จำนวนสาขาจ่าย', data:tb3.map(b=>b.branches), backgroundColor:'#a78bfa', borderRadius:3 }
    ]
  }, {
    plugins: { legend:{position:'bottom',labels:{font:{size:10},boxWidth:10,padding:6}}, datalabels:{anchor:'end',align:'top',font:{size:9,weight:'bold'},formatter:v=>v>0?fmtN(v):'',color:'#e2e8f0'} },
    scales: { y:{beginAtZero:true,ticks:{stepSize:50,font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}}, x:{ticks:{font:{size:9}}} }
  });

  // Bar 3: Zone stacked by status
  const byZone   = groupBy(uotFiltered, 'Zone ID');
  const allStats = Object.keys(STATUS_MAP);
  const zoneTotal = z => allStats.reduce((s,st)=>s+uniqCount(byZone[z].filter(r=>r['สถานะประมวลผล']===st),'รหัสสินค้า'),0);
  const zoneKeys  = Object.keys(byZone).sort((a,b) => zoneTotal(b) - zoneTotal(a));
  const ds4 = allStats.map(st => ({
    label:st, data:zoneKeys.map(z=>uniqCount(byZone[z].filter(r=>r['สถานะประมวลผล']===st),'รหัสสินค้า')),
    backgroundColor:statusCol(st), borderWidth:0, borderRadius:1
  })).filter(d => d.data.some(v => v > 0));
  const c4El = document.getElementById('u-c4');
  c4El.style.width = Math.max(600, zoneKeys.length * 45) + 'px';
  mkChart('u-c4', 'bar', { labels:zoneKeys, datasets:ds4 }, {
    plugins: {
      legend: { display:false },
      datalabels: {
        anchor:'center', align:'center', font:{size:9,weight:'bold'},
        formatter:(v,ctx)=>{
          if (ctx.datasetIndex === ds4.length-1) { const tot=ds4.reduce((s,d)=>s+(d.data[ctx.dataIndex]||0),0); return tot>0?fmtN(tot):''; }
          return v>0?fmtN(v):'';
        },
        color: ctx=>ctx.datasetIndex===ds4.length-1?'#e2e8f0':'#fff',
        anchor: ctx=>ctx.datasetIndex===ds4.length-1?'end':'center',
        align:  ctx=>ctx.datasetIndex===ds4.length-1?'top':'center',
        display: ctx=>ctx.dataset.data[ctx.dataIndex]>0
      }
    },
    scales: {
      x:{ stacked:true, ticks:{font:{size:9}}, grid:{color:'rgba(255,255,255,.04)'} },
      y:{ stacked:true, beginAtZero:true, ticks:{font:{size:9}}, grid:{color:'rgba(255,255,255,.05)'}, title:{display:true,text:'จำนวนรหัสสินค้า (distinct)',font:{size:9}} }
    }
  });
  const lgHtml = allStats.filter(st=>ds4.some(d=>d.label===st))
    .map(st=>`<span style="display:inline-flex;align-items:center;gap:3px;margin-right:10px;"><span style="width:10px;height:10px;border-radius:2px;background:${statusCol(st)};display:inline-block;"></span><span style="font-size:10px;color:var(--muted);">${st}</span></span>`).join('');
  document.getElementById('u-legend4').innerHTML = lgHtml;

  // Bar 5: สาขา / คลัง
  const uotByWH      = groupBy(uotFiltered, 'คลังสินค้า');
  const uotAllWHKeys = [...new Set(dataUot.map(r=>r['คลังสินค้า']||'').filter(Boolean))].sort();
  const UOT_WH_COLOR = Object.fromEntries(uotAllWHKeys.map((wh,i)=>[wh,PALETTE[i%PALETTE.length]]));
  const uotWHKeys    = uotAllWHKeys.filter(wh => uotByWH[wh]);
  const uotAllBrRaw  = [...new Set(uotFiltered.map(r=>r['ชื่อสาขา']||'').filter(Boolean))];
  const uotAllBr     = uotAllBrRaw.map(br => ({
    br, total:uotWHKeys.reduce((s,wh)=>s+uniqCount((uotByWH[wh]||[]).filter(r=>r['ชื่อสาขา']===br),'เลขที่เอกสารขอโอน'),0)
  })).sort((a,b) => b.total - a.total).map(x => x.br);
  const c5El = document.getElementById('u-c5');
  c5El.style.width = Math.max(900, uotAllBr.length * 55) + 'px';
  mkChart('u-c5', 'bar', {
    labels: uotAllBr.map(br => br.replace(/^สาขา\s*/, '')),
    datasets: uotWHKeys.map(wh => ({
      label: wh || '(ไม่ระบุ)',
      data:  uotAllBr.map(br => uniqCount((uotByWH[wh]||[]).filter(r=>r['ชื่อสาขา']===br),'เลขที่เอกสารขอโอน')),
      backgroundColor: UOT_WH_COLOR[wh] || '#94a3b8', borderRadius:3, borderWidth:0
    }))
  }, {
    plugins: { legend:{position:'bottom',labels:{font:{size:11},boxWidth:10,padding:8}}, datalabels:{display:false} },
    scales: {
      x:{ ticks:{font:{size:9},maxRotation:75,minRotation:45}, grid:{color:'rgba(255,255,255,.04)'} },
      y:{ beginAtZero:true, ticks:{font:{size:9}}, grid:{color:'rgba(255,255,255,.05)'}, title:{display:true,text:'จำนวนเอกสาร (distinct)',font:{size:10}} }
    }
  });

  renderUotTable();
  renderUotTags();
}

// ── Table (paginated) ──
function renderUotTable() {
  const pg      = uotPage;
  const fsearch = (document.getElementById('u-fsearch')?.value || '').trim().toLowerCase();
  const searchFiltered = fsearch
    ? uotFiltered.filter(r => (r['เลขที่เอกสารขอโอน'] || '').toLowerCase().includes(fsearch))
    : uotFiltered;

  const zMaxDays = {}, dMaxDays = {};
  searchFiltered.forEach(r => {
    const z=r['Zone ID']||'', d=r['เลขที่เอกสารขอโอน']||'', v=num(r['วันค้างส่ง']);
    if (!(z in zMaxDays)||v>zMaxDays[z]) zMaxDays[z]=v;
    if (!(d in dMaxDays)||v>dMaxDays[d]) dMaxDays[d]=v;
  });
  const sorted = [...searchFiltered].sort((a,b) => {
    const az=a['Zone ID']||'', bz=b['Zone ID']||'';
    const ad=a['เลขที่เอกสารขอโอน']||'', bd=b['เลขที่เอกสารขอโอน']||'';
    const zd=(zMaxDays[bz]||0)-(zMaxDays[az]||0); if(zd) return zd;
    if(az!==bz) return az<bz?-1:1;
    const dd=(dMaxDays[bd]||0)-(dMaxDays[ad]||0); if(dd) return dd;
    if(ad!==bd) return ad<bd?-1:1;
    return num(b['วันค้างส่ง'])-num(a['วันค้างส่ง']);
  });
  const total = sorted.length, pages = Math.ceil(total/UOT_PAGE_SIZE)||1;
  const slice = sorted.slice(pg*UOT_PAGE_SIZE, (pg+1)*UOT_PAGE_SIZE);

  document.getElementById('u-cnt').textContent    = `(${fmtN(total)} รายการ)`;
  document.getElementById('u-pg-info').textContent = `หน้า ${pg+1}/${pages}`;
  document.getElementById('u-prev').disabled       = pg === 0;
  document.getElementById('u-next').disabled       = pg >= pages-1;

  const zSpan={}, dSpan={};
  slice.forEach(r => {
    const z=r['Zone ID']||'';
    const d=(r['Zone ID']||'')+'|'+(r['เลขที่เอกสารขอโอน']||'');
    zSpan[z]=(zSpan[z]||0)+1; dSpan[d]=(dSpan[d]||0)+1;
  });
  const zSeen={}, dSeen={};
  let html = '<table class="gtbl"><thead><tr><th>Zone</th><th>เลขที่เอกสารขอโอน</th><th>วันที่ขอโอน</th><th>รหัสสินค้า</th><th>สถานะประมวลผล</th><th>คลัง</th><th>ชื่อสาขา</th><th>วันค้างส่ง</th><th>คงค้างพาเลท</th></tr></thead><tbody>';
  slice.forEach(r => {
    const z=r['Zone ID']||'', docNum=r['เลขที่เอกสารขอโอน']||'', dKey=z+'|'+docNum;
    html += '<tr>';
    if (!zSeen[z])   { html+=`<td class="zone-cell" rowspan="${zSpan[z]}">${esc(z)}</td>`; zSeen[z]=true; }
    if (!dSeen[dKey]) {
      html+=`<td class="doc-cell" rowspan="${dSpan[dKey]}">${esc(docNum)}</td>`;
      html+=`<td class="dt-cell"  rowspan="${dSpan[dKey]}">${esc(r['วันที่ขอโอน']||'')}</td>`;
      dSeen[dKey]=true;
    }
    html+=`<td>${esc(r['รหัสสินค้า']||'')}</td>`;
    html+=`<td><span class="spill ${statusCls(r['สถานะประมวลผล']||'')}" title="${esc(r['สถานะประมวลผล']||'')}">${esc(r['สถานะประมวลผล']||'')}</span></td>`;
    html+=`<td style="text-align:center;">${esc(r['คลังสินค้า']||'')}</td>`;
    if (!dSeen[dKey+'_br']) {
      html+=`<td rowspan="${dSpan[dKey]}" style="max-width:130px;">${esc(r['ชื่อสาขา']||'')}</td>`;
      dSeen[dKey+'_br']=true;
    }
    html+=`<td style="text-align:center;">${db(num(r['วันค้างส่ง']))}</td>`;
    html+=`<td class="num-cell">${fmtP(num(r['จำนวนคงค้างพาเลท']))}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('u-tbl').innerHTML = html;
}

// ── Filter Tags ──
function renderUotTags() {
  const container = document.getElementById('uot-tags');
  if (!container) return;
  const tags = [];

  const fzEl = document.getElementById('u-fz-list');
  const { chk:chkFz, isFiltered:fzActive } = getCBState(fzEl);
  if (fzActive) {
    if (chkFz.length===0) tags.push({label:'Zone', value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(fzEl); renderUot(); }});
    else chkFz.forEach(v=>tags.push({label:'Zone', value:v, remove:()=>{ uncheckCB(fzEl,v); renderUot(); }}));
  }
  const fbEl = document.getElementById('u-fb-list');
  const { chk:chkFb, isFiltered:fbActive } = getCBState(fbEl);
  if (fbActive) {
    if (chkFb.length===0) tags.push({label:'สาขา', value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(fbEl); renderUot(); }});
    else chkFb.forEach(v=>tags.push({label:'สาขา', value:v.replace(/^สาขา\s*/,''), remove:()=>{ uncheckCB(fbEl,v); renderUot(); }}));
  }
  const fdate = document.getElementById('u-fdate').value;
  if (fdate) tags.push({label:'ช่วงวันที่', value:DATE_LBL[fdate]||fdate, remove:()=>{ document.getElementById('u-fdate').value=''; renderUot(); }});
  const fd1=document.getElementById('u-fd1').value, fd2=document.getElementById('u-fd2').value;
  if (fd1||fd2) {
    const display=fd1&&fd2?`${fd1}–${fd2} วัน`:fd1?`≥ ${fd1} วัน`:`≤ ${fd2} วัน`;
    tags.push({label:'วันค้าง', value:display, remove:()=>{ document.getElementById('u-fd1').value=''; document.getElementById('u-fd2').value=''; renderUot(); }});
  }
  const fsEl = document.getElementById('u-fs-list');
  const { chk:chkFs, isFiltered:fsActive } = getCBState(fsEl);
  if (fsActive) {
    if (chkFs.length===0) tags.push({label:'สถานะ', value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(fsEl); renderUot(); }});
    else chkFs.forEach(v=>tags.push({label:'สถานะ', value:v, remove:()=>{ uncheckCB(fsEl,v); renderUot(); }}));
  }
  const fw = document.getElementById('u-fw').value;
  if (fw) tags.push({label:'คลัง', value:fw, remove:()=>{ document.getElementById('u-fw').value=''; renderUot(); }});

  buildTagsHTML(container, tags, ()=>{
    checkAllCB(document.getElementById('u-fz-list'));
    checkAllCB(document.getElementById('u-fs-list'));
    checkAllCB(document.getElementById('u-fb-list'));
    document.getElementById('u-fw').value='';
    document.getElementById('u-fdate').value='';
    document.getElementById('u-fd1').value='';
    document.getElementById('u-fd2').value='';
    renderUot();
  });
}

// ── Internal: rank top-5 branches ──
function _rankBranches(rows) {
  return Object.entries(groupBy(rows, 'ชื่อสาขา'))
    .map(([k,v]) => ({
      name: (k||'').replace(/^สาขา\s*/,''), fullName:k||'',
      max:  Math.max(...v.map(r=>num(r['วันค้างส่ง']))),
      docs: uniqCount(v,'เลขที่เอกสารขอโอน'),
      skus: uniqCount(v,'รหัสสินค้า'),
      pal:  v.reduce((s,r)=>s+num(r['จำนวนคงค้างพาเลท']),0)
    }))
    .sort((a,b) => {
      if (b.max!==a.max) return b.max-a.max;
      if (b.docs!==a.docs) return b.docs-a.docs;
      if (b.skus!==a.skus) return b.skus-a.skus;
      return a.fullName.localeCompare(b.fullName,'th');
    }).slice(0,5);
}

// ── Pagination buttons (bound after DOM ready in app.js) ──
function initUotPagination() {
  document.getElementById('u-prev').addEventListener('click', () => {
    if (uotPage > 0) { uotPage--; renderUotTable(); }
  });
  document.getElementById('u-next').addEventListener('click', () => {
    const pages = Math.ceil(uotFiltered.length / UOT_PAGE_SIZE) || 1;
    if (uotPage < pages-1) { uotPage++; renderUotTable(); }
  });
}
