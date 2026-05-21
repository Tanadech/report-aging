// ============ components/stat-card.js ============
// Custom element <stat-card>
// แสดง KPI card เดี่ยว — ใช้แทน <div class="kpi ...">
//
// Attributes:
//   label    — ชื่อ KPI
//   value    — ตัวเลข (string)
//   unit     — หน่วย
//   variant  — "" | "ok" | "warn" | "alr" | "inf"
//   data-kpi — ถ้ามี ใช้สำหรับ click → openKpiDetail

class StatCard extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'value', 'unit', 'variant'];
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }

  render() {
    const variant = this.getAttribute('variant') || '';
    this.className = 'kpi' + (variant ? ' ' + variant : '');
    this.innerHTML = `
      <div class="kpi-lbl">${this.getAttribute('label')  || ''}</div>
      <div class="kpi-val">${this.getAttribute('value')  || '0'}</div>
      <div class="kpi-unit">${this.getAttribute('unit') || ''}</div>
    `;
  }
}

customElements.define('stat-card', StatCard);
