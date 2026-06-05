// ============ components/stat-card.js ============
// Custom element <stat-card>
//
// Attributes:
//   label    — ชื่อ KPI
//   value    — ตัวเลข (string)
//   unit     — หน่วย
//   variant  — "" | "ok" | "warn" | "alr" | "inf"
//   subtitle — ข้อความรองใต้ label (optional)
//   badge    — ป้ายกำกับข้างๆ label เช่น "วิกฤต" (optional)
//   icon     — emoji/ข้อความ/URL override ในกล่อง icon (optional)
//   pct      — เปอร์เซ็นต์ 0-100 สำหรับ donut ring + progress bar (optional)
//   data-kpi — ถ้ามี ใช้สำหรับ click → openKpiDetail

const _KPI_ICONS = {
  alr:  '🚨',
  warn: '⏱️',
  ok:   '✅',
  inf:  '📦',
  '':   '📋',
};

class StatCard extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'value', 'unit', 'variant', 'subtitle', 'badge', 'icon', 'pct', 'list'];
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }

  render() {
    const variant  = this.getAttribute('variant')  || '';
    const label    = this.getAttribute('label')    || '';
    const value    = this.getAttribute('value')    || '0';
    const unit     = this.getAttribute('unit')     || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const badge    = this.getAttribute('badge')    || '';
    const pctRaw   = this.getAttribute('pct');
    const pct      = pctRaw !== null ? parseFloat(pctRaw) : NaN;
    const hasPct   = !isNaN(pct);

    const iconAttr    = this.getAttribute('icon');
    const iconContent = iconAttr
      ? (/^(https?:\/\/|\.\/|\/|data:image)/.test(iconAttr)
          ? `<img src="${iconAttr}" class="kpi-ico-img" alt="" draggable="false">`
          : iconAttr)
      : (_KPI_ICONS[variant] || _KPI_ICONS['']);

    const listRaw   = this.getAttribute('list') || '';
    const listItems = listRaw ? listRaw.split('|').filter(Boolean) : [];
    const _s = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const listHtml  = listItems.length
      ? `<div class="kpi-list">${listItems.map(s => `<div>${_s(s)}</div>`).join('')}</div>`
      : '';

    this.className = 'kpi' + (variant ? ' ' + variant : '');

    const badgeHtml = badge    ? `<span class="kpi-badge">${badge}</span>` : '';
    const subHtml   = subtitle ? `<div class="kpi-sub">${subtitle}</div>` : '';

    if (hasPct) {
      // ── Layout แบบเต็ม: มี ring + progress bar ──
      const p = Math.min(Math.max(pct, 0), 100);
      const ringHtml = `<svg class="kpi-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle class="kpi-ring-bg" cx="18" cy="18" r="15.9" fill="none" stroke-width="3"/>
        <circle class="kpi-ring-fg" cx="18" cy="18" r="15.9" fill="none" stroke-width="3"
          stroke-dasharray="${p.toFixed(1)} ${(100 - p).toFixed(1)}"
          stroke-dashoffset="25" stroke-linecap="round"/>
        <text class="kpi-ring-txt" x="18" y="18" text-anchor="middle" dy=".35em"
          font-size="8.5" font-weight="700">${Math.round(p)}%</text>
      </svg>`;
      this.innerHTML = `
        <div class="kpi-hd">
          <div class="kpi-ico">${iconContent}</div>
          <div class="kpi-titles">
            <div class="kpi-lbl">${label}${badgeHtml ? ' ' + badgeHtml : ''}</div>
            ${subHtml}
          </div>
          ${ringHtml}
          ${listHtml}
        </div>
        <div class="kpi-prog"><div class="kpi-bar" style="width:${p.toFixed(1)}%"></div></div>
        <div class="kpi-ft">
          <div><span class="kpi-val">${value}</span><span class="kpi-unit">&thinsp;${unit}</span></div>
          <span class="kpi-pct-ft">▌ ${pct.toFixed(1)}%</span>
        </div>`;
    } else {
      // ── Layout กระชับ: icon + label + value ในบล็อกเดียว ──
      this.innerHTML = `
        <div class="kpi-hd">
          <div class="kpi-ico">${iconContent}</div>
          <div class="kpi-main">
            <div class="kpi-lbl">${label}${badgeHtml ? ' ' + badgeHtml : ''}</div>
            ${subHtml}
            <div class="kpi-val-row">
              <span class="kpi-val">${value}</span>
              <span class="kpi-unit">&thinsp;${unit}</span>
            </div>
          </div>
          ${listHtml}
        </div>`;
    }
  }
}

customElements.define('stat-card', StatCard);
