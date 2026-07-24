/* Gestione bandi tramite Function Supabase: evita i blocchi RLS. */
(function () {
  'use strict';
  const allowed = ['Chirurgo Primario', 'Dirigente'];
  const slot = () => document.getElementById('dashboard-bandi');
  const user = () => typeof pmCurrentUser === 'function' ? pmCurrentUser() : null;
  const canManage = () => !!user() && allowed.includes(user().role);
  let currentBando = null;

  const format = value => new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const message = text => {
    const el = document.getElementById('dashboard-bando-message');
    if (el) { el.textContent = text; el.className = 'form-error show'; }
  };
  const createForm = () => `
    <div class="bando-panel-intro"><span class="bando-panel-icon" aria-hidden="true">📋</span><p class="form-note">Il bando viene salvato nel database condiviso e appare subito nella pagina pubblica.</p></div>
    <div class="form-error" id="dashboard-bando-message"></div>
    <form id="dashboard-bando-form" class="new-bando-form">
      <div class="field"><label for="bando-start-at">Apertura candidature</label><input id="bando-start-at" name="startAt" type="datetime-local" required></div>
      <div class="field"><label for="bando-end-at">Chiusura candidature</label><input id="bando-end-at" name="endAt" type="datetime-local" required></div>
      <button class="btn btn-primary btn-sm" type="submit">Pubblica il bando</button>
    </form>`;
  const activeView = bando => `
    <div class="bando-current-state"><span class="announcement-status is-active">● ${new Date(bando.start_at) <= new Date() ? 'Bando in corso' : 'Bando programmato'}</span>
      <div class="bando-current-dates"><div><span class="bando-current-date-label">Apertura</span><strong>${format(bando.start_at)}</strong></div><div><span class="bando-current-date-label">Chiusura</span><strong>${format(bando.end_at)}</strong></div></div>
    </div>
    <div class="bando-action-row"><button class="btn btn-danger btn-sm" id="close-bando" type="button">Chiudi bando</button><button class="btn btn-outline btn-sm" id="cancel-bando" type="button">Annulla bando</button></div>
    <p class="form-note">Chiudi se le candidature sono terminate; annulla se il bando non deve più essere valido.</p>
    <div class="form-error" id="dashboard-bando-message"></div>`;

  async function loadCurrent() {
    if (!window.PM_DB) return;
    const { data, error } = await PM_DB.from('bandi').select('*').in('status', ['programmato', 'aperto']).order('created_at', { ascending: false }).limit(1);
    if (error) return message(error.message);
    currentBando = (data && data[0]) || null;
  }
  function bind() {
    const form = document.getElementById('dashboard-bando-form');
    if (form) form.addEventListener('submit', publish);
    const close = document.getElementById('close-bando');
    if (close) close.addEventListener('click', () => finishBando('chiuso'));
    const cancel = document.getElementById('cancel-bando');
    if (cancel) cancel.addEventListener('click', () => finishBando('annullato'));
  }
  async function invoke(body, fallback) {
    const { data, error } = await PM_DB.functions.invoke('manage-bandi', { body });
    if (error) { message(fallback); return null; }
    if (!data || data.error) { message((data && data.error) || fallback); return null; }
    return data;
  }
  async function publish(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const start = new Date(form.startAt.value), end = new Date(form.endAt.value);
    if (!(start < end)) return message('La chiusura deve essere successiva all’apertura.');
    const data = await invoke({ action: 'create', startAt: start.toISOString(), endAt: end.toISOString() }, 'Impossibile pubblicare il bando. Controlla che la Function manage-bandi sia pubblicata.');
    if (!data) return;
    currentBando = data.bando;
    render(false);
  }
  async function finishBando(status) {
    const label = status === 'chiuso' ? 'Chiudere questo bando?' : 'Annullare definitivamente questo bando?';
    if (!currentBando || !confirm(label)) return;
    const data = await invoke({ action: 'finish', id: currentBando.id, status }, 'Impossibile aggiornare il bando. Controlla che la Function manage-bandi sia pubblicata.');
    if (!data) return;
    currentBando = null;
    render(false);
  }
  async function render(reload = true) {
    if (!slot() || !canManage()) return;
    if (reload) await loadCurrent();
    slot().innerHTML = currentBando ? activeView(currentBando) : createForm();
    bind();
  }
  window.pmRenderBandiPanel = render;
  document.addEventListener('DOMContentLoaded', () => render());
})();
