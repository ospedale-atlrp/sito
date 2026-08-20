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

  function bubbleHtml(message, isMine, showMeta, extraClass) {
    const meta = showMeta ? '<div class="chat-bubble-meta">' + esc(message.sender_role) + '</div>' : '';
    return (
      '<div class="chat-bubble-row ' + (isMine ? 'is-mine' : '') + (extraClass ? ' ' + extraClass : '') + '">' +
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
    if (document.getElementById('pm-bugchat-style')) return;
    const style = document.createElement('style');
    style.id = 'pm-bugchat-style';
    style.textContent = `
      .pm-bugchat-overlay { position:fixed; inset:0; z-index:1200; display:flex; align-items:center; justify-content:center;
        background:rgba(10,10,14,0.45); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
        opacity:0; transition:opacity .2s ease; padding:16px; }
      .pm-bugchat-overlay.open { opacity:1; }
      /* Apertura "a comparsa dal centro": la finestra parte schiacciata in
         verticale sul proprio punto centrale e si allarga verso l'alto e
         verso il basso fino alla misura piena, invece del solito
         scivolamento dal basso. Il leggero overshoot (cubic-bezier con
         valore >1) dà un piccolo "rimbalzo" di arrivo. */
      .pm-bugchat-window { width:100%; max-width:480px; max-height:min(680px, 88vh); display:flex; flex-direction:column;
        border-radius:22px; overflow:hidden;
        transform-origin:50% 50%; transform:scaleY(0.35) scaleX(0.92); opacity:0;
        transition:transform .32s cubic-bezier(.34,1.4,.4,1), opacity .2s ease;
        box-shadow:0 24px 60px rgba(0,0,0,0.3); }
      .pm-bugchat-overlay.open .pm-bugchat-window { transform:scaleY(1) scaleX(1); opacity:1; }
      html[data-theme="light"] .pm-bugchat-window, html:not([data-theme]) .pm-bugchat-window { background:#fff; }
      html[data-theme="dark"] .pm-bugchat-window { background:#1c1d22; }

      .pm-bugchat-header { display:flex; align-items:center; gap:10px; padding:16px 18px; flex-shrink:0;
        background:linear-gradient(135deg, var(--accent, #2f6fed), #6d8ef2); color:#fff; }
      .pm-bugchat-header-icon { width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.22);
        display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
      .pm-bugchat-header-text { flex:1; min-width:0; }
      .pm-bugchat-header-text b { display:block; font-size:0.98rem; }
      .pm-bugchat-header-text span { display:block; font-size:0.76rem; opacity:0.85; margin-top:1px; }
      .pm-bugchat-close { background:rgba(255,255,255,0.18); border:none; color:#fff; width:30px; height:30px; border-radius:50%;
        font-size:1.05rem; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center;
        transition:background .15s ease; line-height:1; }
      .pm-bugchat-close:hover { background:rgba(255,255,255,0.32); }

      .pm-bugchat-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:2px; }
      html[data-theme="light"] .pm-bugchat-messages, html:not([data-theme]) .pm-bugchat-messages { background:#f4f5f7; }
      html[data-theme="dark"] .pm-bugchat-messages { background:#141518; }

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

      /* Bolla appena inviata: un piccolo "pop" dal basso con leggero
         rimbalzo, diverso dal fade-in generico usato quando la lista viene
         semplicemente ridisegnata (caricamento, polling). */
      .chat-bubble-row.is-sending .chat-bubble { animation: pmBubbleSend .32s cubic-bezier(.34,1.56,.64,1); }
      .chat-bubble-row.is-sending.is-mine .chat-bubble { opacity:0.85; }
      @keyframes pmBubbleSend { from { opacity:0; transform:translateY(12px) scale(0.85); } to { opacity:1; transform:translateY(0) scale(1); } }

      .pm-bugchat-empty { text-align:center; opacity:0.55; padding:40px 20px; font-size:0.88rem; }
      .pm-bugchat-empty .pm-bugchat-empty-icon { font-size:1.8rem; display:block; margin-bottom:8px; }

      /* Spinner di caricamento mostrato subito all'apertura, mentre i
         messaggi arrivano dal server: prima restava tutto vuoto e dava
         l'impressione di essersi bloccato. */
      .pm-bugchat-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
        padding:50px 20px; opacity:0.55; font-size:0.85rem; }
      .pm-bugchat-spinner { width:22px; height:22px; border-radius:50%; border:2.5px solid rgba(127,127,127,0.3);
        border-top-color:var(--accent, #2f6fed); animation:pmSpin .7s linear infinite; }
      @keyframes pmSpin { to { transform:rotate(360deg); } }

      .pm-bugchat-form { display:flex; align-items:flex-end; gap:8px; padding:12px 14px; flex-shrink:0; }
      html[data-theme="light"] .pm-bugchat-form, html:not([data-theme]) .pm-bugchat-form { background:#fff; border-top:1px solid rgba(0,0,0,0.06); }
      html[data-theme="dark"] .pm-bugchat-form { background:#1c1d22; border-top:1px solid rgba(255,255,255,0.08); }
      .pm-bugchat-form textarea { flex:1; resize:none; max-height:110px; padding:11px 16px; border-radius:20px; border:1px solid var(--line, rgba(127,127,127,0.3));
        font-family:var(--font-body); font-size:0.92rem; line-height:1.35; transition:opacity .15s ease; }
      .pm-bugchat-form textarea:focus { outline:none; border-color:var(--accent, #2f6fed); }
      .pm-bugchat-form textarea:disabled { opacity:0.6; }
      .pm-bugchat-send { width:40px; height:40px; border-radius:50%; border:none; background:var(--accent, #2f6fed); color:#fff;
        font-size:1.05rem; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:transform .1s ease, opacity .15s ease; }
      .pm-bugchat-send:hover { transform:scale(1.06); }
      .pm-bugchat-send:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

      @keyframes pmChatIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

      @media (max-width:480px) {
        .pm-bugchat-overlay { padding:0; align-items:flex-end; }
        .pm-bugchat-window { max-width:none; max-height:92vh; border-radius:20px 20px 0 0; }
      }
    `;
    document.head.appendChild(style);
  }

  async function loadMessages(reportId) {
    const { data, error } = await PM_DB.functions.invoke('list-bug-report-messages', { body: { reportId } });
    if (error || !data || data.error) return [];
    return data.messages || [];
  }

  function renderMessageList(container, messages, user) {
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

  async function renderMessages(container, reportId, user, force) {
    const messages = await loadMessages(reportId);
    if (!force && messages.length === lastRenderedCount) return; // evita di ridisegnare/scattare se non ci sono novità
    lastRenderedCount = messages.length;

    if (!messages.length) {
      container.innerHTML = '<div class="pm-bugchat-empty"><span class="pm-bugchat-empty-icon">' + PM_ICONS.chat + '</span>' + esc(t('chat.empty', 'Nessun messaggio ancora.')) + '<br>' + esc(t('chat.empty_hint', 'Scrivi il primo qui sotto.')) + '</div>';
      return;
    }
    renderMessageList(container, messages, user);
  }

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 110) + 'px';
  }

  async function pmOpenBugReportChat(reportId, opts) {
    const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null;
    if (!user) return;
    const readOnly = !!(opts && opts.readOnly);
    injectStyleOnce();
    currentReservationId = reportId;
    lastRenderedCount = -1;

    const overlay = document.createElement('div');
    overlay.className = 'pm-bugchat-overlay';
    overlay.innerHTML =
      '<div class="pm-bugchat-window">' +
        '<div class="pm-bugchat-header">' +
          '<div class="pm-bugchat-header-icon">' + PM_ICONS.chat + '</div>' +
          '<div class="pm-bugchat-header-text"><b>' + esc(t('chat.report_title', 'Chat ticket')) + '</b><span>' + (readOnly ? esc(t('chat.closed_subtitle', 'Sola lettura — la pratica è chiusa.')) : esc(t('chat.subtitle', 'I messaggi arrivano anche su Telegram'))) + '</span></div>' +
          '<button class="pm-bugchat-close" type="button" aria-label="' + esc(t('common.close', 'Chiudi')) + '">×</button>' +
        '</div>' +
        '<div class="pm-bugchat-messages" id="pm-bugchat-messages"><div class="pm-bugchat-loading"><span class="pm-bugchat-spinner"></span>' + esc(t('common.loading', 'Caricamento...')) + '</div></div>' +
        (readOnly ? '' :
        '<form class="pm-bugchat-form" id="pm-bugchat-form">' +
          '<textarea id="pm-bugchat-input" rows="1" placeholder="' + esc(t('chat.placeholder', 'Scrivi un messaggio...')) + '" maxlength="2000" required></textarea>' +
          '<button type="submit" class="pm-bugchat-send" aria-label="' + esc(t('common.send', 'Invia')) + '">' + PM_ICONS.send + '</button>' +
        '</form>') +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const messagesBox = overlay.querySelector('#pm-bugchat-messages');
    const form = overlay.querySelector('#pm-bugchat-form');
    const input = overlay.querySelector('#pm-bugchat-input');
    const sendBtn = overlay.querySelector('.pm-bugchat-send');
    let isSending = false; // blocco esplicito, non basta disabilitare il bottone (vedi sotto)

    function close() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      currentReservationId = null;
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 220);
    }
    overlay.querySelector('.pm-bugchat-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function escHandler(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } });

    if (!readOnly && form && input) {
      input.addEventListener('input', () => autoResize(input));
      input.addEventListener('keydown', (e) => {
        // Premere Invio due volte molto rapidamente chiama requestSubmit()
        // due volte: la seconda arriverebbe comunque, anche col bottone già
        // disabilitato, perché non è un click sul bottone ma una chiamata
        // diretta. Il controllo vero è "isSending" in cima al submit.
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isSending) form.requestSubmit(); }
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSending) return; // blocco reale contro il doppio invio
        const text = input.value.trim();
        if (!text) return;

        isSending = true;
        sendBtn.disabled = true;
        input.disabled = true;

        // Visualizzazione ottimistica: la bolla compare SUBITO, prima
        // ancora che il server risponda, con un'animazione dedicata
        // (pmBubbleSend). Se l'invio fallisce, la togliamo e ridiamo il
        // testo all'utente; se riesce, il ridisegno forzato qui sotto la
        // sostituisce in modo trasparente con quella "vera" dal server.
        if (messagesBox.querySelector('.pm-bugchat-empty') || messagesBox.querySelector('.pm-bugchat-loading')) {
          messagesBox.innerHTML = '';
        }
        const optimisticMsg = { body: text, sender_id: user.id, sender_role: user.role, created_at: new Date().toISOString() };
        messagesBox.insertAdjacentHTML('beforeend', bubbleHtml(optimisticMsg, true, false, 'is-sending'));
        messagesBox.scrollTop = messagesBox.scrollHeight;

        input.value = '';
        autoResize(input);

        const { data, error } = await PM_DB.functions.invoke('send-bug-report-message', { body: { reportId, body: text } });

        isSending = false;
        sendBtn.disabled = false;
        input.disabled = false;

        let serverMessage = null;
        if (error && error.context && typeof error.context.json === 'function') {
          try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
        }
        if (error || !data || data.error) {
          // Invio fallito: via la bolla ottimistica, testo ridato all'utente.
          const failedRow = messagesBox.querySelector('.chat-bubble-row.is-sending:last-child');
          if (failedRow) failedRow.remove();
          if (!messagesBox.querySelector('.chat-bubble-row')) lastRenderedCount = -1; // forza un ridisegno pulito alla prossima apertura/poll
          input.value = text;
          autoResize(input);
          if (typeof pmToast === 'function') pmToast(serverMessage || (data && data.error) || t('chat.send_error', "Errore nell'invio del messaggio."), 'error');
          input.focus();
          return;
        }
        renderMessages(messagesBox, reportId, user, true);
        // Controllo "lampo": ricontrolla una volta sola circa 1,2s dopo un
        // invio riuscito, per beccare un'eventuale risposta rapida senza
        // aspettare il prossimo giro del polling regolare. È SOLO una
        // lettura (nessun invio), quindi zero rischio di duplicati.
        setTimeout(() => {
          if (currentReservationId === reportId) renderMessages(messagesBox, reportId, user, false);
        }, 1200);
      });
    }

    await renderMessages(messagesBox, reportId, user, true);
    if (!readOnly && input) input.focus();

    // Aggiornamento semplice: ricontrolla nuovi messaggi ogni 2,5 secondi
    // mentre il popup è aperto (niente sottoscrizioni realtime, per restare
    // semplice); ridisegna solo se il numero di messaggi è cambiato, così
    // non "salta" mentre stai leggendo o scrivendo. In sola lettura non ha
    // senso continuare a interrogare il server: la conversazione è chiusa
    // e non arriveranno nuovi messaggi da nessuna delle due parti.
    if (!readOnly) {
      pollTimer = setInterval(() => {
        if (currentReservationId === reportId) renderMessages(messagesBox, reportId, user, false);
      }, 2500);
    }
  }

  window.pmOpenBugReportChat = pmOpenBugReportChat;
})();
