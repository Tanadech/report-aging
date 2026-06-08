// ============ modals/branch-modal.js — Branch Aging Detail Modal ============
// ใช้ร่วมกันทั้ง IMPORTED (openUotBranchDetail) และ DOMESTIC (openInBranchDetail)

function closeBranchModal() {
  document.getElementById('branch-modal').classList.remove('show');
}

document.getElementById('bm-close').addEventListener('click', closeBranchModal);
document.getElementById('branch-modal').addEventListener('click', e => {
  if (e.target.id === 'branch-modal') closeBranchModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('branch-modal').classList.contains('show'))
    closeBranchModal();
});
