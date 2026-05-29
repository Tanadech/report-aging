// ============ tabs/in.js — DOMESTIC (ภายในประเทศ) Tab ============

const WH_COLORS = { 'WH1':'#22d3ee','WH2':'#10b981','WH3':'#a78bfa','WH4':'#fb923c','WH5':'#f87171' };

// คลังจาก "ประตูลงสินค้า" → "WH1" / "(อื่นๆ)"
function getWH(r) {
  return (r['ประตูลงสินค้า'] || '').match(/^(WH\d+)/)?.[1] || '(อื่นๆ)';
}

// ชื่อสาขาเต็มจาก BR_CODE_MAP / BR_ABR_MAP
function getBrName(r) {
  return BR_CODE_MAP[r['รหัสสาขา']] || BR_ABR_MAP[r['ชื่อย่อสาขา']] || r['ชื่อย่อสาขา'] || '';
}

// ── Render all ──
function renderIn() {
  const fzCB  = checkedVals(document.getElementById('i-fz-list'));
  const fbCB  = checkedVals(document.getElementById('i-fb-list'));
  const fv    = document.getElementById('i-fv').value;
  const fwCB  = checkedVals(document.getElementById('i-fw-list'));
  const fd1   = num(document.getElementById('i-fd1').value) || 0;
  const fd2   = num(document.getElementById('i-fd2').value) || Infinity;

  const f = dataIn.filter(r => {
    if (fzCB.length && !fzCB.includes(r['Zone Name']))    return false;
    if (fbCB.length && !fbCB.includes(r['ชื่อย่อสาขา'])) return false;
    if (fv  && r['ชื่อผู้จำหน่าย'] !== fv)               return false;
    if (fwCB.length && !fwCB.includes(getWH(r)))          return false;
    const d = num(r['วันคงค้าง']);
    if (fd1 > 0 && d < fd1) return false;
    if (fd2 < Infinity && d > fd2) return false;
    return true;
  });

  const fWithWH = f.map(r => ({ ...r, _wh:getWH(r) }));
  const byWH    = groupBy(fWithWH, '_wh');
  const whKeys  = Object.keys(byWH).sort();

  // KPI
  const docs     = uniqCount(f,'เลขที่เอกสาร POI');
  const onetimes = uniqCount(f,'เลขที่ onetime');
  const branches = uniqCount(f,'ชื่อย่อสาขา');
  const vendors  = uniqCount(f,'ชื่อผู้จำหน่าย');
  const whCount  = whKeys.length;
  const days     = f.map(r => num(r['วันคงค้าง']));
  const mx       = days.length ? Math.max(...days) : 0;
  const over30   = f.filter(r => num(r['วันคงค้าง']) > 30).length;
  const pct30    = f.length ? (over30/f.length*100).toFixed(1) : '0.0';

  document.getElementById('in-kpi').innerHTML = `
    <stat-card variant="inf"  label="เลขที่เอกสาร POI"  value="${fmtN(docs)}"     unit="เอกสาร"></stat-card>
    <stat-card                label="เลขที่ Onetime"     value="${fmtN(onetimes)}" unit="รายการ"></stat-card>
    <stat-card variant="ok"   label="จำนวนคลัง"          value="${fmtN(whCount)}"  unit="คลัง"></stat-card>
    <stat-card variant="ok"   label="สาขาที่รอจ่าย"      value="${fmtN(branches)}" unit="สาขา"></stat-card>
    <stat-card                label="ผู้จำหน่าย"         value="${fmtN(vendors)}"  unit="ราย"></stat-card>
    <stat-card variant="warn" label="วันคงค้างสูงสุด"    value="${fmtN(mx)}"      unit="วัน"></stat-card>
    <stat-card variant="alr"  label="ค้างเกิน 30 วัน"   value="${fmtN(over30)}"  unit="${pct30}% ของทั้งหมด"></stat-card>
    <stat-card                label="Zone"               value="${fmtN(uniqCount(f,'Zone Name'))}" unit="Zone"></stat-card>
  `;

  // Chart 1: เอกสาร / คลัง (Doughnut)
  const wh1data = whKeys.map(wh => uniqCount(byWH[wh],'เลขที่เอกสาร POI'));
  mkChart('i-c1','doughnut',{
    labels: whKeys,
    datasets:[{data:wh1data, backgroundColor:whKeys.map((w,i)=>WH_COLORS[w]||PALETTE[i]), borderWidth:2, borderColor:'rgba(13,26,46,.9)', hoverOffset:6}]
  },{
    plugins:{
      legend:{position:'bottom',labels:{font:{size:11},boxWidth:10,padding:8}},
      datalabels:{color:'#fff',font:{size:11,weight:'bold'},formatter:(v,ctx)=>ctx.chart.data.labels[ctx.dataIndex]+'\n'+fmtN(v),anchor:'center',align:'center',display:ctx=>ctx.dataset.data[ctx.dataIndex]>0}
    }, cutout:'50%'
  });

  // Chart 2: วันคงค้างเฉลี่ย / คลัง (Bar)
  const wh2data = whKeys.map(wh => {
    const ds=byWH[wh].map(r=>num(r['วันคงค้าง']));
    return ds.length ? +(ds.reduce((a,b)=>a+b,0)/ds.length).toFixed(2) : 0;
  });
  mkChart('i-c2','bar',{
    labels: whKeys,
    datasets:[{label:'วันคงค้างเฉลี่ย', data:wh2data, backgroundColor:whKeys.map((w,i)=>WH_COLORS[w]||PALETTE[0]), borderRadius:6, borderWidth:0}]
  },{
    plugins:{legend:{display:false}, datalabels:{anchor:'end',align:'top',font:{size:12,weight:'bold'},formatter:v=>v>0?fmtD(v,1)+' DAY':'',color:'#e2e8f0'}},
    scales:{y:{beginAtZero:true,ticks:{font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}}, x:{ticks:{font:{size:12},color:'#93c5fd'}}}
  });

  // Chart 3: Top 5 สาขา
  const byBr2 = groupBy(f,'ชื่อย่อสาขา');
  const brD2  = Object.entries(byBr2).map(([k,v])=>({
    name: BR_ABR_MAP[k]||k,
    max:  Math.max(...v.map(r=>num(r['วันคงค้าง']))),
    docs: uniqCount(v,'เลขที่เอกสาร POI'),
    ot:   uniqCount(v,'เลขที่ onetime'),
    pal:  palletForRows(v)
  })).sort((a,b)=>b.max!==a.max?b.max-a.max:b.docs!==a.docs?b.docs-a.docs:a.name.localeCompare(b.name,'th')).slice(0,5);
  mkChart('i-c3','bar',{
    labels:brD2.map(d=>d.name),
    datasets:[
      {label:'วันค้างสูงสุด', data:brD2.map(d=>d.max),  backgroundColor:'#22d3ee',borderRadius:3},
      {label:'จำนวนเอกสาร',  data:brD2.map(d=>d.docs), backgroundColor:'#10b981',borderRadius:3},
      {label:'เลขที่ Onetime',data:brD2.map(d=>d.ot),   backgroundColor:'#a78bfa',borderRadius:3},
      {label:'พาเลทคงค้าง',  data:brD2.map(d=>d.pal),  backgroundColor:'#fbbf24',borderRadius:3}
    ]
  },{
    plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10,padding:6}}, datalabels:{anchor:'end',align:'top',font:{size:9,weight:'bold'},formatter:v=>v>0?fmtN(v):'',color:'#e2e8f0'}},
    scales:{y:{beginAtZero:true,ticks:{stepSize:50,font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}}, x:{ticks:{font:{size:10}}}}
  });

  // Chart 4: ช่วงเวลา / คลัง
  const tb4=[
    {lbl:'1-3 วัน',min:1,max:3},{lbl:'4-7 วัน',min:4,max:7},{lbl:'8-14 วัน',min:8,max:14},
    {lbl:'15-21 วัน',min:15,max:21},{lbl:'22-30 วัน',min:22,max:30},{lbl:'> 30 วัน',min:31,max:99999}
  ];
  mkChart('i-c4','bar',{
    labels:tb4.map(b=>b.lbl),
    datasets:whKeys.map((wh,i)=>({
      label:wh, backgroundColor:WH_COLORS[wh]||PALETTE[i], borderRadius:3,
      data:tb4.map(b=>{ const rows=byWH[wh].filter(r=>{const d=num(r['วันคงค้าง']);return d>=b.min&&d<=b.max;}); return uniqCount(rows,'เลขที่เอกสาร POI'); })
    }))
  },{
    plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10,padding:6}}, datalabels:{anchor:'end',align:'top',font:{size:9,weight:'bold'},formatter:v=>v>0?fmtN(v):'',color:'#e2e8f0'}},
    scales:{y:{beginAtZero:true,ticks:{stepSize:50,font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}}, x:{ticks:{font:{size:9}}}}
  });

  // Chart 5: สาขา / คลัง (large grouped bar)
  const allBrRaw = [...new Set(f.map(r=>r['ชื่อย่อสาขา']||'').filter(Boolean))];
  const allBr    = allBrRaw.map(br=>({ br, total:whKeys.reduce((s,wh)=>s+uniqCount((byWH[wh]||[]).filter(r=>r['ชื่อย่อสาขา']===br),'เลขที่ onetime'),0) })).sort((a,b)=>b.total-a.total).map(x=>x.br);
  const c5El = document.getElementById('i-c5');
  c5El.style.width = Math.max(900, allBr.length * 72) + 'px';
  mkChart('i-c5','bar',{
    labels:allBr.map(br=>(BR_ABR_MAP[br]||br).replace(/^สาขา\s*/,'')),
    datasets:whKeys.map((wh,i)=>({
      label:wh, backgroundColor:WH_COLORS[wh]||PALETTE[i], borderRadius:3, borderWidth:0,
      data:allBr.map(br=>{ const rows=byWH[wh].filter(r=>r['ชื่อย่อสาขา']===br); return uniqCount(rows,'เลขที่ onetime'); })
    }))
  },{
    plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:10,padding:8}}, datalabels:{display:false}},
    scales:{
      x:{ticks:{font:{size:9},maxRotation:75,minRotation:45},grid:{color:'rgba(255,255,255,.04)'}},
      y:{beginAtZero:true,ticks:{font:{size:9}},grid:{color:'rgba(255,255,255,.05)'},title:{display:true,text:'เลขที่ Onetime (distinct)',font:{size:10}}}
    }
  });

  // Table (gridjs)
  document.getElementById('i-cnt').textContent = `(${fmtN(f.length)} รายการ)`;
  const iData = [...f].sort((a,b)=>num(b['วันคงค้าง'])-num(a['วันคงค้าง'])).map(r => {
    const ot=String(r['เลขที่ onetime']||'').trim();
    const pal=ot?(palletByOnetime[ot]||0):0;
    return [num(r['วันคงค้าง']),getWH(r),r['เลขที่เอกสาร POI']||'',ot,pal,getBrName(r)||r['ชื่อย่อสาขา']||'',r['ชื่อผู้จำหน่าย']||'',r['Zone Name']||''];
  });
  if (inGrid) { try { inGrid.destroy(); } catch(e){} inGrid=null; }
  document.getElementById('i-tbl').innerHTML = '';
  inGrid = new gridjs.Grid({
    columns:[
      {name:'วันคงค้าง',    formatter:c=>gridjs.html(db(c)),width:'90px',resizable:true},
      {name:'คลัง',         width:'70px',resizable:true},
      {name:'เลขที่เอกสาร POI',width:'185px',resizable:true},
      {name:'Onetime',      width:'140px',resizable:true},
      {name:'จำนวนพาเลท',   width:'120px',resizable:true, formatter:c=>gridjs.html(c>0?`<b style="color:#fbbf24;">${c}</b>`:'<span style="color:#475569;">-</span>')},
      {name:'ชื่อสาขา',     width:'210px',resizable:true},
      {name:'ผู้จำหน่าย',   resizable:true},
      {name:'Zone',         resizable:true}
    ],
    data:iData, sort:true, search:true, resizable:true,
    pagination:{limit:15,summary:true},
    language:{search:{placeholder:'ค้นหา...'},pagination:{previous:'◀',next:'▶',showing:'แสดง',of:'จาก',to:'ถึง',results:()=>'รายการ'},noRecordsFound:'ไม่พบข้อมูล'}
  });
  inGrid.render(document.getElementById('i-tbl'));
  renderInTags();
}

// ── Filter Tags ──
function renderInTags() {
  const container = document.getElementById('in-tags');
  if (!container) return;
  const tags = [];

  const fzEl = document.getElementById('i-fz-list');
  const { chk:chkFz, isFiltered:fzActive } = getCBState(fzEl);
  if (fzActive) {
    if (chkFz.length===0) tags.push({label:'Zone', value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(fzEl); renderIn(); }});
    else chkFz.forEach(v=>tags.push({label:'Zone', value:v, remove:()=>{ uncheckCB(fzEl,v); renderIn(); }}));
  }
  const fbEl = document.getElementById('i-fb-list');
  const { chk:chkFb, isFiltered:fbActive } = getCBState(fbEl);
  if (fbActive) {
    if (chkFb.length===0) tags.push({label:'สาขา', value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(fbEl); renderIn(); }});
    else chkFb.forEach(v=>tags.push({label:'สาขา', value:(BR_ABR_MAP[v]||v).replace(/^สาขา\s*/,''), remove:()=>{ uncheckCB(fbEl,v); renderIn(); }}));
  }
  const fv=document.getElementById('i-fv').value;
  if (fv) tags.push({label:'ผู้จำหน่าย', value:fv, remove:()=>{ document.getElementById('i-fv').value=''; renderIn(); }});
  const fd1=document.getElementById('i-fd1').value, fd2=document.getElementById('i-fd2').value;
  if (fd1||fd2) {
    const display=fd1&&fd2?`${fd1}–${fd2} วัน`:fd1?`≥ ${fd1} วัน`:`≤ ${fd2} วัน`;
    tags.push({label:'วันคงค้าง', value:display, remove:()=>{ document.getElementById('i-fd1').value=''; document.getElementById('i-fd2').value=''; renderIn(); }});
  }
  const fwEl = document.getElementById('i-fw-list');
  const { chk:chkFw, isFiltered:fwActive } = getCBState(fwEl);
  if (fwActive) {
    if (chkFw.length===0) tags.push({label:'คลัง', value:'(ไม่มีที่เลือก)', remove:()=>{ checkAllCB(fwEl); renderIn(); }});
    else chkFw.forEach(v=>tags.push({label:'คลัง', value:v, remove:()=>{ uncheckCB(fwEl,v); renderIn(); }}));
  }

  buildTagsHTML(container, tags, ()=>{
    checkAllCB(document.getElementById('i-fz-list'));
    checkAllCB(document.getElementById('i-fw-list'));
    checkAllCB(document.getElementById('i-fb-list'));
    document.getElementById('i-fv').value='';
    document.getElementById('i-fd1').value='';
    document.getElementById('i-fd2').value='';
    renderIn();
  });
}
