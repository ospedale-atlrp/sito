/* Sostituisce l'aspetto di ogni <select> del sito con un menu a tendina
   "vero", disegnato con lo stesso stile a isola/vetro del resto del sito,
   invece di affidarsi al menu nativo del browser.
   FIX: il pannello con le opzioni ora viene agganciato direttamente al
   <body> con position:fixed (calcolata sulla posizione reale del bottone),
   non più dentro il contenitore del select. Prima, dentro contenitori che
   scorrono (es. la tabella account), il pannello restava "intrappolato"
   nello scroll interno invece di comparire sopra tutto: ora è sempre in
   primo piano, ovunque tu clicchi.
   Il <select> originale resta nel DOM (nascosto visivamente) così tutto il
   codice esistente che legge/scrive .value o ascolta 'change' continua a
   funzionare come prima. Va richiamato dopo aver ricreato dinamicamente dei
   select (es. la tabella account): pmEnhanceSelects(container) li aggancia. */
(function () {
  let openState = null; // { wrap, trigger, select, panel } — un solo menu aperto alla volta

  function injectStyleOnce() {
    if (document.getElementById('pm-select-style')) return;
    const style = document.createElement('style');
    style.id = 'pm-select-style';
    style.textContent = `
      .pm-select-wrap { position:relative; display:inline-block; width:100%; }
      .pm-select-native { position:absolute; inset:0; opacity:0; pointer-events:none; }

      .pm-select-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px;
        padding:12px 14px; border-radius:var(--radius-sm, 8px); border:1px solid var(--line, rgba(127,127,127,0.35));
        font-family:var(--font-body, inherit); font-size:0.95rem; cursor:pointer; text-align:left;
        transition:border-color .15s ease, box-shadow .15s ease; }
      html[data-theme="light"] .pm-select-trigger, html:not([data-theme]) .pm-select-trigger { background:#fff; color:#1a1a1e; }
      html[data-theme="dark"] .pm-select-trigger { background:#242529; color:#f2f2f5; border-color:rgba(255,255,255,0.16); }
      .pm-select-trigger.is-placeholder { opacity:0.55; }
      .pm-select-trigger:hover { border-color:var(--accent, #2f6fed); }
      .pm-select-trigger.is-open { border-color:var(--accent, #2f6fed); box-shadow:0 0 0 3px rgba(47,111,237,0.16); }
      .pm-select-trigger:disabled, .pm-select-trigger.is-disabled { opacity:0.5; cursor:not-allowed; }
      .pm-select-arrow { flex-shrink:0; font-size:0.7rem; opacity:0.55; transition:transform .16s ease; }
      .pm-select-trigger.is-open .pm-select-arrow { transform:rotate(180deg); }

      /* Il pannello è fisso rispetto alla finestra, non al contenitore: così
         non viene mai tagliato da uno scroll interno (tabelle, card...) e
         resta sempre sopra a tutto il resto. */
      .pm-select-panel { position:fixed; z-index:2000; max-height:260px; overflow-y:auto;
        border-radius:14px; padding:6px; opacity:0; transform:translateY(-6px) scale(0.98); pointer-events:none;
        transition:opacity .13s ease, transform .13s ease; }
      .pm-select-panel.open { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
      html[data-theme="light"] .pm-select-panel, html:not([data-theme]) .pm-select-panel { background:#fff; box-shadow:0 14px 34px rgba(20,20,30,0.22); border:1px solid rgba(0,0,0,0.08); }
      html[data-theme="dark"] .pm-select-panel { background:#1c1d22; box-shadow:0 14px 34px rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,0.1); }

      .pm-select-option { display:block; width:100%; text-align:left; padding:9px 12px; border-radius:9px; border:none; background:transparent;
        font-family:var(--font-body, inherit); font-size:0.92rem; cursor:pointer; transition:background .12s ease; }
      html[data-theme="light"] .pm-select-option, html:not([data-theme]) .pm-select-option { color:#1a1a1e; }
      html[data-theme="dark"] .pm-select-option { color:#f2f2f5; }
      .pm-select-option:hover { background:rgba(127,127,127,0.14); }
      .pm-select-option.is-selected { font-weight:700; background:rgba(47,111,237,0.12); }
      .pm-select-option:disabled { opacity:0.4; cursor:not-allowed; }
    `;
    document.head.appendChild(style);
  }

  function currentLabel(select) {
    const opt = select.options[select.selectedIndex];
    return opt ? opt.textContent : '';
  }
  function isPlaceholder(select) {
    const opt = select.options[select.selectedIndex];
    return !opt || !opt.value;
  }

  function positionPanel(panel, trigger) {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 220 && rect.top > spaceBelow;
    panel.style.left = rect.left + 'px';
    panel.style.width = rect.width + 'px';
    if (openUpward) {
      panel.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
      panel.style.top = 'auto';
    } else {
      panel.style.top = (rect.bottom + 6) + 'px';
      panel.style.bottom = 'auto';
    }
  }

  function closeOpen() {
    if (!openState) return;
    openState.trigger.classList.remove('is-open');
    openState.panel.classList.remove('open');
    const panel = openState.panel;
    setTimeout(() => panel.remove(), 140);
    openState = null;
  }

  function syncTrigger(select, trigger) {
    trigger.querySelector('.pm-select-label').textContent = currentLabel(select);
    trigger.classList.toggle('is-placeholder', isPlaceholder(select));
    trigger.classList.toggle('is-disabled', select.disabled);
  }

  function openPanel(wrap, select, trigger) {
    closeOpen();
    injectStyleOnce();
    const panel = document.createElement('div');
    panel.className = 'pm-select-panel';
    Array.from(select.options).forEach((opt) => {
      if (!opt.value && opt.disabled) return; // salta il placeholder "Seleziona"
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pm-select-option' + (opt.selected ? ' is-selected' : '');
      btn.textContent = opt.textContent;
      btn.disabled = opt.disabled;
      btn.addEventListener('click', () => {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncTrigger(select, trigger);
        closeOpen();
      });
      panel.appendChild(btn);
    });
    document.body.appendChild(panel);
    positionPanel(panel, trigger);
    requestAnimationFrame(() => { panel.classList.add('open'); trigger.classList.add('is-open'); });
    openState = { wrap, trigger, select, panel };
  }

  function enhanceOne(select) {
    if (select.dataset.pmEnhanced) return;
    select.dataset.pmEnhanced = '1';

    const wrap = document.createElement('div');
    wrap.className = 'pm-select-wrap';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('pm-select-native');
    select.tabIndex = -1;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pm-select-trigger';
    trigger.innerHTML = '<span class="pm-select-label"></span><span class="pm-select-arrow">▾</span>';
    wrap.appendChild(trigger);
    syncTrigger(select, trigger);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (select.disabled) return;
      if (openState && openState.select === select) { closeOpen(); return; }
      openPanel(wrap, select, trigger);
    });

    select.addEventListener('pm-select-refresh', () => syncTrigger(select, trigger));
    const form = select.closest('form');
    if (form) form.addEventListener('reset', () => setTimeout(() => syncTrigger(select, trigger), 0));
  }

  // Chiusura globale: click fuori, Esc, scroll (anche dentro contenitori
  // scrollabili, grazie al capture:true), ridimensionamento finestra.
  document.addEventListener('click', (e) => {
    if (!openState) return;
    if (openState.panel.contains(e.target) || openState.wrap.contains(e.target)) return;
    closeOpen();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOpen(); });
  window.addEventListener('scroll', () => closeOpen(), true);
  window.addEventListener('resize', () => closeOpen());

  function pmEnhanceSelects(root) {
    injectStyleOnce();
    (root || document).querySelectorAll('select').forEach(enhanceOne);
  }

  window.pmRefreshSelect = function (select) {
    if (select) select.dispatchEvent(new Event('pm-select-refresh'));
  };
  window.pmEnhanceSelects = pmEnhanceSelects;

  document.addEventListener('DOMContentLoaded', () => pmEnhanceSelects(document));
})();
