/* Area cittadino: simulazione locale del collegamento Telegram.
   Il profilo è salvato solo nel browser finché non verrà collegato un backend. */
const PM_CITIZEN_KEY = "pm_telegram_citizen";

function pmCitizen() {
  try { return JSON.parse(localStorage.getItem(PM_CITIZEN_KEY) || "null"); }
  catch (e) { return null; }
}
function pmSaveCitizen(citizen) { localStorage.setItem(PM_CITIZEN_KEY, JSON.stringify(citizen)); }
function pmCitizenNotifications() {
  const c = pmCitizen();
  if (!c || typeof pmLoadNotifications !== "function") return [];
  return pmLoadNotifications().filter(function (n) { return n.target === "citizen:" + c.id; });
}
function pmAvatarHtml(el, citizen) {
  if (!el || !citizen) return;
  el.innerHTML = citizen.photo ? '<img src="' + citizen.photo + '" alt="Foto profilo Telegram">' : '<span>' + citizen.username.slice(0, 1).toUpperCase() + '</span>';
}

function pmRenderCitizenArea() {
  const citizen = pmCitizen();
  const login = document.getElementById("telegram-login-panel");
  const dashboard = document.getElementById("citizen-dashboard");
  if (!login || !dashboard) return;
  login.hidden = !!citizen; dashboard.hidden = !citizen;
  if (!citizen) return;
  document.getElementById("citizen-name").textContent = "@" + citizen.username;
  pmAvatarHtml(document.getElementById("citizen-avatar"), citizen);
  pmRenderCitizenDocuments();
  pmRenderCitizenNotifications();
}

function pmRenderCitizenDocuments() {
  const el = document.getElementById("citizen-documents"); const citizen = pmCitizen();
  if (!el || !citizen || typeof pmLoadReservations !== "function") return;
  const docs = pmLoadReservations().filter(function(r) { return r.citizenId === citizen.id; }).reverse();
  if (!docs.length) { el.innerHTML = '<div class="reservations-empty">Non hai ancora documenti compilati.</div>'; return; }
  el.innerHTML = docs.map(function(r) {
    const label = PM_RESERVATION_LABELS[r.type] || r.type;
    const approved = r.status === "approved";
    const staffNote = r.staffNote ? '<p class="document-message">' + r.staffNote + '</p>' : '';
    return '<article class="document-row"><div><span class="reservation-tag ' + (r.type === "cambio_sesso" ? "tag-sesso" : "") + '">' + label + '</span><h3>' + label + '</h3><p>Compilato il ' + new Date(r.createdAt).toLocaleDateString("it-IT") + '</p>' + staffNote + '</div><span class="status-badge ' + (approved ? "approved" : "pending") + '">' + (approved ? "Approvato" : "In attesa di approvazione") + '</span></article>';
  }).join("");
}

function pmRenderCitizenNotifications() {
  const count = document.getElementById("citizen-notification-count"); const list = document.getElementById("citizen-notifications-list");
  if (!count || !list) return;
  const notices = pmCitizenNotifications().slice().reverse();
  count.textContent = notices.filter(function(n) { return !n.read; }).length;
  count.hidden = count.textContent === "0";
  list.innerHTML = notices.length ? notices.map(function(n) { return '<div class="notification-item"><b>' + n.title + '</b><span>' + n.body + '</span></div>'; }).join("") : '<div class="notification-item">Nessun avviso.</div>';
}

document.addEventListener("DOMContentLoaded", function() {
  const connect = document.getElementById("telegram-connect"), connectForm = document.getElementById("telegram-connect-form");
  if (connect) connect.addEventListener("click", function() { connectForm.hidden = false; document.getElementById("telegram-name").focus(); });
  const cancel = document.getElementById("telegram-cancel"); if (cancel) cancel.addEventListener("click", function() { connectForm.hidden = true; });
  const loginForm = document.getElementById("citizen-login-form");
  if (loginForm) loginForm.addEventListener("submit", function(e) {
    e.preventDefault(); const username = loginForm.username.value.trim().replace(/^@/, ""); const photoInput = loginForm.photo;
    if (!username) return;
    const finish = function(photo) { pmSaveCitizen({ id: "tg_" + username.toLowerCase(), username: username, photo: photo || "" }); pmRenderCitizenArea(); connectForm.hidden = true; };
    if (photoInput.files && photoInput.files[0]) { const reader = new FileReader(); reader.onload = function() { finish(reader.result); }; reader.readAsDataURL(photoInput.files[0]); } else finish("");
  });
  const logout = document.getElementById("citizen-logout"); if (logout) logout.addEventListener("click", function() { localStorage.removeItem(PM_CITIZEN_KEY); pmRenderCitizenArea(); });
  document.querySelectorAll(".js-open-citizen-form").forEach(function(btn) { btn.addEventListener("click", function() { const type = btn.dataset.type; document.getElementById("citizen-form-title").textContent = PM_RESERVATION_LABELS[type]; document.getElementById("citizen-form-type").value = type; document.getElementById("citizen-form-modal").hidden = false; }); });
  document.querySelectorAll("[data-close-modal]").forEach(function(btn) { btn.addEventListener("click", function() { document.getElementById("citizen-form-modal").hidden = true; }); });
  const form = document.getElementById("citizen-reservation-form"); if (form) form.addEventListener("submit", function(e) { e.preventDefault(); const citizen = pmCitizen(); if (!citizen) return; pmCreateCitizenReservation({ type: form.type.value, citizen: citizen, nome: form.nome.value.trim(), cognome: form.cognome.value.trim(), note: form.note.value.trim() }); form.reset(); document.getElementById("citizen-form-modal").hidden = true; pmRenderCitizenArea(); });
  const bell = document.getElementById("citizen-notifications"); if (bell) bell.addEventListener("click", function() { const list = document.getElementById("citizen-notifications-list"); list.hidden = !list.hidden; });
  pmRenderCitizenArea();
});
