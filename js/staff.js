function renderPyramid() {
  const el = document.getElementById("pyramid");
  if (!el) return;
  el.innerHTML = HIERARCHY.map((grade) => `
    <div class="pyramid-tier" data-order="${grade.order}">
      <div class="rank-badge ${grade.isDirezione ? "is-direzione" : ""}">
        <span class="rank-order">${grade.order}</span>
        <span>${gradeLabel(grade.key)}</span>
      </div>
      ${grade.order < HIERARCHY.length ? '<div class="rank-connector"></div>' : ""}
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", renderPyramid);
document.addEventListener("i18n:changed", renderPyramid);
