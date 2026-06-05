// ============ config/constants.js — ค่าคงที่ทั้งหมดของแอป ============

const SHEET_ID       = '1QtPntiJjvozzsfgsX3o2GSeOH5Gp223ZnHBcC6cKzRg';
const SHEET_IN_NAME  = 'POI IN';
const SHEET_UOT_NAME = 'POI OUT';

const PALETTE = [
  '#00B8D9','#22C55E','#fda92d','#FFAB00',
  '#7C3AED','#FF5630','#e879f9','#1677ff',
  '#4ade80','#B66816','#a78bfa','#f472b6'
];

const STATUS_MAP = {
  'รอจัดสินค้า':        { cls:'s0', col:'#FF5630' },
  'จัดสินค้าเรียบร้อย': { cls:'s1', col:'#00B8D9' },
  'ประมวลผลผ่าน':       { cls:'s2', col:'#22C55E' },
  'รอประมวลผล':         { cls:'s3', col:'#FFAB00' },
  'ประมวลผลผิดพลาด':    { cls:'s4', col:'#7C3AED' }
};

const SNAPSHOT = { POI_IN: [], POI_UOT: [] };
