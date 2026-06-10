// ============ app.js ============
// Main entry point — wires everything together after DOM is ready
// ลำดับการโหลด: config → state → lib → components → tabs → modals → app.js

// ============ Rebuild ============
// เรียกหลังจากโหลด data ใหม่ — populate filters แล้ว render ทุก tab
function rebuild() {
  // UOT filters
  fillCBList(document.getElementById('u-fz-list'), uniqVals(dataUot, 'Zone ID'), 'ufz_');
  document.getElementById('u-fz-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderUot));
  fillCBList(document.getElementById('u-fb-list'), uniqVals(dataUot, 'ชื่อสาขา'), 'ufb_');
  document.getElementById('u-fb-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderUot));
  fillSel(document.getElementById('u-fw'), uniqVals(dataUot, 'คลังสินค้า'));
  fillCBList(document.getElementById('u-fs-list'), uniqVals(dataUot, 'สถานะประมวลผล'), 'ufs_');
  document.getElementById('u-fs-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderUot));

  // IN filters
  fillCBList(document.getElementById('i-fz-list'), uniqVals(dataIn, 'Zone Name'), 'ifz_');
  document.getElementById('i-fz-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderIn));
  // value = ชื่อย่อสาขา, display = ชื่อสาขาเต็ม
  fillCBList(document.getElementById('i-fb-list'), uniqVals(dataIn, 'ชื่อย่อสาขา'), 'ifb_', v => BR_ABR_MAP[v] || v);
  document.getElementById('i-fb-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderIn));
  fillSel(document.getElementById('i-fv'), uniqVals(dataIn, 'ชื่อผู้จำหน่าย'));
  fillCBList(document.getElementById('i-fw-list'), [...new Set(dataIn.map(r => getWH(r)).filter(v => v !== '(อื่นๆ)'))].sort(), 'ifw_');
  document.getElementById('i-fw-list').querySelectorAll('input').forEach(cb => cb.addEventListener('change', renderIn));

  if (dataUot.length)      renderUot();
  if (dataIn.length)       renderIn();
  // re-render CAR เพื่อ refresh aging เมื่อโหลด POI ใหม่
  if (dataCar.length)      renderCar();
  // refresh Pay car table เมื่อ aging data เปลี่ยน
  if (dataAgingOut.length) renderPayCarTable();
  if (dataUot.length || dataIn.length) { fillTodoFilters(); renderTodo(); }
}

// ============ Filter events — UOT ============
['u-fdate', 'u-fw'].forEach(id => document.getElementById(id).addEventListener('change', renderUot));
['u-fd1', 'u-fd2'].forEach(id => document.getElementById(id).addEventListener('input', renderUot));

document.getElementById('u-clr').addEventListener('click', () => {
  const fzEl = document.getElementById('u-fz-list');
  const fsEl = document.getElementById('u-fs-list');
  fzEl.querySelectorAll('input').forEach(c => c.checked = true); if (fzEl._updBtn) fzEl._updBtn();
  fsEl.querySelectorAll('input').forEach(c => c.checked = true); if (fsEl._updBtn) fsEl._updBtn();
  checkAllCB(document.getElementById('u-fb-list'));
  document.getElementById('u-fw').value    = '';
  document.getElementById('u-fdate').value = '';
  document.getElementById('u-fd1').value   = '';
  document.getElementById('u-fd2').value   = '';
  renderUot();
});

// ============ Filter events — IN ============
['i-fv'].forEach(id => document.getElementById(id).addEventListener('change', renderIn));
['i-fd1', 'i-fd2'].forEach(id => document.getElementById(id).addEventListener('input', renderIn));

document.getElementById('i-clr').addEventListener('click', () => {
  const fzEl = document.getElementById('i-fz-list');
  const fwEl = document.getElementById('i-fw-list');
  fzEl.querySelectorAll('input').forEach(c => c.checked = true); if (fzEl._updBtn) fzEl._updBtn();
  fwEl.querySelectorAll('input').forEach(c => c.checked = true); if (fwEl._updBtn) fwEl._updBtn();
  checkAllCB(document.getElementById('i-fb-list'));
  document.getElementById('i-fv').value  = '';
  document.getElementById('i-fd1').value = '';
  document.getElementById('i-fd2').value = '';
  renderIn();
});

// ============ Filter events — CAR ============
document.getElementById('c-fdate').addEventListener('change', renderCar);
document.getElementById('c-clr').addEventListener('click', () => {
  document.getElementById('c-fdate').value = 'todaytomorrow';
  ['c-fwh-list', 'c-fct-list', 'c-fwk-list', 'c-fbr-list', 'c-fst-list'].forEach(id => checkAllCB(document.getElementById(id)));
  renderCar();
});

// View toggle (card / table)
document.querySelectorAll('.view-toggle button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.view-toggle button').forEach(x => x.classList.remove('act'));
  b.classList.add('act');
  carView = b.dataset.cview;
  renderCar();
}));

// ============ Tabs ============
document.querySelectorAll('.tb').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tb').forEach(b => b.classList.remove('act'));
    document.querySelectorAll('.tc').forEach(c => c.classList.remove('act'));
    btn.classList.add('act');
    document.getElementById('tc-' + btn.dataset.tab).classList.add('act');
    const ttl = document.getElementById('top-bar-ttl');
    if (ttl) ttl.textContent = btn.dataset.title || '';
    setTimeout(() => {
      if (btn.dataset.tab === 'uot'  && dataUot.length)                        { renderUot();  }
      if (btn.dataset.tab === 'in'   && dataIn.length)                         { renderIn();   }
      if (btn.dataset.tab === 'car'  && dataCar.length)                        { renderCar();  }
      if (btn.dataset.tab === 'pay'  && dataAgingOut.length)                   { renderPay();  }
      if (btn.dataset.tab === 'todo' && (dataUot.length || dataIn.length))     { renderTodo(); }
    }, 80);
  });
});

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.cb-drop.open').forEach(d => d.classList.remove('open'));
});

// ============ Light Mode (fixed) ============
Chart.defaults.color                       = '#637381';
Chart.defaults.borderColor                 = 'rgba(145,158,171,.2)';
Chart.defaults.plugins.legend.labels.color = '#1C252E';


// Search in IMPORTED table
document.getElementById('u-fsearch').addEventListener('input', () => { uotPage = 0; renderUotTable(); });
// Search in DOMESTIC table
document.getElementById('i-fsearch')?.addEventListener('input', () => { inPage = 0; renderInTable(); });
// Filters in Todo tab
document.getElementById('todo-search')?.addEventListener('input', renderTodo);
['td-fw', 'td-fb'].forEach(id => document.getElementById(id)?.addEventListener('change', renderTodo));
['td-fd1', 'td-fd2'].forEach(id => document.getElementById(id)?.addEventListener('input', renderTodo));
document.getElementById('todo-clr')?.addEventListener('click', () => {
  document.getElementById('todo-search').value = '';
  document.getElementById('td-fw').value = '';
  document.getElementById('td-fb').value = '';
  document.getElementById('td-fd1').value = '';
  document.getElementById('td-fd2').value = '';
  renderTodo();
});

// ============ Init ============
initChartDefaults();
initUotPagination();
initInPagination();
initPayTab();
dataIn        = [];
dataUot       = [];
dataCar       = [];
dataAgingOut  = [];
setStatus('nodata');
rebuild();
rebuildCar();
renderCar();
