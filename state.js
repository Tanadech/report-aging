// ============ state.js — Global mutable state ============
// Import object นี้ในทุกไฟล์ แล้วใช้ state.dataIn, state.CR ฯลฯ
// อย่า destructure ออกมาตรงๆ เพราะจะได้ snapshot ไม่ใช่ live reference

export const state = {
  dataIn:          [],    // POI IN (DOMESTIC)
  dataUot:         [],    // POI OUT (IMPORTED)
  dataCar:         [],    // คิวรถ (OUTBOUND)
  dataPallet:      [],    // พาเลท (IN P)
  palletByOnetime: {},    // { onetime_str: จำนวนบาร์โค้ด }

  inGrid:  null,          // gridjs instance (DOMESTIC tab)
  carView: 'card',        // 'card' | 'table'
  CR:      {},            // Chart registry { chartId: Chart instance }
};
