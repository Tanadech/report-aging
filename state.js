// ============ Global State — ตัวแปรข้อมูลหลักของแอป ============
// อ่านได้จากทุกไฟล์ เพราะเป็น global scope

let dataIn      = [];   // ข้อมูล POI IN (DOMESTIC)
let dataUot     = [];   // ข้อมูล POI OUT (IMPORTED)
let dataCar     = [];   // ข้อมูลคิวรถ (OUTBOUND)
let dataPallet  = [];   // ข้อมูลพาเลท (IN P)
let palletByOnetime = {}; // { onetime_str: จำนวนบาร์โค้ด }

let inGrid  = null;      // gridjs instance สำหรับ DOMESTIC tab
let carView = 'card';    // 'card' | 'table' — view ของ CAR tab

const CR = {};           // Chart registry: { chartId: Chart instance }
