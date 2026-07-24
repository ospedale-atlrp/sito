/*
 * Archivio locale dei bandi.
 * Il sito continua a funzionare anche quando server.js non e' avviato:
 * la Direzione pubblica il bando e la pagina pubblica lo legge subito.
 */
const BandoStore = (function () {
  const KEY = "atlantis_active_bando";

  function parse(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function read() {
    try {
      const bando = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!bando || !bando.startAt || !bando.endAt) return null;
      const start = parse(bando.startAt);
      const end = parse(bando.endAt);
      if (!start || !end || start >= end) {
        localStorage.removeItem(KEY);
        return null;
      }
      if (Date.now() > end.getTime()) {
        localStorage.removeItem(KEY);
        return null;
      }
      return bando;
    } catch {
      localStorage.removeItem(KEY);
      return null;
    }
  }

  function create(startAt, endAt) {
    const start = parse(startAt);
    const end = parse(endAt);
    if (!start || !end || start >= end) {
      throw new Error("Inserisci una data e un'ora di apertura e chiusura valide.");
    }
    if (read()) throw new Error("Esiste gia' un bando programmato o aperto.");

    const bando = {
      id: `local_${Date.now()}`,
      startAt,
      endAt,
      startDate: startAt.slice(0, 10),
      endDate: endAt.slice(0, 10),
      createdAt: new Date().toISOString(),
      active: true,
    };
    localStorage.setItem(KEY, JSON.stringify(bando));
    return bando;
  }

  function getManaged() {
    return read();
  }

  function getPublic() {
    const bando = read();
    if (!bando) return null;
    const start = parse(bando.startAt);
    const end = parse(bando.endAt);
    return Date.now() >= start.getTime() && Date.now() <= end.getTime() ? bando : null;
  }

  function close() {
    localStorage.removeItem(KEY);
  }

  return { KEY, create, getManaged, getPublic, close };
})();
