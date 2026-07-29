/* Pagina pubblica bandi: legge direttamente il database condiviso Supabase. */
(function () {
  "use strict";
  const root = document.getElementById("public-bando");
  let current = null;
  let loadError = null;
  let renderedSignature = null;

  function formatDateTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("it-IT", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }
  function isOpen(bando) {
    if (!bando || !bando.start_at || !bando.end_at || bando.status === "annullato" || bando.status === "chiuso") return false;
    const now = Date.now();
    return new Date(bando.start_at).getTime() <= now && now <= new Date(bando.end_at).getTime();
  }
  function emptyStateMarkup() {
    const diagnostic = loadError ? '<p class="form-note">Errore di collegamento: '+String(loadError).replace(/[<>&]/g, '')+'</p>' : '';
    return '<div class="bandi-empty-state"><span class="bandi-empty-icon" aria-hidden="true">📋</span><p class="eyebrow">Reclutamento</p><h1>Non ci sono bandi aperti</h1><p>La Direzione Sanitaria pubblicherà qui le prossime selezioni.</p>'+diagnostic+'</div>';
  }
  function activeStateMarkup(bando) {
    return '<article class="bando-notice" aria-labelledby="bando-title"><header class="bando-notice-header"><div class="bando-notice-icon" aria-hidden="true">🏥</div><div><p class="eyebrow">Direzione Sanitaria</p><h1 id="bando-title">Bando di Concorso <span>– Policlinico Nazionale Montessori</span></h1></div><span class="bando-status">Candidature aperte</span></header><p class="bando-lead">La Direzione Sanitaria del Policlinico Nazionale Montessori comunica l’apertura del bando di concorso finalizzato alla selezione di nuovi tirocinanti da inserire nella struttura ospedaliera.</p><section class="bando-period" aria-label="Periodo di candidatura"><span class="bando-period-icon" aria-hidden="true">🗓</span><div><span class="bando-period-label">Periodo di candidatura</span><strong>Da '+formatDateTime(bando.start_at)+' a '+formatDateTime(bando.end_at)+'</strong></div></section><div class="bando-content-grid"><section class="bando-section"><h2>Modalità di partecipazione</h2><p>Per partecipare al concorso è necessario presentare un Curriculum Vitae cartaceo contenente codice fiscale, nome e cognome, contatto Telegram e curriculum aggiornato.</p></section><section class="bando-section"><h2>Requisiti di accesso</h2><p>Il Curriculum Vitae va consegnato presso la Sala Conferenze del Policlinico entro il termine indicato. Possono partecipare tutti i cittadini.</p></section></div><section class="bando-section bando-section-full"><h2>Svolgimento del concorso</h2><p>La Direzione Sanitaria esaminerà i curricula pervenuti. L’elenco degli ammessi sarà pubblicato sul canale ufficiale <a href="https://t.me/OspedaleAtlantis" target="_blank" rel="noopener noreferrer">@OspedaleAtlantis</a>.</p></section><footer class="bando-signature">✍️ La Direzione Sanitaria</footer></article>';
  }
  function render() {
    const signature = current ? current.id + ':' + current.updated_at : 'empty';
    if (signature === renderedSignature) return;
    renderedSignature = signature;
    root.innerHTML = isOpen(current) ? activeStateMarkup(current) : emptyStateMarkup();
  }
  async function refresh() {
    if (!window.PM_DB) return;
    const { data, error } = await PM_DB.from('bandi').select('*').in('status', ['programmato', 'aperto']).order('updated_at', { ascending: false }).limit(1);
    loadError = error ? error.message : null;
    current = error ? null : (data && data[0]) || null;
    render();
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (!root) return;
    render(); refresh();
    setInterval(refresh, 3000);
  });
})();
