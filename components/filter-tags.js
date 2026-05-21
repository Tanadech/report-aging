// ============ components/filter-tags.js ============
// Custom element <filter-tags>
// แถบ tag ที่แสดง filter ที่ active อยู่ — กด X เพื่อลบออก
//
// ใช้ buildTagsHTML() จาก lib/helpers.js เพื่อ inject content
// ตัว element นี้ทำหน้าที่เป็น wrapper และ expose เมธอด update()

class FilterTags extends HTMLElement {
  connectedCallback() {
    this.classList.add('fb-tags', 'hidden');
  }

  // tags = [{ label, value, remove }]
  // onClearAll = callback เมื่อกด Clear All
  update(tags, onClearAll) {
    buildTagsHTML(this, tags, onClearAll);
  }
}

customElements.define('filter-tags', FilterTags);
