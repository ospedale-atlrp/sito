/* Uniforma l'aspetto di tutti i <select> del sito: stessa forma, stesso
   bordo, stessa freccina, sia in tema chiaro che scuro — invece di lasciare
   che ogni browser disegni la sua versione di serie (diversa su Chrome,
   Firefox, Safari, mobile...). Nessun HTML da toccare: si applica da solo
   a ogni select esistente e a quelli aggiunti dopo. */
(function () {
  if (document.getElementById('pm-select-style')) return;
  const style = document.createElement('style');
  style.id = 'pm-select-style';
  style.textContent = `
    select {
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      width: 100%;
      padding: 12px 38px 12px 14px;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--line, rgba(127,127,127,0.35));
      font-family: var(--font-body, inherit);
      font-size: 0.95rem;
      cursor: pointer;
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 11px;
      transition: border-color .15s ease, box-shadow .15s ease;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='%23888' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    }
    html[data-theme="light"] select, html:not([data-theme]) select { background-color:#fff; color:#1a1a1e; }
    html[data-theme="dark"] select { background-color:#242529; color:#f2f2f5; border-color:rgba(255,255,255,0.16);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='%23bbb' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); }
    select:hover { border-color: var(--accent, #2f6fed); }
    select:focus { outline:none; border-color: var(--accent, #2f6fed); box-shadow: 0 0 0 3px rgba(47,111,237,0.18); }
    select:disabled { opacity:0.55; cursor:not-allowed; }
    select option { font-family: var(--font-body, inherit); }
  `;
  document.head.appendChild(style);
})();
