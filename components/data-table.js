// ============ components/data-table.js ============
// Custom element <data-table>
// กล่องหุ้ม table แบบ grouped (UOT) พร้อม pagination ในตัว
//
// Methods:
//   el.setHTML(htmlString)   — inject table HTML เข้าไปใน wrapper
//   el.setCount(n, page, pages) — อัพเดท label + disable ปุ่ม

class DataTable extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="tbl-hdr">
        <slot name="title"></slot>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="tbl-cnt" data-count></span>
          <div class="tbl-pg">
            <button data-prev>◀</button>
            <span data-pginfo></span>
            <button data-next>▶</button>
          </div>
        </div>
      </div>
      <div class="tbl-wrap">
        <div data-body></div>
      </div>
    `;
    this.querySelector('[data-prev]').addEventListener('click', () => this.dispatchEvent(new CustomEvent('prev-page')));
    this.querySelector('[data-next]').addEventListener('click', () => this.dispatchEvent(new CustomEvent('next-page')));
  }

  // inject HTML ของตารางจากภายนอก
  setHTML(html) {
    const body = this.querySelector('[data-body]');
    if (body) body.innerHTML = html;
  }

  // อัพเดท counter + pagination controls
  setCount(total, page, pages) {
    const cnt    = this.querySelector('[data-count]');
    const pgInfo = this.querySelector('[data-pginfo]');
    const prev   = this.querySelector('[data-prev]');
    const next   = this.querySelector('[data-next]');
    if (cnt)    cnt.textContent    = `(${fmtN(total)} รายการ)`;
    if (pgInfo) pgInfo.textContent = `หน้า ${page + 1}/${pages}`;
    if (prev)   prev.disabled      = page === 0;
    if (next)   next.disabled      = page >= pages - 1;
  }
}

customElements.define('data-table', DataTable);
