// ============ Global State — ตัวแปรข้อมูลหลักของแอป ============
// อ่านได้จากทุกไฟล์ เพราะเป็น global scope

let dataIn        = [];   // ข้อมูล POI IN (DOMESTIC)
let dataUot       = [];   // ข้อมูล POI OUT (IMPORTED)
let dataCar       = [];   // ข้อมูลคิวรถ (OUTBOUND)
let dataPallet    = [];   // ข้อมูลพาเลท (IN P)
let dataAgingOutDom = []; // เอกสารจ่าย OUTBOUND ในประเทศ  (Aging OUTBOUND DOM)
let dataAgingOutImp = []; // เอกสารจ่าย OUTBOUND ต่างประเทศ (Aging OUTBOUND IMP)
let dataAgingOut    = []; // รวม DOM + IMP (อัพเดทอัตโนมัติ ด้วย _rebuildCombinedAging)
let palletByOnetime = {}; // { onetime_str: จำนวนบาร์โค้ด }

let inGrid  = null;      // gridjs instance สำหรับ DOMESTIC tab
let carView = 'card';    // 'card' | 'table' — view ของ CAR tab

const CR = {};           // Chart registry: { chartId: Chart instance }
