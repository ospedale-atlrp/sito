/* Pannello "Segnalazioni" nella dashboard: visibile SOLO al super-admin
   (controllato in auth.js via user.isSuperAdmin, non dalla Direzione in
   generale). Isola interna Bug / Modifiche, ognuna con la propria lista e
   la possibilità di aprire la chat del ticket e chiuderlo. */
(function () {
  const STATUS_LABELS = { aperto: 'Aperto', chiuso: 'Chiuso' };

  function ticketRow(r) {
    const status = STATUS_LABELS[r.status] || r.status;
    let action = `<button class="btn btn-sm btn-outline js-open-bug-chat" data-id="${r.id}">Apri</button>`;
    if (r.status === 'aperto') {
      action += ` <button class="btn btn-sm btn-danger js-close-bug" data-id="${r.id}">Chiudi</button>`;
    }
    return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag">${r.ticket_number}</span><br><b>${r.title}</b><br>Da: ${r.reporter_username} · Stato: ${status}</div>${action}</div>`;
  }

  async function renderList(type, containerId) {
    const list = document.getElementById(containerId);
    if (!list || !window.PM_DB) return;
    const { data, error } = await PM_DB.functions.invoke('list-bug-reports-admin', { body: { type } });
    if (error || !data || data.error) { list.innerHTML = '<div class="reservations-empty">Impossibile caricare i ticket.</div>'; return; }
    const rows = data.reports || [];
    list.innerHTML = rows.length ? rows.map(ticketRow).join('') : '<div class="reservations-empty">Nessun ticket.</div>';

    list.querySelectorAll('.js-open-bug-chat').forEach((b) => b.addEventListener('click', () => {
      if (typeof pmOpenBugReportChat === 'function') pmOpenBugReportChat(b.dataset.id);
    }));
    list.querySelectorAll('.js-close-bug').forEach((b) => b.addEventListener('click', async () => {
      if (!(await pmConfirm('Chiudere questo ticket? Il segnalante verrà avvisato.'))) return;
      const { data, error } = await PM_DB.functions.invoke('close-bug-report', { body: { reportId: b.dataset.id } });
      let serverMessage = null;
      if (error && error.context && typeof error.context.json === 'function') {
        try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
      }
      if (error || !data || data.error) { pmToast(serverMessage || (data && data.error) || 'Errore nella chiusura.', 'error'); return; }
      pmToast('Ticket chiuso.', 'success');
      renderList(type, containerId);
    }));
  }

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
