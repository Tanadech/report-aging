// ============ tabs/car/index.js — renderCar: KPI + Timeline chart + view dispatch ============

function renderCar() {
  let f         = getCarFiltered();
  const fdateEl = document.getElementById('c-fdate');

  // Smart fallback: ถ้า filter 'วันนี้+พรุ่งนี้' ไม่พบข้อมูล → แสดงทั้งหมด พร้อม warning
  if (!f.length && dataCar.length && fdateEl.value === 'todaytomorrow') {
    fdateEl.value = '';
    f = getCarFiltered();
    if (f.length) {
      const tagsEl = document.getElementById('car-tags');
      if (tagsEl) {
        const dates   = [...new Set(dataCar.map(r => { const d = parseCarDate(r['วันที่คิวงาน']); return d ? d.toLocaleDateString('th-TH') : ''; }).filter(Boolean))].sort();
        const dateStr = dates.slice(0, 3).join(', ') + (dates.length > 3 ? '...' : '');
        tagsEl.classList.remove('hidden');
        tagsEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:7px;font-size:12px;color:#fbbf24;width:100%;">
          <span style="font-size:16px;">⚠</span>
          <span>ไม่พบรถวันนี้/พรุ่งนี้ — แสดงข้อมูลทั้งหมด (${fmtN(dataCar.length)} คัน) จากวันที่ <b style="color:#fcd34d;">${esc(dateStr)}</b></span>
          <button style="margin-left:auto;padding:4px 10px;background:rgba(245,158,11,.2);border:1px solid rgba(245,158,11,.4);border-radius:5px;color:#fbbf24;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;" onclick="document.getElementById('c-fdate').value='todaytomorrow';renderCar();">↺ กลับไป 'วันนี้+พรุ่งนี้'</button>
        </div>`;
      }
    }
  }

  // KPI cards
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const inRange  = (rows, tgt) => rows.filter(r => { const d = parseCarDate(r['วันที่คิวงาน']); return d && sameDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()), tgt); });
  const cntBySt  = st => f.filter(r => (r['สถานะลงคิว'] || '').trim() === st).length;

  document.getElementById('car-kpi').innerHTML = `
    <stat-card variant="inf"  data-kpi="today"    label="รถเข้าวันนี้"      value="${fmtN(inRange(dataCar,today).length)}"    unit="คัน"></stat-card>
    <stat-card                data-kpi="tomorrow" label="รถเข้าพรุ่งนี้"    value="${fmtN(inRange(dataCar,tomorrow).length)}" unit="คัน"></stat-card>
    <stat-card variant="inf"  data-kpi="view"     label="รถในมุมมอง"        value="${fmtN(f.length)}"                        unit="คัน"></stat-card>
    <stat-card variant="ok"   data-kpi="wh"       label="คลังที่ต้องเตรียม"  value="${fmtN(uniqCount(f,'คลังสินค้า'))}"      unit="คลัง"></stat-card>
    <stat-card variant="ok"   data-kpi="early"    label="มาก่อนเวลา"        value="${fmtN(cntBySt('มาก่อนเวลา'))}"          unit="คัน"></stat-card>
    <stat-card variant="warn" data-kpi="late"     label="มาหลังเวลานัด"      value="${fmtN(cntBySt('มาหลังเวลานัด'))}"      unit="คัน"></stat-card>
    <stat-card variant="alr"  data-kpi="cancel"   label="ยกเลิกรับงาน"      value="${fmtN(cntBySt('ยกเลิกรับงาน'))}"       unit="คัน"></stat-card>
    <stat-card                data-kpi="notqueue" label="ยังไม่มาลงคิว"      value="${fmtN(cntBySt('ยังไม่มาลงคิว'))}"      unit="คัน"></stat-card>
    <stat-card variant="alr"  data-kpi="stuck"    label="รถตกค้าง"          value="${fmtN(f.filter(r=>isChecked(r['รถตกค้าง'])).length)}"           unit="คัน"></stat-card>
    <stat-card variant="warn" data-kpi="notout"   label="ยังไม่ออก DC"      value="${fmtN(f.filter(r=>isChecked(r['รถยังไม่ออกจาก DC'])).length)}"  unit="คัน"></stat-card>
  `;
  document.querySelectorAll('#car-kpi stat-card[data-kpi]').forEach(el => { el.dataset.kpi = el.getAttribute('data-kpi'); });

  // Timeline chart
  const slots  = [...new Set(f.map(r => r['ช่วงเวลา'] || '').filter(Boolean))].sort((a,b) => timeSlotStart(a) - timeSlotStart(b));
  const whKeys = [...new Set(f.map(r => r['คลังสินค้า'] || '').filter(Boolean))].sort();
  const wPal   = ['#22d3ee','#10b981','#a78bfa','#fb923c','#f87171','#3b82f6','#fbbf24'];
  mkChart('c-c1', 'bar', {
    labels: slots,
    datasets: whKeys.map((wh, i) => ({
      label: wh, backgroundColor: wPal[i % wPal.length], borderRadius: 4, borderWidth: 0,
      data: slots.map(s => f.filter(r => r['ช่วงเวลา'] === s && r['คลังสินค้า'] === wh).length)
    }))
  }, {
    plugins: {
      legend: { position:'bottom', labels:{ font:{size:11}, boxWidth:10, padding:8 } },
      datalabels: { anchor:'center', align:'center', font:{size:11,weight:'bold'}, color:'#fff', formatter: v => v > 0 ? v : '', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
    },
    scales: {
      x: { stacked:true, ticks:{font:{size:11}}, grid:{color:'rgba(255,255,255,.04)'} },
      y: { stacked:true, beginAtZero:true, ticks:{stepSize:1,font:{size:10}}, grid:{color:'rgba(255,255,255,.05)'}, title:{display:true,text:'จำนวนรถ',font:{size:10}} }
    }
  });

  // เสริม aging + sort แล้ว dispatch ให้ view ที่เลือก
  const enriched = f.map(r => ({ ...r, _slot: timeSlotStart(r['ช่วงเวลา'] || ''), _aging: getAgingForBranch(r['ชื่อย่อสาขา'] || '', r['ชื่อสาขา'] || '', r['คลังสินค้า'] || '') }));
  enriched.sort((a, b) => a._slot !== b._slot ? a._slot - b._slot : (b._aging.maxDays || 0) - (a._aging.maxDays || 0));
  const grouped      = {};
  enriched.forEach(r => { const k = r['ช่วงเวลา'] || '(ไม่ระบุเวลา)'; (grouped[k] = grouped[k] || []).push(r); });
  const slotsOrdered = Object.keys(grouped).sort((a, b) => timeSlotStart(a) - timeSlotStart(b));

  if (carView === 'card') {
    _renderCarCards(enriched, slotsOrdered, grouped, today, tomorrow);
  } else {
    _renderCarTable(enriched);
  }
  renderCarTags();
}
