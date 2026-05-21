// ============ lib/array.js — Array/data helpers ============

function groupBy(arr, k) {
  return arr.reduce((m, r) => {
    const v = r[k] || '(ไม่ระบุ)';
    (m[v] = m[v] || []).push(r);
    return m;
  }, {});
}

function uniqCount(arr, k) {
  return new Set(arr.map(r => r[k] || '').filter(Boolean)).size;
}

function uniqVals(arr, k) {
  return [...new Set(arr.map(r => r[k] || '').filter(Boolean))].sort();
}
