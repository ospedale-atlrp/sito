async function loadPhotos() {
  const grid = document.getElementById("gallery-grid");
  const empty = document.getElementById("gallery-empty");
  try {
    const { photos } = await apiFetch("/api/photos");
    if (!photos.length) {
      grid.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    grid.innerHTML = photos.map((p) => `
      <div class="gallery-card">
        <div class="photo-wrap"><img src="${API_BASE}${p.url}" alt="${escapeHtml(p.caption || "")}" loading="lazy" /></div>
        ${p.caption ? `<div class="caption">${escapeHtml(p.caption)}</div>` : ""}
      </div>
    `).join("");
  } catch {
    empty.style.display = "block";
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function setupUploadIfDirezione() {
  const token = Auth.getToken();
  if (!token) return;
  try {
    const { user } = await apiFetch("/api/auth/me", { auth: true });
    if (!user.isDirezione || user.mustChangePassword) return;

    const btn = document.getElementById("btn-toggle-upload");
    const panel = document.getElementById("upload-panel");
    btn.style.display = "inline-flex";
    btn.addEventListener("click", () => panel.classList.toggle("open"));

    document.getElementById("upload-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("upload-error");
      const successEl = document.getElementById("upload-success");
      errorEl.classList.remove("show");
      successEl.classList.remove("show");

      const form = e.target;
      const formData = new FormData(form);
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = I18N.t("gallery.upload.uploading");

      try {
        await apiFetch("/api/photos", { method: "POST", body: formData, auth: true, isForm: true });
        successEl.textContent = I18N.t("gallery.upload.success");
        successEl.classList.add("show");
        form.reset();
        loadPhotos();
      } catch {
        errorEl.textContent = I18N.t("gallery.upload.error");
        errorEl.classList.add("show");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = I18N.t("gallery.upload.submit");
      }
    });
  } catch { /* nessuna sessione valida: la persona resta in sola visualizzazione */ }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPhotos();
  setupUploadIfDirezione();
});
