/* Pagina Segnalazioni: chiunque sia loggato può segnalare un bug o proporre
   una modifica, e vedere lo stato dei propri ticket con relativa chat. */
(function () {
  function t(key, fallback, vars) {
    let s = null;
    if (typeof I18N !== 'undefined') { const v = I18N.t(key, vars); if (v && v !== key) s = v; }
    if (s === null) {
      s = fallback || key;
      if (vars) Object.keys(vars).forEach((k) => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    }
    return s;
  }
  function typeLabels() { return { bug: t('reports.type_bug_short', 'Bug'), modifica: t('reports.type_modifica_short', 'Modifica') }; }
  function statusLabels() { return { aperto: t('reports.status_aperto', 'Aperto'), chiuso: t('reports.status_chiuso', 'Chiuso') }; }

  function showMsg(text, ok) {
    const el = document.getElementById(ok ? 'bug-form-success' : 'bug-form-error');
    if (el) { el.textContent = text; el.classList.add('show'); }
  }
  function clearMsgs() {
    ['bug-form-error', 'bug-form-success'].forEach((id) => { const el = document.getElementById(id); if (el) { el.textContent = ''; el.classList.remove('show'); } });
  }

  function ticketRow(r) {
    const label = typeLabels()[r.type] || r.type;
    const status = statusLabels()[r.status] || r.status;
    const isClosed = r.status !== 'aperto';
    const action = !isClosed
      ? `<button class="btn btn-sm btn-outline js-open-bug-chat" data-id="${r.id}" data-closed="0">${t('reports.open_chat', 'Apri chat')}</button>`
      : `<button class="btn btn-sm btn-outline js-open-bug-chat" data-id="${r.id}" data-closed="1">${t('reports.view_conversation', 'Vedi conversazione')}</button>`;
    return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag">${r.ticket_number} · ${label}</span><br><b>${r.title}</b><br>${t('common.status', 'Stato')}: ${status}</div>${action}</div>`;
  }

  async function renderMyTickets() {
    const list = document.getElementById('my-bug-reports-list');
    if (!list || !window.PM_DB) return;
    const { data, error } = await PM_DB.functions.invoke('list-my-bug-reports', { body: {} });
    if (error || !data || data.error) { list.innerHTML = '<div class="reservations-empty">' + t('reports.load_error', 'Impossibile caricare i ticket.') + '</div>'; return; }
    const rows = data.reports || [];
    list.innerHTML = rows.length ? rows.map(ticketRow).join('') : '<div class="reservations-empty">' + t('reports.none_sent', 'Non hai ancora inviato segnalazioni.') + '</div>';
    list.querySelectorAll('.js-open-bug-chat').forEach((b) => b.addEventListener('click', () => {
      if (typeof pmOpenBugReportChat === 'function') pmOpenBugReportChat(b.dataset.id, { readOnly: b.dataset.closed === '1' });
    }));
  }
  document.addEventListener('i18n:changed', () => { if (document.getElementById('my-bug-reports-list')) renderMyTickets(); });

  function pmInitBugReportsPage(user) {
    const bar = document.getElementById('bug-segment-bar');
    const panels = document.getElementById('bug-segment-panels');
    if (bar && panels && typeof pmMountSegments === 'function') {
      pmMountSegments(bar, panels, {
        onActivate: (id) => { if (id === 'ticket') renderMyTickets(); },
      });
    }

    const form = document.getElementById('bug-report-form');
    if (form && !form.dataset.wired) {
      form.dataset.wired = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMsgs();
        const type = form.type.value, title = form.title.value.trim(), description = form.description.value.trim();
        if (!type || !title || !description) return showMsg(t('common.fill_all_fields', 'Compila tutti i campi.'), false);

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const { data, error } = await PM_DB.functions.invoke('create-bug-report', { body: { type, title, description } });
        submitBtn.disabled = false;
        let serverMessage = null;
        if (error && error.context && typeof error.context.json === 'function') {
          try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
        }
        if (error || !data || data.error) return showMsg(serverMessage || (data && data.error) || t('reports.submit_error', "Errore nell'invio."), false);

        showMsg(t('reports.submit_success', 'Segnalazione inviata! Ticket {ticket}.', { ticket: data.ticketNumber }), true);
        form.reset();
        if (typeof pmRefreshSelect === 'function') pmRefreshSelect(document.getElementById('bug-type'));
        renderMyTickets();
      });
    }

    renderMyTickets();
  }

  window.pmInitBugReportsPage = pmInitBugReportsPage;
})();
