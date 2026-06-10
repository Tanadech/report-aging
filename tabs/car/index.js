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

// ── ตารางสินค้าตกเที่ยว OUTBOUND ──
function _renderStuckDocs(rows) {
  const tblEl = document.getElementById('c-stuck-tbl');
  const cntEl = document.getElementById('c-stuck-cnt');
  if (!tblEl) return;

  const stuck = rows.filter(r => isChecked(r['รถตกค้าง']));
  if (cntEl) cntEl.textContent = stuck.length ? `(${fmtN(stuck.length)} คัน)` : '';

  if (!stuck.length) {
    tblEl.innerHTML = `<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px;">
      <span style="font-size:26px;display:block;margin-bottom:6px;opacity:.4;">✅</span>ไม่มีรถตกค้างในมุมมองนี้
    </div>`;
    return;
  }

  const sorted = [...stuck].sort((a, b) => {
    const da = parseCarDate(a['search_date']), db = parseCarDate(b['search_date']);
    if (da && db && da.getTime() !== db.getTime()) return db - da;
    return timeSlotStart(a['zone_time'] || '') - timeSlotStart(b['zone_time'] || '');
  });

  const ST_CLS = { 'มาก่อนเวลา':'s2','มาหลังเวลานัด':'s0','ยกเลิกรับงาน':'s0','ยังไม่มาลงคิว':'s3' };

  let html = `<div class="tbl-wrap"><table class="gtbl"><thead><tr>
    <th>เลขที่เอกสาร OUTBOUND</th>
    <th>สาขาปลายทาง</th>
    <th>คลัง</th>
    <th>วันที่คิวงาน</th>
    <th>ช่วงเวลา</th>
    <th>ประเภทงาน</th>
    <th>ประเภทรถ</th>
    <th>ทะเบียน</th>
    <th>สถานะลงคิว</th>
  </tr></thead><tbody>`;

  sorted.forEach(r => {
    const st    = r['สถานะลงคิว'] || '';
    const stCls = ST_CLS[st] || 's5';
    const rcChip = r['rc_type_product']
      ? `<span style="background:rgba(253,169,45,.15);border:1px solid rgba(253,169,45,.3);padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;color:#fda92d;">${esc(r['rc_type_product'])}</span>`
      : '-';
    html += `<tr>
      <td class="doc-cell" style="white-space:nowrap;">${esc(r['doc_no'] || '-')}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((r['source_name'] || '').replace(/^สาขา\s*/, ''))}</td>
      <td style="text-align:center;font-weight:700;">${esc(r['port_id'] || '-')}</td>
      <td style="font-size:11px;color:var(--muted);white-space:nowrap;">${esc(r['search_date'] || '-')}</td>
      <td style="font-weight:700;color:#00B8D9;white-space:nowrap;">${esc(r['zone_time'] || '-')}</td>
      <td>${rcChip}</td>
      <td style="font-size:11px;">${esc(r['truck_info'] || '-')}</td>
      <td style="font-family:monospace;font-size:11.5px;font-weight:700;background:#1e293b;border:1px solid #475569;padding:2px 8px;border-radius:4px;color:#f1f5f9;">${esc(r['truck_registration'] || '-')}</td>
      <td>${st ? `<span class="spill ${stCls}">${esc(st)}</span>` : '-'}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  tblEl.innerHTML = html;
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

  // ตารางสินค้าตกเที่ยว (แทน Timeline chart)
  _renderStuckDocs(f);

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
