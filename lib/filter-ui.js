// ============ lib/filter-ui.js — Filter form helpers (select, checkbox, tags) ============

const DATE_LBL = { '7':'7 วันล่าสุด','30':'30 วัน','90':'3 เดือน','180':'6 เดือน' };

function fillSel(el, vals) {
  const sv = el.value;
  el.innerHTML = '<option value="">ทั้งหมด</option>';
  vals.forEach(v => {
    const o = document.createElement('option');
    o.value = o.textContent = v;
    if (v === sv) o.selected = true;
    el.appendChild(o);
  });
}

function fillCBList(el, vals, prefix, labelFn) {
  el.innerHTML = '<button class="cb-drop-btn" type="button">ทั้งหมด</button><div class="cb-drop-panel"></div>';
  const btn   = el.querySelector('.cb-drop-btn');
  const panel = el.querySelector('.cb-drop-panel');
  panel.addEventListener('click', e => e.stopPropagation());
  const ctrl = document.createElement('div');
  ctrl.className = 'cb-drop-ctrl';
  ctrl.innerHTML = '<button type="button" class="cb-ctrl-all">ทั้งหมด</button><button type="button" class="cb-ctrl-none">ล้าง</button>';
  panel.appendChild(ctrl);
  vals.forEach(v => {
    const id          = prefix + v.replace(/\s+/g, '_');
    const displayText = labelFn ? labelFn(v) : v;
    const lbl         = document.createElement('label');
    lbl.className     = 'cb-item';
    lbl.innerHTML     = `<input type="checkbox" id="${id}" value="${v}" checked><span title="${displayText}">${displayText}</span>`;
    panel.appendChild(lbl);
  });
  function updBtn() {
    const sel = checkedVals(el).length, tot = vals.length;
    btn.textContent = sel === tot ? 'ทั้งหมด' : sel === 0 ? '(ไม่มี)' : `เลือก ${sel}/${tot}`;
  }
  el._updBtn = updBtn;
  panel.querySelectorAll('input').forEach(cb => cb.addEventListener('change', updBtn));
  ctrl.querySelector('.cb-ctrl-all').addEventListener('click', () => {
    panel.querySelectorAll('input').forEach(c => c.checked = true);
    updBtn();
    panel.querySelector('input')?.dispatchEvent(new Event('change'));
  });
  ctrl.querySelector('.cb-ctrl-none').addEventListener('click', () => {
    panel.querySelectorAll('input').forEach(c => c.checked = false);
    updBtn();
    panel.querySelector('input')?.dispatchEvent(new Event('change'));
  });
  btn.addEventListener('click', e => { e.stopPropagation(); el.classList.toggle('open'); });
}

function checkedVals(container) {
  return [...container.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
}

function getCBState(el) {
  const all = [...el.querySelectorAll('input[type=checkbox]')].map(c => c.value);
  const chk = [...el.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
  return { all, chk, isFiltered: chk.length < all.length && all.length > 0 };
}

function uncheckCB(el, value) {
  const cb = [...el.querySelectorAll('input[type=checkbox]')].find(c => c.value === value);
  if (cb) { cb.checked = false; if (el._updBtn) el._updBtn(); }
}

function checkAllCB(el) {
  el.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true);
  if (el._updBtn) el._updBtn();
}

function buildTagsHTML(container, tags, onClearAll) {
  if (!tags.length) { container.classList.add('hidden'); container.innerHTML = ''; return; }
  container.classList.remove('hidden');
  container.innerHTML = '';
  tags.forEach(t => {
    const el      = document.createElement('span');
    el.className  = 'ftag';
    el.innerHTML  = `<span class="ftag-lbl">${esc(t.label)}</span><span class="ftag-sep">:</span><span class="ftag-val" title="${esc(t.value)}">${esc(t.value)}</span><span class="ftag-x" title="ลบตัวกรองนี้">✕</span>`;
    el.querySelector('.ftag-x').addEventListener('click', e => { e.stopPropagation(); t.remove(); });
    container.appendChild(el);
  });
  const clrBtn      = document.createElement('button');
  clrBtn.className  = 'ftag-clrall';
  clrBtn.innerHTML  = '✕ Clear All';
  clrBtn.addEventListener('click', onClearAll);
  container.appendChild(clrBtn);
}
