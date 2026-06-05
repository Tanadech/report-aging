// ============ tabs/car/index.js — renderCar: KPI + Timeline chart + view dispatch ============

function _truckTypeSummary(rows) {
  if (!rows.length) return '';
  const byType = {};
  rows.forEach(r => { const t = (r['truck_info'] || '').trim() || 'อื่นๆ'; byType[t] = (byType[t] || 0) + 1; });
  return Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join(' · ').replace(/"/g, '&quot;');
}

function _truckTypeList(rows) {
  if (!rows.length) return '';
  const byType = {};
  rows.forEach(r => { const t = (r['truck_info'] || '').trim() || 'อื่นๆ'; byType[t] = (byType[t] || 0) + 1; });
  return Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join('|').replace(/"/g, '&quot;');
}

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
        const dates   = [...new Set(dataCar.map(r => { const d = parseCarDate(r['search_date']); return d ? d.toLocaleDateString('th-TH') : ''; }).filter(Boolean))].sort();
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
  const inRange  = (rows, tgt) => rows.filter(r => { const d = parseCarDate(r['search_date']); return d && sameDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()), tgt); });

  const todayRows    = inRange(dataCar, today);
  const tomorrowRows = inRange(dataCar, tomorrow);
  const earlyRows    = f.filter(r => (r['สถานะลงคิว'] || '').trim() === 'มาก่อนเวลา');
  const lateRows     = f.filter(r => (r['สถานะลงคิว'] || '').trim() === 'มาหลังเวลานัด');
  const cancelRows   = f.filter(r => (r['สถานะลงคิว'] || '').trim() === 'ยกเลิกรับงาน');
  const notqueueRows = f.filter(r => (r['สถานะลงคิว'] || '').trim() === 'ยังไม่มาลงคิว');
  const stuckRows    = f.filter(r => isChecked(r['รถตกค้าง']));
  const notoutRows   = f.filter(r => isDcDeparted(r['status_shipping']));

  document.getElementById('car-kpi').innerHTML = `
    <stat-card variant="inf"  label="รถเข้าวันนี้"      value="${fmtN(todayRows.length)}"    unit="คัน" icon="https://img.icons8.com/color/96/loading-truck.png"    list="${_truckTypeList(todayRows)}"></stat-card>
    <stat-card                label="รถเข้าพรุ่งนี้"    value="${fmtN(tomorrowRows.length)}" unit="คัน" icon="https://img.icons8.com/isometric/96/truck.png"          list="${_truckTypeList(tomorrowRows)}"></stat-card>
    <stat-card variant="inf"  label="รถในมุมมอง"        value="${fmtN(f.length)}"            unit="คัน" icon="https://img.icons8.com/cotton/96/warehouse.png"         list="${_truckTypeList(f)}"></stat-card>
    <stat-card variant="ok"   label="คลังที่ต้องเตรียม"  value="${fmtN(uniqCount(f,'port_id'))}"  unit="คลัง"></stat-card>
    <stat-card variant="ok"   label="มาก่อนเวลา"        value="${fmtN(earlyRows.length)}"    unit="คัน" list="${_truckTypeList(earlyRows)}"></stat-card>
    <stat-card variant="warn" label="มาหลังเวลานัด"      value="${fmtN(lateRows.length)}"     unit="คัน" list="${_truckTypeList(lateRows)}"></stat-card>
    <stat-card variant="alr"  label="ยกเลิกรับงาน"      value="${fmtN(cancelRows.length)}"   unit="คัน" list="${_truckTypeList(cancelRows)}"></stat-card>
    <stat-card                label="ยังไม่มาลงคิว"      value="${fmtN(notqueueRows.length)}" unit="คัน" list="${_truckTypeList(notqueueRows)}"></stat-card>
    <stat-card variant="alr"  label="รถตกค้าง"          value="${fmtN(stuckRows.length)}"    unit="คัน" list="${_truckTypeList(stuckRows)}"></stat-card>
    <stat-card variant="warn" label="ยังไม่ออก DC"      value="${fmtN(notoutRows.length)}"   unit="คัน" list="${_truckTypeList(notoutRows)}"></stat-card>
  `;

  // Timeline chart
  const slots  = [...new Set(f.map(r => r['zone_time'] || '').filter(Boolean))].sort((a,b) => timeSlotStart(a) - timeSlotStart(b));
  const whKeys = [...new Set(f.map(r => r['port_id'] || '').filter(Boolean))].sort();
  const wPal   = ['#00B8D9','#22C55E','#7C3AED','#fda92d','#FF5630','#1677ff','#FFAB00'];
  mkChart('c-c1', 'bar', {
    labels: slots,
    datasets: whKeys.map((wh, i) => ({
      label: wh, backgroundColor: wPal[i % wPal.length], borderRadius: 4, borderWidth: 0,
      data: slots.map(s => f.filter(r => r['zone_time'] === s && r['port_id'] === wh).length)
    }))
  }, {
    plugins: {
      legend: { position:'bottom', labels:{ font:{size:11}, boxWidth:10, padding:8 } },
      tooltip: { mode:'index', callbacks:{ footer: items => 'รวม: ' + fmtN(items.reduce((s,i) => s + (i.parsed.y||0), 0)) } },
      datalabels: { anchor:'center', align:'center', font:{size:11,weight:'bold'}, color:'#fff', formatter: v => v > 0 ? v : '', display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 }
    },
    scales: {
      x: { stacked:true, ticks:{font:{size:11}} },
      y: { stacked:true, beginAtZero:true, ticks:{stepSize:1,font:{size:10}}, title:{display:true,text:'จำนวนรถ',font:{size:10}} }
    }
  });

  // เสริม aging + sort แล้ว dispatch ให้ view ที่เลือก
  const enriched = f.map(r => ({ ...r, _slot: timeSlotStart(r['zone_time'] || ''), _aging: getAgingForBranch(r['source_code'] || '', r['source_name'] || '', r['port_id'] || '') }));
  enriched.sort((a, b) => a._slot !== b._slot ? a._slot - b._slot : (b._aging.maxDays || 0) - (a._aging.maxDays || 0));
  const grouped      = {};
  enriched.forEach(r => { const k = r['zone_time'] || '(ไม่ระบุเวลา)'; (grouped[k] = grouped[k] || []).push(r); });
  const slotsOrdered = Object.keys(grouped).sort((a, b) => timeSlotStart(a) - timeSlotStart(b));

  if (carView === 'card') {
    _renderCarCards(enriched, slotsOrdered, grouped, today, tomorrow);
  } else {
    _renderCarTable(enriched);
  }
  renderCarTags();
}
