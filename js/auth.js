/* Accesso staff condiviso tramite Supabase. Le password non sono nel sito. */
const PM_ROLES = [
  'Dirigente', 'Chirurgo Primario', 'Chirurgo Vice Primario', 'Chirurgo Strutturato',
  'Chirurgo Specializzando', 'Medico Responsabile Ambulatorio', 'Medico Responsabile di Laboratorio', 'Medico di Laboratorio',
  'Medico di Base', 'Infermiere Coordinatore', 'Infermiere di Équipe',
  'Infermiere Assistente'
];
const PM_ADMIN_ROLES = ['Chirurgo Primario', 'Dirigente', 'Admin'];

/* Super-admin nascosto: identificato dal Telegram ID (non dal ruolo
   salvato), così i permessi restano massimi anche se il ruolo pubblico
   viene cambiato o l'account viene "licenziato" e torna Cittadino.
   Questo controllo lato client serve solo per mostrare/nascondere i
   pannelli giusti: la sicurezza vera è applicata nelle Edge Function,
   che fanno lo stesso identico controllo lato server. */
const PM_SUPER_ADMIN_TELEGRAM_IDS = ['8242952926'];
function pmIsSuperAdmin(user) { return !!user && PM_SUPER_ADMIN_TELEGRAM_IDS.includes(String(user.telegramId || '')); }

let PM_CURRENT_USER = null;
function pmCurrentUser() { return PM_CURRENT_USER; }
async function pmLogout() { if (window.PM_DB) await PM_DB.auth.signOut(); PM_CURRENT_USER = null; window.location.href = 'login.html'; }
async function pmLoadCurrentUser() {
  if (!window.PM_DB) return null;
  const { data: sessionData } = await PM_DB.auth.getSession();
  if (!sessionData.session) return null;
  const { data: profile, error: profileError } = await PM_DB.from('profiles').select('username, display_name, role, extra_roles, active, must_change_password, telegram_username, telegram_id').eq('id', sessionData.session.user.id).maybeSingle();
  // Se la richiesta del profilo fallisce per un problema temporaneo (rete,
  // timeout...) NON disconnettiamo l'utente: prima il sito lo faceva, ed era
  // la causa del bug per cui l'accesso "spariva" tornando semplicemente alla
  // home. Disconnettiamo solo quando sappiamo per certo che il profilo non
  // esiste più o è stato disattivato, non quando la richiesta è solo fallita.
  if (profileError) { console.error('Impossibile verificare il profilo (riprovo alla prossima pagina):', profileError.message); return PM_CURRENT_USER; }
  if (!profile || !profile.active) { await PM_DB.auth.signOut(); PM_CURRENT_USER = null; return null; }
  PM_CURRENT_USER = { id: sessionData.session.user.id, username: profile.username, name: profile.display_name || profile.username, role: profile.role, extraRoles: profile.extra_roles || [], mustChangePassword: profile.must_change_password, telegramUsername: profile.telegram_username, telegramId: profile.telegram_id };
  PM_CURRENT_USER.isSuperAdmin = pmIsSuperAdmin(PM_CURRENT_USER);
  return PM_CURRENT_USER;
}
function pmShowLoginError(text) { const el = document.getElementById('login-error'); if (el) { el.textContent = text; el.classList.add('show'); } }

/* "Tipo di prenotazione" (Per i Pazienti / Per Me): stessa "isola" a
   pillola già usata per le altre schede (vedi ui-tabs.js / classe
   pm-segmented), solo che qui i bottoni non cambiano pannello: al click
   aggiornano un radio nascosto che il resto del modulo (pmWireHospitalForm)
   continua a leggere esattamente come prima. */
function pmWireModalitaToggle(container) {
  if (!container || container.dataset.pmWired) return;
  container.dataset.pmWired = '1';
  const buttons = Array.from(container.querySelectorAll('button[data-modalita-value]'));
  const form = container.closest('form');
  if (!form) return;
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.modalitaValue;
      const radio = form.querySelector('input[name="modalita"][value="' + value + '"]');
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      buttons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
}
function pmWireAllModalitaToggles(root) {
  (root || document).querySelectorAll('.pm-modalita-toggle').forEach(pmWireModalitaToggle);
}

/* Bottone principale della home ("Accedi con Telegram" / "Vai alla dashboard").
   Non fa nulla se l'elemento #home-cta-link non esiste in pagina, quindi è
   sicuro includerlo ovunque. Usa I18N.t() così il testo segue la lingua
   attiva; viene richiamato anche al cambio lingua (vedi in fondo al file). */
function pmUpdateHomeCta(user) {
  const link = document.getElementById('home-cta-link');
  if (!link) return;
  const dashIcon = (typeof PM_ICONS !== 'undefined' && PM_ICONS.dashboard) ? PM_ICONS.dashboard : '▣';
  const t = (typeof I18N !== 'undefined') ? I18N.t : function (k, d) { return d || k; };
  if (user) { link.href = 'dashboard.html'; link.innerHTML = dashIcon + ' ' + t('home.cta.dashboard', 'Vai alla dashboard'); link.style.background = '#1f5c8b'; }
  else { link.href = 'login.html'; link.innerHTML = '✈ ' + t('home.cta.login', 'Accedi con Telegram'); link.style.background = ''; }
}
document.addEventListener('i18n:changed', function () { pmUpdateHomeCta(PM_CURRENT_USER); });

async function pmInitDashboard() {
  const user = await pmLoadCurrentUser();
  if (!user) return window.location.href = 'login.html';
  const name = document.getElementById('dash-username'), role = document.getElementById('dash-role');
  if (name) name.textContent = user.name + ' (' + user.username + ')';
  if (role) role.textContent = user.role + (user.isSuperAdmin ? ' — Extra Admin' : '');
  const profileDisplay = document.getElementById('profile-username-display');
  if (profileDisplay) profileDisplay.textContent = user.username;

  const isPatient = user.role === 'Cittadino' && !user.isSuperAdmin;
  const staffSection = document.getElementById('staff-panels-wrapper');
  const patientSection = document.getElementById('patient-panels-wrapper');
  if (staffSection) staffSection.style.display = isPatient ? 'none' : '';
  if (patientSection) patientSection.style.display = isPatient ? '' : 'none';

  if (isPatient) {
    if (typeof pmInitPatientDashboard === 'function') await pmInitPatientDashboard(user);
    if (typeof pmRenderSiteMenu === 'function') await pmRenderSiteMenu();
    return;
  }

  const isManagement = PM_ADMIN_ROLES.includes(user.role) || user.isSuperAdmin;

  // Un'unica dashboard per tutti: si tolgono solo le schede non pertinenti al
  // ruolo (Compila richiesta in base alle regole del modulo ospedale).
  const staffPanels = document.getElementById('staff-segment-panels');
  const staffBar = document.getElementById('staff-segment-bar');
  if (staffPanels) {
    if (typeof pmCanCompileReservation === 'function' && !pmCanCompileReservation(user)) {
      const richieste = staffPanels.querySelector('[data-seg-panel="richieste"]');
      if (richieste) richieste.remove();
    }
    if (typeof pmMountSegments === 'function') {
      pmMountSegments(staffBar, staffPanels, {
        onActivate: (id) => { /* la scheda "prenotazioni" gestisce da sola l'isola interna, vedi sotto */ },
      });
    }
    pmWireAllModalitaToggles(staffPanels);
  }

  // Isola interna "Le mie prenotazioni" / "Le prenotazioni dei pazienti":
  // chi non gestisce prenotazioni (Infermieri) vede solo "Le mie
  // prenotazioni" — il secondo pannello viene proprio tolto dal DOM, quindi
  // l'isola sparisce da sola (un solo pannello = nessuna barra, vedi
  // ui-tabs.js) e si va dritti al contenuto, senza alcuna scelta visibile.
  const subBar = document.getElementById('reservation-sub-bar');
  const subPanels = document.getElementById('reservation-sub-panels');
  if (subPanels) {
    if (typeof pmIsReservationRecipient === 'function' && !pmIsReservationRecipient(user)) {
      const pazienti = subPanels.querySelector('[data-seg-panel="pazienti"]');
      if (pazienti) pazienti.remove();
    }
    if (typeof pmMountSegments === 'function') {
      pmMountSegments(subBar, subPanels, {
        onActivate: (id) => {
          if (id === 'pazienti' && typeof pmRenderReceivedReservations === 'function') pmRenderReceivedReservations('received-reservations-list');
          if (id === 'mie' && typeof pmRenderMyReservations === 'function') pmRenderMyReservations('staff-my-reservations-list');
        },
      });
    }
  }

  // Riquadro largo della Direzione (Gestione Account / Codici Promozione / Segnalazioni).
  const direction = document.getElementById('direction-actions');
  const directionPanels = document.getElementById('direction-segment-panels');
  const directionBar = document.getElementById('direction-segment-bar');
  if (direction) direction.style.display = isManagement ? 'block' : 'none';
  if (directionPanels && !user.isSuperAdmin) {
    // "Segnalazioni" è visibile SOLO al super-admin, non a tutta la Direzione.
    const segnalazioni = directionPanels.querySelector('[data-seg-panel="segnalazioni"]');
    if (segnalazioni) segnalazioni.remove();
  }
  if (isManagement && directionPanels && typeof pmMountSegments === 'function') {
    pmMountSegments(directionBar, directionPanels, {
      onActivate: (id) => { if (id === 'segnalazioni' && typeof pmRenderBugReportsAdminPanel === 'function') pmRenderBugReportsAdminPanel(); },
    });
  }
  if (isManagement && typeof pmRenderPromotionCreatePanel === 'function') pmRenderPromotionCreatePanel();

  if (typeof pmRenderStaffDirectory === 'function') pmRenderStaffDirectory();
  if (typeof pmRenderSiteMenu === 'function') await pmRenderSiteMenu();
}
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('dash-username')) {
    pmInitDashboard();
  } else {
    pmLoadCurrentUser().then(async function (user) {
      if (typeof pmRenderSiteMenu === 'function') pmRenderSiteMenu();
      if (user) { pmUpdateHomeCta(user); return; }
      // pmLoadCurrentUser() può restituire null anche con una sessione
      // valida, se il caricamento del profilo fallisce per un problema
      // temporaneo (vedi il commento sopra). Prima di mostrare "Accedi",
      // controlliamo la sessione direttamente: se esiste, mostriamo
      // comunque "Vai alla dashboard" invece di far sembrare che l'accesso
      // sia sparito.
      if (window.PM_DB) {
        const { data: sessionData } = await PM_DB.auth.getSession();
        if (sessionData && sessionData.session) { pmUpdateHomeCta({}); return; }
      }
      pmUpdateHomeCta(null);
    });
  }
});
