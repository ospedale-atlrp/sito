/* Pannello "Segnalazioni" nella dashboard: visibile SOLO al super-admin
   (controllato in auth.js via user.isSuperAdmin, non dalla Direzione in
   generale). Isola interna Bug / Modifiche, ognuna con la propria lista e
   la possibilità di aprire la chat del ticket e chiuderlo. */
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
  function statusLabels() { return { aperto: t('reports.status_aperto', 'Aperto'), chiuso: t('reports.status_chiuso', 'Chiuso') }; }

  function ticketRow(r) {
    const status = statusLabels()[r.status] || r.status;
    const isClosed = r.status !== 'aperto';
    let action = `<button class="btn btn-sm btn-outline js-open-bug-chat" data-id="${r.id}" data-closed="${isClosed ? '1' : '0'}">${t('reservations.open', 'Apri')}</button>`;
    if (!isClosed) {
      action += ` <button class="btn btn-sm btn-danger js-close-bug" data-id="${r.id}">${t('common.close', 'Chiudi')}</button>`;
    }
    return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag">${r.ticket_number}</span><br><b>${r.title}</b><br>${t('reports.reported_by', 'Da:')} ${r.reporter_username} · ${t('common.status', 'Stato')}: ${status}</div>${action}</div>`;
  }

  let lastRendered = null; // { type, containerId } — per ridisegnare al cambio lingua

  async function renderList(type, containerId) {
    lastRendered = { type, containerId };
    const list = document.getElementById(containerId);
    if (!list || !window.PM_DB) return;
    const { data, error } = await PM_DB.functions.invoke('list-bug-reports-admin', { body: { type } });
    if (error || !data || data.error) { list.innerHTML = '<div class="reservations-empty">' + t('reports.load_error', 'Impossibile caricare i ticket.') + '</div>'; return; }
    const rows = data.reports || [];
    list.innerHTML = rows.length ? rows.map(ticketRow).join('') : '<div class="reservations-empty">' + t('reports.none_tickets', 'Nessun ticket.') + '</div>';

    list.querySelectorAll('.js-open-bug-chat').forEach((b) => b.addEventListener('click', () => {
      if (typeof pmOpenBugReportChat === 'function') pmOpenBugReportChat(b.dataset.id, { readOnly: b.dataset.closed === '1' });
    }));
    list.querySelectorAll('.js-close-bug').forEach((b) => b.addEventListener('click', async () => {
      if (!(await pmConfirm(t('reports.close_confirm', 'Chiudere questo ticket? Il segnalante verrà avvisato.')))) return;
      const { data, error } = await PM_DB.functions.invoke('close-bug-report', { body: { reportId: b.dataset.id } });
      let serverMessage = null;
      if (error && error.context && typeof error.context.json === 'function') {
        try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
      }
      if (error || !data || data.error) { pmToast(serverMessage || (data && data.error) || t('reports.close_error', 'Errore nella chiusura.'), 'error'); return; }
      pmToast(t('reports.closed_toast', 'Ticket chiuso.'), 'success');
      renderList(type, containerId);
    }));
  }

  document.addEventListener('i18n:changed', () => { if (lastRendered) renderList(lastRendered.type, lastRendered.containerId); });

  function pmRenderBugReportsAdminPanel() {
    const bar = document.getElementById('bug-admin-sub-bar');
    const panels = document.getElementById('bug-admin-sub-panels');
    if (bar && panels && typeof pmMountSegments === 'function') {
      pmMountSegments(bar, panels, {
        onActivate: (id) => {
          if (id === 'bug') renderList('bug', 'bug-admin-list-bug');
          if (id === 'modifiche') renderList('modifica', 'bug-admin-list-modifica');
        },
      });
    }
  }

  window.pmRenderBugReportsAdminPanel = pmRenderBugReportsAdminPanel;
})();
