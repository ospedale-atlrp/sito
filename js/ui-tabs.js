/* Selettore "a isola" per organizzare dashboard/gestionale in schede,
   con sfondo sempre sfocato coerente col tema chiaro/scuro del sito.
   Funziona su blocchi già presenti nell'HTML: ogni pannello va marcato con
   data-seg-panel="id" e data-seg-label="Etichetta visibile"; questo script
   costruisce la barra e mostra/nasconde i pannelli, senza spostare o
   ricreare il contenuto (così tutto il codice che già punta a quegli id
   dentro continua a funzionare invariato). */
(function () {
  if (!document.getElementById('pm-segmented-style')) {
    const style = document.createElement('style');
    style.id = 'pm-segmented-style';
    style.textContent = `
      .pm-segmented { display:flex; flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; gap:4px; padding:5px; border-radius:999px; margin-bottom:22px; max-width:100%;
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
      .pm-segmented::-webkit-scrollbar { display:none; }
      html[data-theme="light"] .pm-segmented, html:not([data-theme]) .pm-segmented {
        background: rgba(255,255,255,0.55); box-shadow: 0 4px 20px rgba(20,20,30,0.09); border:1px solid rgba(0,0,0,0.06); }
      html[data-theme="light"] .pm-segmented.pm-segmented-dark, html:not([data-theme]) .pm-segmented.pm-segmented-dark {
        background: rgba(0,0,0,0.14); box-shadow: 0 4px 20px rgba(20,20,30,0.12); border:1px solid rgba(0,0,0,0.1); }
      html[data-theme="dark"] .pm-segmented {
        background: rgba(40,42,48,0.55); box-shadow: 0 4px 20px rgba(0,0,0,0.32); border:1px solid rgba(255,255,255,0.08); }
      .pm-segmented button { border:none; background:transparent; padding:9px 18px; border-radius:999px; font-family:var(--font-body); font-size:0.9rem; cursor:pointer; color:inherit; opacity:0.62; transition:all .15s ease; white-space:nowrap; }
      .pm-segmented button:hover { opacity:0.85; }
      .pm-segmented button.active { opacity:1; font-weight:600; }
      html[data-theme="light"] .pm-segmented button.active, html:not([data-theme]) .pm-segmented button.active { background:#fff; box-shadow:0 2px 10px rgba(0,0,0,0.09); }
      html[data-theme="dark"] .pm-segmented button.active { background:rgba(255,255,255,0.14); }
      .pm-segment-panel { display:none; }
      .pm-segment-panel.active { display:block; }
    `;
    document.head.appendChild(style);
  }

  function mountSegments(barEl, panelsContainerEl, opts) {
    opts = opts || {};
    if (!barEl || !panelsContainerEl) return null;
    const panels = Array.from(panelsContainerEl.querySelectorAll(':scope > [data-seg-panel]'));
    barEl.innerHTML = '';
    barEl.className = 'pm-segmented' + (barEl.id === 'staff-segment-bar' ? ' pm-segmented-dark' : '');
    if (panels.length <= 1) { barEl.style.display = 'none'; } else { barEl.style.display = ''; }

    function activate(id) {
      barEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.segId === id));
      panels.forEach((p) => p.classList.toggle('active', p.dataset.segPanel === id));
      if (typeof opts.onActivate === 'function') opts.onActivate(id);
    }

    panels.forEach((panel) => {
      const id = panel.dataset.segPanel;
      const label = panel.dataset.segLabel || id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.segId = id;
      btn.addEventListener('click', () => activate(id));
      barEl.appendChild(btn);
    });

    if (!panels.length) return null;
    activate(opts.initial || panels[0].dataset.segPanel);
    return { activate };
  }

  window.pmMountSegments = mountSegments;
})();
