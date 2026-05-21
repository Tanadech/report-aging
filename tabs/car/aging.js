// ============ tabs/car/aging.js — คำนวณ aging โดย join POI IN + POI OUT ตามสาขา/คลัง ============

function getAgingForBranch(brAbr, brFullName, whFilter) {
  const norm      = s => String(s == null ? '' : s).trim().toLowerCase();
  const whU       = s => String(s == null ? '' : s).trim().toUpperCase();
  const abrN      = norm(brAbr);
  const whN       = whU(whFilter);
  const fullNameRaw = String(brFullName || '').trim() || BR_ABR_MAP[String(brAbr || '').trim()] || '';
  const fullN     = norm(fullNameRaw);

  const inRows  = abrN  ? dataIn.filter(r  => norm(r['ชื่อย่อสาขา']) === abrN  && (!whN || whU(getWH(r))              === whN)) : [];
  const outRows = fullN ? dataUot.filter(r => norm(r['ชื่อสาขา'])    === fullN && (!whN || whU(r['คลังสินค้า'])       === whN)) : [];

  const inDocs  = uniqCount(inRows,  'เลขที่เอกสาร POI');
  const inMax   = inRows.length  ? Math.max(...inRows.map(r  => num(r['วันคงค้าง'])))  : 0;
  const outDocs = uniqCount(outRows, 'เลขที่เอกสารขอโอน');
  const outMax  = outRows.length ? Math.max(...outRows.map(r => num(r['วันค้างส่ง']))) : 0;

  return { inDocs, inMax, outDocs, outMax, totalDocs: inDocs + outDocs, maxDays: Math.max(inMax, outMax) };
}
