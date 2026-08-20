/* Popup chat per una prenotazione "Presa in carico". Overlay proprio
   (coerente con lo stile a isole/vetro del resto del sito) ma con un
   design dedicato, più curato del semplice modal generico. */
(function () {
  let pollTimer = null;
  let currentReservationId = null;
  let lastRenderedCount = -1;

  function t(key, fallback) {
    return (typeof I18N !== 'undefined') ? I18N.t(key, fallback) : (fallback || key);
  }
  function locale() {
    return (typeof I18N !== 'undefined') ? I18N.current() : 'it';
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatTime(value) {
    try { return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
    catch (_) { return ''; }
  }
  function formatDay(value) {
    try {
      const d = new Date(value), today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      if (sameDay) return t('chat.today', 'Oggi');
      return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).format(d);
    } catch (_) { return ''; }
  }

  function bubbleHtml(message, isMine, showMeta) {
    const meta = showMeta ? '<div class="chat-bubble-meta">' + esc(message.sender_role) + '</div>' : '';
    return (
      '<div class="chat-bubble-row ' + (isMine ? 'is-mine' : '') + '">' +
        '<div class="chat-bubble-stack">' +
          meta +
          '<div class="chat-bubble">' +
            '<div class="chat-bubble-body">' + esc(message.body) + '</div>' +
          '</div>' +
          '<div class="chat-bubble-time">' + formatTime(message.created_at) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function dayDividerHtml(value) {
    return '<div class="chat-day-divider"><span>' + esc(formatDay(value)) + '</span></div>';
  }

  function injectStyleOnce() {
    if (document.getElementById('pm-chat-style')) return;
    const style = document.createElement('style');
    style.id = 'pm-chat-style';
    style.textContent = `
      .pm-chat-overlay { position:fixed; inset:0; z-index:1200; display:flex; align-items:center; justify-content:center;
        background:rgba(10,10,14,0.45); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
        opacity:0; transition:opacity .18s ease; padding:16px; }
      .pm-chat-overlay.open { opacity:1; }
      .pm-chat-window { width:100%; max-width:480px; max-height:min(680px, 88vh); display:flex; flex-direction:column;
        border-radius:22px; overflow:hidden; transform:translateY(14px) scale(0.98); transition:transform .18s ease;
        box-shadow:0 24px 60px rgba(0,0,0,0.3); }
      .pm-chat-overlay.open .pm-chat-window { transform:translateY(0) scale(1); }
      html[data-theme="light"] .pm-chat-window, html:not([data-theme]) .pm-chat-window { background:#fff; }
      html[data-theme="dark"] .pm-chat-window { background:#1c1d22; }

      .pm-chat-header { display:flex; align-items:center; gap:10px; padding:16px 18px; flex-shrink:0;
        background:linear-gradient(135deg, var(--accent, #2f6fed), #6d8ef2); color:#fff; }
      .pm-chat-header-icon { width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.22);
        display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
      .pm-chat-header-text { flex:1; min-width:0; }
      .pm-chat-header-text b { display:block; font-size:0.98rem; }
      .pm-chat-header-text span { display:block; font-size:0.76rem; opacity:0.85; margin-top:1px; }
      .pm-chat-close { background:rgba(255,255,255,0.18); border:none; color:#fff; width:30px; height:30px; border-radius:50%;
        font-size:1.05rem; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center;
        transition:background .15s ease; line-height:1; }
      .pm-chat-close:hover { background:rgba(255,255,255,0.32); }

      .pm-chat-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:2px; }
      html[data-theme="light"] .pm-chat-messages, html:not([data-theme]) .pm-chat-messages { background:#f4f5f7; }
      html[data-theme="dark"] .pm-chat-messages { background:#141518; }

      .chat-day-divider { text-align:center; margin:14px 0 10px; }
      .chat-day-divider span { font-size:0.72rem; opacity:0.55; padding:3px 10px; border-radius:999px; background:rgba(127,127,127,0.14); }

      .chat-bubble-row { display:flex; margin-bottom:4px; animation: pmChatIn .16s ease; }
      .chat-bubble-row.is-mine { justify-content:flex-end; }
      .chat-bubble-stack { max-width:78%; display:flex; flex-direction:column; }
      .chat-bubble-row.is-mine .chat-bubble-stack { align-items:flex-end; }
      .chat-bubble-meta { font-size:0.7rem; font-weight:600; opacity:0.55; margin:0 4px 2px; }
      .chat-bubble { padding:9px 13px; border-radius:16px; word-wrap:break-word; }
      html[data-theme="light"] .chat-bubble, html:not([data-theme]) .chat-bubble { background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.06); border-bottom-left-radius:5px; }
      html[data-theme="dark"] .chat-bubble { background:#26272d; border-bottom-left-radius:5px; }
      .chat-bubble-row.is-mine .chat-bubble { background:var(--accent, #2f6fed); color:#fff; border-bottom-left-radius:16px; border-bottom-right-radius:5px; }
      .chat-bubble-body { font-size:0.92rem; line-height:1.4; white-space:pre-wrap; }
      .chat-bubble-time { font-size:0.66rem; opacity:0.45; margin:2px 6px 0; }

      .pm-chat-empty { text-align:center; opacity:0.55; padding:40px 20px; font-size:0.88rem; }
      .pm-chat-empty .pm-chat-empty-icon { font-size:1.8rem; display:block; margin-bottom:8px; }

      .pm-chat-form { display:flex; align-items:flex-end; gap:8px; padding:12px 14px; flex-shrink:0; }
      html[data-theme="light"] .pm-chat-form, html:not([data-theme]) .pm-chat-form { background:#fff; border-top:1px solid rgba(0,0,0,0.06); }
      html[data-theme="dark"] .pm-chat-form { background:#1c1d22; border-top:1px solid rgba(255,255,255,0.08); }
      .pm-chat-form textarea { flex:1; resize:none; max-height:110px; padding:11px 16px; border-radius:20px; border:1px solid var(--line, rgba(127,127,127,0.3));
        font-family:var(--font-body); font-size:0.92rem; line-height:1.35; }
      .pm-chat-form textarea:focus { outline:none; border-color:var(--accent, #2f6fed); }
      .pm-chat-send { width:40px; height:40px; border-radius:50%; border:none; background:var(--accent, #2f6fed); color:#fff;
        font-size:1.05rem; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:transform .1s ease, opacity .15s ease; }
      .pm-chat-send:hover { transform:scale(1.06); }
      .pm-chat-send:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

      @keyframes pmChatIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

      @media (max-width:480px) {
        .pm-chat-overlay { padding:0; align-items:flex-end; }
        .pm-chat-window { max-width:none; max-height:92vh; border-radius:20px 20px 0 0; }
      }
    `;
    document.head.appendChild(style);
  }

  async function loadMessages(reservationId) {
    const { data, error } = await PM_DB.functions.invoke('list-reservation-messages', { body: { reservationId } });
    if (error || !data || data.error) return [];
    return data.messages || [];
  }

  async function renderMessages(container, reservationId, user, force) {
    const messages = await loadMessages(reservationId);
    if (!force && messages.length === lastRenderedCount) return; // evita di ridisegnare/scattare se non ci sono novità
    lastRenderedCount = messages.length;

    if (!messages.length) {
      container.innerHTML = '<div class="pm-chat-empty"><span class="pm-chat-empty-icon">' + PM_ICONS.chat + '</span>' + esc(t('chat.empty', 'Nessun messaggio ancora.')) + '<br>' + esc(t('chat.empty_hint', 'Scrivi il primo qui sotto.')) + '</div>';
      return;
    }

    let html = '';
    let lastDay = null;
    let lastSender = null;
    messages.forEach((m) => {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) { html += dayDividerHtml(m.created_at); lastDay = day; lastSender = null; }
      const isMine = m.sender_id === user.id;
      const showMeta = !isMine && m.sender_id !== lastSender;
      html += bubbleHtml(m, isMine, showMeta);
      lastSender = m.sender_id;
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 110) + 'px';
  }

  async function pmOpenReservationChat(reservationId, opts) {
    const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null;
    if (!user) return;
    const readOnly = !!(opts && opts.readOnly);
    injectStyleOnce();
    currentReservationId = reservationId;
    lastRenderedCount = -1;

    const overlay = document.createElement('div');
    overlay.className = 'pm-chat-overlay';
    overlay.innerHTML =
      '<div class="pm-chat-window">' +
        '<div class="pm-chat-header">' +
          '<div class="pm-chat-header-icon">' + PM_ICONS.chat + '</div>' +
          '<div class="pm-chat-header-text"><b>' + esc(t('chat.reservation_title', 'Chat prenotazione')) + '</b><span>' + (readOnly ? esc(t('chat.closed_subtitle', 'Sola lettura — la pratica è chiusa.')) : esc(t('chat.subtitle', 'I messaggi arrivano anche su Telegram'))) + '</span></div>' +
          '<button class="pm-chat-close" type="button" aria-label="' + esc(t('common.close', 'Chiudi')) + '">×</button>' +
        '</div>' +
        '<div class="pm-chat-messages" id="pm-chat-messages"></div>' +
        (readOnly ? '' :
        '<form class="pm-chat-form" id="pm-chat-form">' +
          '<textarea id="pm-chat-input" rows="1" placeholder="' + esc(t('chat.placeholder', 'Scrivi un messaggio...')) + '" maxlength="2000" required></textarea>' +
          '<button type="submit" class="pm-chat-send" aria-label="' + esc(t('common.send', 'Invia')) + '">' + PM_ICONS.send + '</button>' +
        '</form>') +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const messagesBox = overlay.querySelector('#pm-chat-messages');
    const form = overlay.querySelector('#pm-chat-form');
    const input = overlay.querySelector('#pm-chat-input');
    const sendBtn = overlay.querySelector('.pm-chat-send');

    function close() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      currentReservationId = null;
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 180);
    }
    overlay.querySelector('.pm-chat-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function escHandler(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } });

    if (!readOnly && form && input) {
      input.addEventListener('input', () => autoResize(input));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        sendBtn.disabled = true;
        const { data, error } = await PM_DB.functions.invoke('send-reservation-message', { body: { reservationId, body: text } });
        sendBtn.disabled = false;
        let serverMessage = null;
        if (error && error.context && typeof error.context.json === 'function') {
          try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
        }
        if (error || !data || data.error) {
          if (typeof pmToast === 'function') pmToast(serverMessage || (data && data.error) || t('chat.send_error', "Errore nell'invio del messaggio."), 'error');
          return;
        }
        input.value = '';
        autoResize(input);
        renderMessages(messagesBox, reservationId, user, true);
      });
    }

    await renderMessages(messagesBox, reservationId, user, true);
    if (!readOnly && input) input.focus();

    // Aggiornamento semplice: ricontrolla nuovi messaggi ogni 4 secondi
    // mentre il popup è aperto (niente sottoscrizioni realtime, per restare
    // semplice); ridisegna solo se il numero di messaggi è cambiato, così
    // non "salta" mentre stai leggendo o scrivendo. In sola lettura non ha
    // senso continuare a interrogare il server: la conversazione è chiusa
    // e non arriveranno nuovi messaggi da nessuna delle due parti.
    if (!readOnly) {
      pollTimer = setInterval(() => {
        if (currentReservationId === reservationId) renderMessages(messagesBox, reservationId, user, false);
      }, 4000);
    }
  }

  window.pmOpenReservationChat = pmOpenReservationChat;
})();
