/* Finestre di dialogo (avviso/conferma/richiesta testo) nello stesso stile del
   sito, al posto dei popup brutti del browser (alert/confirm/prompt).
   Riusa le classi già esistenti .modal / .modal-card / .btn del sito, quindi
   non serve toccare il CSS: eredita automaticamente lo stesso stile. */
(function () {
  function buildModal(bodyHtml, buttonsHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.innerHTML =
      '<div class="modal-card" style="max-width:420px;">' +
        '<button class="icon-close" type="button" aria-label="Chiudi">×</button>' +
        '<div class="pm-dialog-body">' + bodyHtml + '</div>' +
        '<div class="pm-dialog-actions" style="margin-top:22px; display:flex; gap:10px; justify-content:flex-end;">' + buttonsHtml + '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function pmAlert(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const overlay = buildModal(
        '<h2 style="margin-top:0;">' + (opts.title || 'Avviso') + '</h2><p>' + message + '</p>',
        '<button type="button" class="btn btn-primary btn-sm js-ok">Ok</button>'
      );
      function close() { overlay.remove(); resolve(); }
      overlay.querySelector('.icon-close').onclick = close;
      overlay.querySelector('.js-ok').onclick = close;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('.js-ok').focus();
    });
  }

  function pmConfirm(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const overlay = buildModal(
        '<h2 style="margin-top:0;">' + (opts.title || 'Conferma') + '</h2><p>' + message + '</p>',
        '<button type="button" class="btn btn-outline btn-sm js-cancel">' + (opts.cancelLabel || 'Annulla') + '</button>' +
        '<button type="button" class="btn btn-primary btn-sm js-ok">' + (opts.okLabel || 'Conferma') + '</button>'
      );
      function close(result) { overlay.remove(); resolve(result); }
      overlay.querySelector('.icon-close').onclick = () => close(false);
      overlay.querySelector('.js-cancel').onclick = () => close(false);
      overlay.querySelector('.js-ok').onclick = () => close(true);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      overlay.querySelector('.js-ok').focus();
    });
  }

  function pmPrompt(message, defaultValue, opts) {
    opts = opts || {};
    const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return new Promise((resolve) => {
      const overlay = buildModal(
        '<h2 style="margin-top:0;">' + (opts.title || 'Richiesta') + '</h2><p>' + message + '</p>' +
        '<input type="text" class="staff-text-input js-input" style="width:100%;" value="' + esc(defaultValue) + '">',
        '<button type="button" class="btn btn-outline btn-sm js-cancel">Annulla</button>' +
        '<button type="button" class="btn btn-primary btn-sm js-ok">Conferma</button>'
      );
      const input = overlay.querySelector('.js-input');
      function close(result) { overlay.remove(); resolve(result); }
      overlay.querySelector('.icon-close').onclick = () => close(null);
      overlay.querySelector('.js-cancel').onclick = () => close(null);
      overlay.querySelector('.js-ok').onclick = () => close(input.value);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(input.value); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      input.focus();
      input.select();
    });
  }

  function pmToast(message, type) {
    type = type || 'success';
    let host = document.getElementById('pm-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pm-toast-host';
      host.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px; align-items:flex-end;';
      document.body.appendChild(host);
    }
    const toast = document.createElement('div');
    const isError = type === 'error';
    toast.textContent = message;
    toast.style.cssText =
      'max-width:340px; padding:12px 16px; border-radius:var(--radius-sm, 8px); font-family:var(--font-body, inherit); font-size:0.9rem; ' +
      'color:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.18); opacity:0; transform:translateY(-8px); transition:opacity .2s ease, transform .2s ease; ' +
      'background:' + (isError ? '#c0392b' : '#2f8f5b') + ';';
    host.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    const remove = () => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)'; setTimeout(() => toast.remove(), 200); };
    toast.addEventListener('click', remove);
    setTimeout(remove, isError ? 5000 : 3000);
  }

  function pmShowGeneratedPassword(password) {
    return new Promise((resolve) => {
      const overlay = buildModal(
        '<h2 style="margin-top:0;">Nuova password generata</h2>' +
        '<p>Ecco la nuova password. Comunicala con attenzione, non verrà mostrata di nuovo.</p>' +
        '<p style="font-family:monospace; font-size:1.35rem; text-align:center; padding:14px; border-radius:8px; background:rgba(127,127,127,0.18); letter-spacing:1px; margin:14px 0;">' + password + '</p>',
        '<button type="button" class="btn btn-primary btn-sm js-ok">Ho preso nota, chiudi</button>'
      );
      function close() { overlay.remove(); resolve(); }
      overlay.querySelector('.icon-close').onclick = close;
      overlay.querySelector('.js-ok').onclick = close;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('.js-ok').focus();
    });
  }

  window.pmAlert = pmAlert;
  window.pmConfirm = pmConfirm;
  window.pmPrompt = pmPrompt;
  window.pmToast = pmToast;
  window.pmShowGeneratedPassword = pmShowGeneratedPassword;
})();