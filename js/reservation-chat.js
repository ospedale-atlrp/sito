/* Popup chat per una prenotazione "Presa in carico". Riusa lo stile dei
   modal già presenti sul sito (.modal / .modal-card, vedi ui-dialogs.js),
   così eredita l'aspetto senza bisogno di toccare css/style.css. */
(function () {
  let pollTimer = null;
  let currentReservationId = null;

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatTime(value) {
    try { return new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
    catch (_) { return ''; }
  }

  function bubbleHtml(message, isMine) {
    return (
      '<div class="chat-bubble-row ' + (isMine ? 'is-mine' : '') + '">' +
        '<div class="chat-bubble">' +
          '<div class="chat-bubble-meta">' + esc(message.sender_role) + ' · ' + formatTime(message.created_at) + '</div>' +
          '<div class="chat-bubble-body">' + esc(message.body) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function injectStyleOnce() {
    if (document.getElementById('pm-chat-style')) return;
    const style = document.createElement('style');
    style.id = 'pm-chat-style';
    style.textContent = `
      .pm-chat-modal .modal-card { max-width:520px; display:flex; flex-direction:column; max-height:80vh; }
      .pm-chat-messages { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding:4px 2px; margin:14px 0; min-height:180px; max-height:50vh; }
      .chat-bubble-row { display:flex; }
      .chat-bubble-row.is-mine { justify-content:flex-end; }
      .chat-bubble { max-width:80%; padding:9px 12px; border-radius:12px; background:rgba(127,127,127,0.14); }
      .chat-bubble-row.is-mine .chat-bubble { background:var(--accent, #2f6fed); color:#fff; }
      .chat-bubble-meta { font-size:0.72rem; opacity:0.65; margin-bottom:3px; }
      .pm-chat-empty { text-align:center; opacity:0.6; padding:20px 0; font-size:0.88rem; }
      .pm-chat-form { display:flex; gap:8px; }
      .pm-chat-form textarea { flex:1; resize:none; min-height:44px; max-height:120px; padding:10px 12px; border-radius:10px; border:1px solid var(--line, rgba(127,127,127,0.3)); font-family:var(--font-body); font-size:0.92rem; }
    `;
    document.head.appendChild(style);
  }

  async function loadMessages(reservationId) {
    const { data, error } = await PM_DB.functions.invoke('list-reservation-messages', { body: { reservationId } });
    if (error || !data || data.error) return [];
    return data.messages || [];
  }

  async function renderMessages(container, reservationId, user) {
    const messages = await loadMessages(reservationId);
    container.innerHTML = messages.length
      ? messages.map((m) => bubbleHtml(m, m.sender_id === user.id)).join('')
      : '<div class="pm-chat-empty">Nessun messaggio ancora. Scrivi il primo.</div>';
    container.scrollTop = container.scrollHeight;
  }

  async function pmOpenReservationChat(reservationId) {
    const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null;
    if (!user) return;
    injectStyleOnce();
    currentReservationId = reservationId;

    const overlay = document.createElement('div');
    overlay.className = 'modal pm-chat-modal';
    overlay.innerHTML =
      '<div class="modal-card">' +
        '<button class="icon-close" type="button" aria-label="Chiudi">×</button>' +
        '<h2 style="margin-top:0;">Chat prenotazione</h2>' +
        '<div class="pm-chat-messages" id="pm-chat-messages"></div>' +
        '<form class="pm-chat-form" id="pm-chat-form">' +
          '<textarea id="pm-chat-input" placeholder="Scrivi un messaggio..." maxlength="2000" required></textarea>' +
          '<button type="submit" class="btn btn-primary btn-sm">Invia</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    const messagesBox = overlay.querySelector('#pm-chat-messages');
    const form = overlay.querySelector('#pm-chat-form');
    const input = overlay.querySelector('#pm-chat-input');

    function close() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      currentReservationId = null;
      overlay.remove();
    }
    overlay.querySelector('.icon-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const { data, error } = await PM_DB.functions.invoke('send-reservation-message', { body: { reservationId, body: text } });
      submitBtn.disabled = false;
      let serverMessage = null;
      if (error && error.context && typeof error.context.json === 'function') {
        try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
      }
      if (error || !data || data.error) {
        if (typeof pmToast === 'function') pmToast(serverMessage || (data && data.error) || 'Errore nell\'invio del messaggio.', 'error');
        return;
      }
      input.value = '';
      renderMessages(messagesBox, reservationId, user);
    });

    await renderMessages(messagesBox, reservationId, user);
    input.focus();

    // Aggiornamento semplice: ricontrolla nuovi messaggi ogni 4 secondi
    // mentre il popup è aperto (niente sottoscrizioni realtime, per restare
    // semplice come richiesto).
    pollTimer = setInterval(() => {
      if (currentReservationId === reservationId) renderMessages(messagesBox, reservationId, user);
    }, 4000);
  }

  window.pmOpenReservationChat = pmOpenReservationChat;
})();
