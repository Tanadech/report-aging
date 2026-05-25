// ============ loaders/excel.js — โหลดไฟล์ Excel ทุกประเภท ============

function loadExcelFile(file, target) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      if (target === 'uot') dataUot = rows;
      else                  dataIn  = rows;
      const now   = new Date();
      const b     = document.getElementById('sbadge');
      b.className = 'sbadge live';
      b.innerHTML = '<span class="dot"></span>📂 FILE';
      document.getElementById('meta').textContent =
        (target === 'uot' ? 'IMPORTED' : 'DOMESTIC') + ': ' + file.name + ' | ' + now.toLocaleString('th-TH');
      document.getElementById('alertbox').classList.remove('show');
      const updEl = document.getElementById(target === 'uot' ? 'out-upd' : 'in-upd');
      if (updEl) { updEl.textContent = 'อัพเดท: ' + now.toLocaleString('th-TH'); updEl.classList.add('show'); }
      rebuild();
    } catch (err) { alert('โหลดไฟล์ไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function loadCarFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      dataCar = rows;
      const now   = new Date();
      const updEl = document.getElementById('car-upd');
      if (updEl) { updEl.textContent = '🚛 อัพเดท: ' + now.toLocaleString('th-TH'); updEl.classList.add('show'); }
      rebuildCar();
      renderCar();
      _tlWhFilter = null;
      _fillPayWhFilter();
      _renderPayCarKPIs();
      _renderPayTimeline();
      renderPayCarTable();
      document.querySelectorAll('.tb').forEach(b => b.classList.remove('act'));
      document.querySelectorAll('.tc').forEach(c => c.classList.remove('act'));
      document.querySelector('.tb[data-tab="car"]').classList.add('act');
      document.getElementById('tc-car').classList.add('act');
      setTimeout(() => Object.values(CR).forEach(c => c.resize && c.resize()), 80);
    } catch (err) { alert('โหลดไฟล์รถไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function loadAgingOutFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      dataAgingOut = rows;
      const now    = new Date();
      const b      = document.getElementById('sbadge');
      b.className  = 'sbadge live';
      b.innerHTML  = '<span class="dot"></span>📤 AGING OUT';
      document.getElementById('meta').textContent =
        'AGING OUTBOUND: ' + file.name + ' | ' + now.toLocaleString('th-TH') +
        ' (' + rows.length + ' รายการ)';
      document.getElementById('alertbox').classList.remove('show');
      fillPayFilters();
      renderPay();
      // switch to pay tab
      document.querySelectorAll('.tb').forEach(b => b.classList.remove('act'));
      document.querySelectorAll('.tc').forEach(c => c.classList.remove('act'));
      document.querySelector('.tb[data-tab="pay"]').classList.add('act');
      document.getElementById('tc-pay').classList.add('act');
      setTimeout(() => Object.values(CR).forEach(c => c.resize && c.resize()), 80);
    } catch (err) { alert('โหลดไฟล์ Aging OUTBOUND ไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function loadPalletFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'array', cellDates:true, dateNF:'dd/mm/yyyy' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
      if (!rows.length) { alert('ไม่พบข้อมูลในไฟล์ ' + file.name); return; }
      dataPallet = rows;
      rebuildPalletMap();
      const now   = new Date();
      const b     = document.getElementById('sbadge');
      b.className = 'sbadge live';
      b.innerHTML = '<span class="dot"></span>📦 PALLET';
      document.getElementById('meta').textContent =
        'PALLET IN: ' + file.name + ' | ' + now.toLocaleString('th-TH') +
        ' (' + rows.length + ' แถว / ' + Object.keys(palletByOnetime).length + ' onetime)';
      document.getElementById('alertbox').classList.remove('show');
      if (dataIn.length) renderIn();
    } catch (err) { alert('โหลดไฟล์พาเลทไม่สำเร็จ: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}
