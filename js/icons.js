/* Icone SVG condivise, al posto di emoji/simboli Unicode (che cambiano
   aspetto — o addirittura non esistono — a seconda del dispositivo/font).
   Tutte disegnate con stroke="currentColor": prendono automaticamente lo
   stesso colore del testo circostante, quindi restano leggibili e coerenti
   sia in tema chiaro che scuro senza bisogno di regole CSS separate.
   Uso: PM_ICONS.bell, PM_ICONS.dashboard, ecc. — stringhe HTML pronte da
   inserire con innerHTML. La sola eccezione è ✈ (Telegram), lasciata
   com'è perché riconoscibile come simbolo ufficiale dell'app. */
window.PM_ICONS = {
  dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  device: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>',
  logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  bug: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect x="8" y="6" width="8" height="12" rx="4"/><path d="M12 6V3"/><path d="M8 10H3"/><path d="M8 15H3"/><path d="M16 10h5"/><path d="M16 15h5"/><path d="M9 3l1.5 2"/><path d="M15 3l-1.5 2"/></svg>',
  chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.4A8.5 8.5 0 0 1 4 12.9 8.38 8.38 0 0 1 12.4 4 8.5 8.5 0 0 1 21 11.5Z"/></svg>',
  send: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  chevron: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polyline points="6 9 12 15 18 9"/></svg>',
  globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>',
};

/* Bandiere per il selettore di lingua, disegnate a mano invece di usare le
   emoji 🇮🇹🇬🇧... — le emoji bandiera sono glifi Unicode "compositi" (due
   lettere regionali unite) che alcuni sistemi/font non sanno comporre: su
   quei dispositivi non mostrano la bandiera ma le due lettere del codice
   paese affiancate, o un quadratino vuoto. Ogni bandiera qui è disegnata
   in un riquadro 30x20 (proporzione tipica da bandiera) e riempie l'intero
   cerchio del contenitore .lang-flag grazie a preserveAspectRatio="slice"
   (stesso comportamento di object-fit:cover in CSS): il cerchio stesso è
   la bandiera, senza bordi bianchi o angoli visibili attorno. */
window.PM_FLAGS = {
  it: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#009246"/><rect x="20" width="10" height="20" fill="#CE2B37"/></svg>',

  en: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#012169"/><line x1="0" y1="0" x2="30" y2="20" stroke="#fff" stroke-width="4"/><line x1="0" y1="20" x2="30" y2="0" stroke="#fff" stroke-width="4"/><line x1="0" y1="0" x2="30" y2="20" stroke="#C8102E" stroke-width="1.6"/><line x1="0" y1="20" x2="30" y2="0" stroke="#C8102E" stroke-width="1.6"/><rect x="12" width="6" height="20" fill="#fff"/><rect y="7" width="30" height="6" fill="#fff"/><rect x="13.5" width="3" height="20" fill="#C8102E"/><rect y="8.5" width="30" height="3" fill="#C8102E"/></svg>',

  es: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg>',

  de: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#FFCE00"/><rect width="30" height="6.7" fill="#000"/><rect y="6.7" width="30" height="6.6" fill="#D00"/></svg>',

  fr: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#0055A4"/><rect x="20" width="10" height="20" fill="#EF4135"/></svg>',

  pt: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#046A38"/><circle cx="12" cy="10" r="3.4" fill="#FFCE00" stroke="#046A38" stroke-width="0.4"/></svg>',

  ru: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#fff"/><rect y="6.7" width="30" height="6.6" fill="#0039A6"/><rect y="13.3" width="30" height="6.7" fill="#D52B1E"/></svg>',

  zh: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#DE2910"/><g fill="#FFDE00"><polygon points="0,-2.60 0.59,-0.81 2.47,-0.80 0.95,0.31 1.53,2.10 0.00,1.00 -1.53,2.10 -0.95,0.31 -2.47,-0.80 -0.59,-0.81" transform="translate(6.5,6)"/><polygon points="0,-0.90 0.20,-0.28 0.86,-0.28 0.33,0.11 0.53,0.73 0.00,0.35 -0.53,0.73 -0.33,0.11 -0.86,-0.28 -0.20,-0.28" transform="translate(12.2,3.2)"/><polygon points="0,-0.90 0.20,-0.28 0.86,-0.28 0.33,0.11 0.53,0.73 0.00,0.35 -0.53,0.73 -0.33,0.11 -0.86,-0.28 -0.20,-0.28" transform="translate(14.2,6.0)"/><polygon points="0,-0.90 0.20,-0.28 0.86,-0.28 0.33,0.11 0.53,0.73 0.00,0.35 -0.53,0.73 -0.33,0.11 -0.86,-0.28 -0.20,-0.28" transform="translate(13.5,9.3)"/><polygon points="0,-0.90 0.20,-0.28 0.86,-0.28 0.33,0.11 0.53,0.73 0.00,0.35 -0.53,0.73 -0.33,0.11 -0.86,-0.28 -0.20,-0.28" transform="translate(11.0,11.4)"/></g></svg>',

  ja: '<svg width="100%" height="100%" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="display:block"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/></svg>',
};
