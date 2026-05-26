// ============ components/app-header.js ============
// Custom element <app-header>
// ใช้แทน <header class="hdr"> ทั้งหมด รวมปุ่ม upload และ folder picker

class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="hdr">
        <div class="hdr-left">
          <div class="hdr-icon">📦</div>
          <div>
            <h1>รายงานการติดตามเอกสารขอโอน IMPORTED & DOMESTIC</h1>
            <div class="hdr-sub" id="meta">กำลังโหลดข้อมูล...</div>
          </div>
        </div>
        <div class="hdr-right">
          <span id="sbadge" class="sbadge snap"><span class="dot"></span>SNAPSHOT</span>
          <div class="hdr-sep"></div>
          <div class="file-group">
            <span class="file-group-lbl">โหลดไฟล์ Excel:</span>
            <label class="btn-rf btn-file" title="เลือกไฟล์ IMPORTED (ต่างประเทศ)">
              📂 IMPORTED<input type="file" id="file-uot" accept=".xlsx,.xls" style="display:none">
            </label>
            <label class="btn-rf btn-file" title="เลือกไฟล์ DOMESTIC (ภายในประเทศ)">
              📂 DOMESTIC<input type="file" id="file-in" accept=".xlsx,.xls" style="display:none">
            </label>
            <label class="btn-rf btn-file" title="เลือกไฟล์ Car.xlsx (คิวรถ OUTBOUND)">
              🚛 OUTBOUND<input type="file" id="file-car" accept=".xlsx,.xls" style="display:none">
            </label>
            <label class="btn-rf btn-file" title="เลือกไฟล์ IN P xxxx.xlsx (พาเลท DOMESTIC)">
              📦 PALLET IN<input type="file" id="file-pallet" accept=".xlsx,.xls" style="display:none">
            </label>
          </div>
          <div class="hdr-sep"></div>
          <button class="btn-rf" id="btn-folder" title="เลือกโฟลเดอร์ data_dc — ระบบจะโหลดทุกไฟล์อัตโนมัติ">
            📁 <span id="btn-folder-txt">เลือกโฟลเดอร์ข้อมูล</span>
          </button>
          <div class="hdr-sep"></div>
          <button class="btn-rf" id="btn-theme">☀️ Light</button>
        </div>
      </header>
    `;

    // ── File input events (ฟังก์ชันใน lib/data-loader.js) ──
    this.querySelector('#file-uot').addEventListener('change', e => {
      if (e.target.files[0]) loadExcelFile(e.target.files[0], 'uot');
      e.target.value = '';
    });
    this.querySelector('#file-in').addEventListener('change', e => {
      if (e.target.files[0]) loadExcelFile(e.target.files[0], 'in');
      e.target.value = '';
    });
    this.querySelector('#file-car').addEventListener('change', e => {
      if (e.target.files[0]) loadCarFile(e.target.files[0]);
      e.target.value = '';
    });
    this.querySelector('#file-pallet').addEventListener('change', e => {
      if (e.target.files[0]) loadPalletFile(e.target.files[0]);
      e.target.value = '';
    });

    // ── Folder button (ฟังก์ชันใน lib/data-loader.js) ──
    this.querySelector('#btn-folder').addEventListener('click', reloadFolder);
  }
}

customElements.define('app-header', AppHeader);
