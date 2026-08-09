/* Strumento di debug TEMPORANEO: mostra un banner rosso in cima alla pagina
   con qualunque errore JavaScript, invece di farlo sparire in silenzio
   nella console (utile soprattutto da telefono, dove F12 non esiste).
   Va tolto una volta trovato e risolto il problema — non serve a lungo termine. */
(function () {
  function showError(message) {
    let box = document.getElementById('pm-debug-error-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pm-debug-error-box';
      box.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:99999; background:#c0392b; color:#fff; padding:12px 16px; font-family:monospace; font-size:0.8rem; white-space:pre-wrap; word-break:break-word; max-height:40vh; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.4);';
      document.body.appendChild(box);
    }
    const line = document.createElement('div');
    line.style.cssText = 'margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.3);';
    line.textContent = message;
    box.appendChild(line);
  }

  window.addEventListener('error', function (e) {
    showError('ERRORE: ' + e.message + '\n  File: ' + (e.filename || '?').split('/').pop() + '  Riga: ' + e.lineno + ':' + e.colno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    showError('PROMISE FALLITA: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
})();
