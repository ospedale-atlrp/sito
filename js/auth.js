/* Accesso staff condiviso tramite Supabase. Le password non sono nel sito. */
const PM_ROLES = [
  'Dirigente', 'Chirurgo Primario', 'Chirurgo Vice Primario', 'Chirurgo Strutturato',
  'Chirurgo Specializzando', 'Medico Responsabile Ambulatorio', 'Medico Responsabile di Laboratorio', 'Medico di Laboratorio',
  'Medico di Base', 'Infermiere Coordinatore', 'Infermiere di Équipe',
  'Infermiere Assistente', 'Paramedico Coordinatore PS', 'Paramedico Senior',
  'Paramedico', 'Specializzando'
];
const PM_ADMIN_ROLES = ['Chirurgo Primario', 'Dirigente'];
let PM_CURRENT_USER = null;
function pmCurrentUser() { return PM_CURRENT_USER; }
function pmUserEmail(username) { return String(username || '').trim().toLowerCase() + '@atlantis-rp.local'; }
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
async function pmLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const { error } = await PM_DB.auth.signInWithPassword({ email: pmUserEmail(form.username.value), password: form.password.value });
  if (error) return pmShowLoginError('Username o password non corretti.');
  const user = await pmLoadCurrentUser();
  if (!user) return pmShowLoginError('Questo account non è attivo.');
  if (user.mustChangePassword) { document.getElementById('step-login').style.display = 'none'; document.getElementById('step-firstaccess').style.display = 'block'; return; }
  window.location.href = 'dashboard.html';
}
async function pmChangePassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = document.getElementById('firstaccess-error');
  if (errorBox) { errorBox.textContent = ''; errorBox.classList.remove('show'); }
  if (form.newPassword.value.length < 8) { if (errorBox) { errorBox.textContent = 'La password deve contenere almeno 8 caratteri.'; errorBox.classList.add('show'); } window.alert('La password deve contenere almeno 8 caratteri.'); return; }
  if (form.newPassword.value !== form.newPasswordConfirm.value) { if (errorBox) { errorBox.textContent = 'Le due password non coincidono.'; errorBox.classList.add('show'); } return; }
  const { error } = await PM_DB.auth.updateUser({ password: form.newPassword.value });
  if (error) { if (errorBox) { errorBox.textContent = error.message; errorBox.classList.add('show'); } return; }
  const { error: profileError } = await PM_DB.rpc('mark_password_changed');
  if (profileError) { if (errorBox) { errorBox.textContent = profileError.message; errorBox.classList.add('show'); } return; }
  window.location.href = 'dashboard.html';
}
async function pmInitDashboard() {
  const user = await pmLoadCurrentUser();
  if (!user) return window.location.href = 'login.html';
  if (user.mustChangePassword) return window.location.href = 'login.html';
  const name = document.getElementById('dash-username'), role = document.getElementById('dash-role');
  if (name) name.textContent = user.name + ' (' + user.username + ')';
  if (role) role.textContent = user.role;
  const direction = document.getElementById('direction-actions');
  if (direction) direction.style.display = PM_ADMIN_ROLES.includes(user.role) ? 'block' : 'none';
  if (typeof pmRenderStaffDirectory === 'function') pmRenderStaffDirectory();
  if (typeof pmRenderBandiPanel === 'function') pmRenderBandiPanel();
  if (typeof pmRenderSiteMenu === 'function') pmRenderSiteMenu();
}
document.addEventListener('DOMContentLoaded', function () {
  const login = document.getElementById('login-form'); if (login) login.addEventListener('submit', pmLogin);
  const change = document.getElementById('firstaccess-form'); if (change) change.addEventListener('submit', pmChangePassword);
  if (document.getElementById('dash-username')) {
    pmInitDashboard();
  } else {
    pmLoadCurrentUser().then(function () {
      if (typeof pmRenderSiteMenu === 'function') pmRenderSiteMenu();
    });
  }
});
