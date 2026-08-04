/* Sostituisce l'aspetto di ogni <select> del sito con un menu a tendina
   "vero", disegnato con lo stesso stile a isola/vetro del resto del sito
   (stesso identico look del pannello menu in alto a destra), invece di
   affidarsi al menu nativo del browser (diverso su ogni dispositivo,
   impossibile da restilizzare con solo il CSS).
   Il <select> originale resta nel DOM (nascosto visivamente) così tutto il
   codice esistente che legge/scrive .value o ascolta 'change' continua a
   funzionare esattamente come prima: questo script è solo "sopra".
   Va richiamato anche dopo aver ricreato dinamicamente dei select (es. la
   tabella account): pmEnhanceSelects(container) li aggancia. */
(function () {
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
      .pm-select-wrap.open .pm-select-trigger { border-color:var(--accent, #2f6fed); box-shadow:0 0 0 3px rgba(47,111,237,0.16); }
      .pm-select-trigger:disabled, .pm-select-trigger.is-disabled { opacity:0.5; cursor:not-allowed; }
      .pm-select-arrow { flex-shrink:0; font-size:0.7rem; opacity:0.55; transition:transform .16s ease; }
      .pm-select-wrap.open .pm-select-arrow { transform:rotate(180deg); }

      .pm-select-panel { position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:60; max-height:240px; overflow-y:auto;
        border-radius:14px; padding:6px; opacity:0; transform:translateY(-6px) scale(0.98); pointer-events:none;
        transition:opacity .14s ease, transform .14s ease; }
      .pm-select-wrap.open .pm-select-panel { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
      html[data-theme="light"] .pm-select-panel, html:not([data-theme]) .pm-select-panel { background:#fff; box-shadow:0 14px 34px rgba(20,20,30,0.18); border:1px solid rgba(0,0,0,0.08); }
      html[data-theme="dark"] .pm-select-panel { background:#1c1d22; box-shadow:0 14px 34px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); }

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

  function closeAll(except) {
    document.querySelectorAll('.pm-select-wrap.open').forEach((w) => { if (w !== except) w.classList.remove('open'); });
  }

  function currentLabel(select) {
    const opt = select.options[select.selectedIndex];
    return opt ? opt.textContent : '';
  }
  function isPlaceholder(select) {
    const opt = select.options[select.selectedIndex];
    return !opt || !opt.value;
  }

  function buildPanel(wrap, select, trigger) {
    const panel = document.createElement('div');
    panel.className = 'pm-select-panel';
    Array.from(select.options).forEach((opt) => {
      if (!opt.value && opt.disabled) return; // salta il placeholder "Seleziona" nell'elenco cliccabile
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pm-select-option' + (opt.selected ? ' is-selected' : '');
      btn.textContent = opt.textContent;
      btn.disabled = opt.disabled;
      btn.addEventListener('click', () => {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncTrigger(select, trigger);
        wrap.classList.remove('open');
      });
      panel.appendChild(btn);
    });
    return panel;
  }

  function syncTrigger(select, trigger) {
    trigger.querySelector('.pm-select-label').textContent = currentLabel(select);
    trigger.classList.toggle('is-placeholder', isPlaceholder(select));
    trigger.classList.toggle('is-disabled', select.disabled);
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

    let panel = buildPanel(wrap, select, trigger);
    wrap.appendChild(panel);
    syncTrigger(select, trigger);

    trigger.addEventListener('click', () => {
      if (select.disabled) return;
      const willOpen = !wrap.classList.contains('open');
      closeAll(wrap);
      if (willOpen) {
        // Ricostruita ad ogni apertura: copre il caso in cui le <option> del
        // select siano cambiate dinamicamente dopo il primo aggancio (es.
        // l'elenco ruoli assegnabili, diverso da riga a riga).
        panel.remove();
        panel = buildPanel(wrap, select, trigger);
        wrap.appendChild(panel);
      }
      wrap.classList.toggle('open', willOpen);
    });

    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') wrap.classList.remove('open'); });

    // Se qualche altro script cambia .value via JS senza passare dal
    // pannello (es. reset del form, o codice che nasconde/svuota un campo),
    // il testo del bottone resta sincronizzato.
    select.addEventListener('pm-select-refresh', () => syncTrigger(select, trigger));
    const form = select.closest('form');
    if (form) form.addEventListener('reset', () => setTimeout(() => syncTrigger(select, trigger), 0));
  }

  function pmEnhanceSelects(root) {
    injectStyleOnce();
    (root || document).querySelectorAll('select').forEach(enhanceOne);
  }

  // Da chiamare da codice esterno dopo un select.value = ... manuale, per
  // tenere sincronizzato il testo del bottone col valore vero.
  window.pmRefreshSelect = function (select) {
    if (select) select.dispatchEvent(new Event('pm-select-refresh'));
  };
  window.pmEnhanceSelects = pmEnhanceSelects;

  document.addEventListener('DOMContentLoaded', () => pmEnhanceSelects(document));
})();
