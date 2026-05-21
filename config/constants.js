// ============ config/constants.js — ค่าคงที่ทั้งหมดของแอป ============

const SHEET_ID       = '1QtPntiJjvozzsfgsX3o2GSeOH5Gp223ZnHBcC6cKzRg';
const SHEET_IN_NAME  = 'POI IN';
const SHEET_UOT_NAME = 'POI OUT';

const PALETTE = [
  '#22d3ee','#3b82f6','#10b981','#f59e0b',
  '#a78bfa','#fb923c','#e879f9','#34d399',
  '#60a5fa','#fbbf24','#4ade80','#f472b6'
];

const STATUS_MAP = {
  'รอจัดสินค้า':        { cls:'s0', col:'#f87171' },
  'จัดสินค้าเรียบร้อย': { cls:'s1', col:'#60a5fa' },
  'ประมวลผลผ่าน':       { cls:'s2', col:'#34d399' },
  'รอประมวลผล':         { cls:'s3', col:'#fbbf24' },
  'ประมวลผลผิดพลาด':    { cls:'s4', col:'#c4b5fd' }
};

const SNAPSHOT = { POI_IN: [], POI_UOT: [] };
