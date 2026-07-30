/* Accesso staff condiviso tramite Supabase. Le password non sono nel sito. */
const PM_ROLES = [
  'Admin', 'Dirigente', 'Chirurgo Primario', 'Chirurgo Vice Primario', 'Chirurgo Strutturato',
  'Chirurgo Specializzando', 'Medico Responsabile Ambulatorio', 'Medico Responsabile di Laboratorio', 'Medico di Laboratorio',
  'Medico di Base', 'Infermiere Coordinatore', 'Infermiere di Équipe',
  'Infermiere Assistente', 'Paramedico Coordinatore PS', 'Paramedico Senior',
  'Paramedico', 'Specializzando'
];
const PM_ADMIN_ROLES = ['Chirurgo Primario', 'Dirigente', 'Admin'];
let PM_CURRENT_USER = null;
function pmCurrentUser() { return PM_CURRENT_USER; }
async function pmLogout() { if (window.PM_DB) await PM_DB.auth.signOut(); PM_CURRENT_USER = null; window.location.href = 'login.html'; }
async function pmLoadCurrentUser() {
  if (!window.PM_DB) return null;
  const { data: sessionData } = await PM_DB.auth.getSession();
  if (!sessionData.session) return null;
  const { data: profile } = await PM_DB.from('profiles').select('username, display_name, role, extra_roles, active, must_change_password').eq('id', sessionData.session.user.id).maybeSingle();
  if (!profile || !profile.active) { await PM_DB.auth.signOut(); return null; }
  PM_CURRENT_USER = { id: sessionData.session.user.id, username: profile.username, name: profile.display_name || profile.username, role: profile.role, extraRoles: profile.extra_roles || [], mustChangePassword: profile.must_change_password };
  return PM_CURRENT_USER;
}
function pmShowLoginError(text) { const el = document.getElementById('login-error'); if (el) { el.textContent = text; el.classList.add('show'); } }

async function pmInitDashboard() {
  const user = await pmLoadCurrentUser();
  if (!user) return window.location.href = 'login.html';
  const name = document.getElementById('dash-username'), role = document.getElementById('dash-role');
  if (name) name.textContent = user.name + ' (' + user.username + ')';
  if (role) role.textContent = user.role;
  const profileDisplay = document.getElementById('profile-username-display');
  if (profileDisplay) profileDisplay.textContent = user.username;

  const isManagement = PM_ADMIN_ROLES.includes(user.role);

  // Un'unica dashboard per tutti: si tolgono solo le schede non pertinenti al
  // ruolo (Compila richiesta/Prenotazioni ricevute in base alle regole del
  // modulo ospedale).
  const staffPanels = document.getElementById('staff-segment-panels');
  const staffBar = document.getElementById('staff-segment-bar');
  if (staffPanels) {
    if (typeof pmCanCompileReservation === 'function' && !pmCanCompileReservation(user)) {
      const richieste = staffPanels.querySelector('[data-seg-panel="richieste"]');
      if (richieste) richieste.remove();
    }
    if (typeof pmIsReservationRecipient === 'function' && !pmIsReservationRecipient(user)) {
      const ricevute = staffPanels.querySelector('[data-seg-panel="ricevute"]');
      if (ricevute) ricevute.remove();
    }
    if (typeof pmMountSegments === 'function') {
      pmMountSegments(staffBar, staffPanels, {
        onActivate: (id) => { if (id === 'ricevute' && typeof pmRenderReceivedReservations === 'function') pmRenderReceivedReservations('received-reservations-list'); },
      });
    }
  }

  // Riquadro largo della Direzione (Gestione Account / Gestione Bandi), separato
  // perché la tabella account ha bisogno di più spazio orizzontale.
  const direction = document.getElementById('direction-actions');
  const directionPanels = document.getElementById('direction-segment-panels');
  const directionBar = document.getElementById('direction-segment-bar');
  if (direction) direction.style.display = isManagement ? 'block' : 'none';
  if (isManagement && directionPanels && typeof pmMountSegments === 'function') {
    pmMountSegments(directionBar, directionPanels);
  }

  if (typeof pmRenderReceivedReservations === 'function') pmRenderReceivedReservations('received-reservations-list');
  if (typeof pmRenderStaffDirectory === 'function') pmRenderStaffDirectory();
  if (typeof pmRenderSiteMenu === 'function') await pmRenderSiteMenu();
}
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('dash-username')) {
    pmInitDashboard();
  } else {
    pmLoadCurrentUser().then(function () {
      if (typeof pmRenderSiteMenu === 'function') pmRenderSiteMenu();
    });
  }
});
