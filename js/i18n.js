const I18N = (() => {
  const SUPPORTED = ["it", "en", "es", "de", "fr", "pt", "ru", "zh", "ja"];
  const STORAGE_KEY = "pnm_lang";
  let dict = {};

  function detectDefault() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || "it").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : "it";
  }

  function t(key, vars) {
    let str = dict[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      });
    }
    return str;
  }

  function applyToDom() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    // Etichette delle schede a pillola (vedi ui-tabs.js): l'attributo
    // data-seg-label viene letto da ui-tabs.js per costruire i bottoni.
    // Lo teniamo aggiornato qui; se una barra di schede è già stata
    // costruita, va ricostruita per mostrare il nuovo testo (vedi
    // l'evento "i18n:tabs-need-refresh" sotto).
    document.querySelectorAll("[data-seg-label-i18n]").forEach((el) => {
      el.setAttribute("data-seg-label", t(el.getAttribute("data-seg-label-i18n")));
    });
    document.documentElement.setAttribute("lang", current());
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === current());
    });
  }

  let currentLang = "it";
  function current() { return currentLang; }

  async function savePreferenceToServer(lang) {
    try {
      if (!window.PM_DB) return;
      const { data: sessionData } = await PM_DB.auth.getSession();
      if (!sessionData || !sessionData.session) return;
      await PM_DB.functions.invoke("set-language-preference", { body: { lang } });
    } catch (_ignored) { /* non blocca il cambio lingua se il salvataggio fallisce */ }
  }

  async function load(lang, opts) {
    if (!SUPPORTED.includes(lang)) lang = "it";
    try {
      const res = await fetch(`../js/lang/${lang}.json`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      dict = await res.json();
      currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      applyToDom();
      document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
      if (!opts || !opts.fromServer) savePreferenceToServer(lang);
    } catch (err) {
      console.error("i18n: impossibile caricare la lingua \"" + lang + "\":", err.message);
    }
  }

  async function syncFromServerIfLoggedIn() {
    try {
      if (!window.PM_DB) return null;
      const { data: sessionData } = await PM_DB.auth.getSession();
      if (!sessionData || !sessionData.session) return null;
      const { data: profile } = await PM_DB.from("profiles").select("preferred_language").eq("id", sessionData.session.user.id).maybeSingle();
      const lang = profile && profile.preferred_language;
      return SUPPORTED.includes(lang) ? lang : null;
    } catch (_ignored) {
      return null;
    }
  }

  async function init() {
    await load(detectDefault());
    const serverLang = await syncFromServerIfLoggedIn();
    if (serverLang && serverLang !== currentLang) await load(serverLang, { fromServer: true });
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.addEventListener("click", () => load(btn.dataset.lang));
    });
  }

  return { init, load, t, current, SUPPORTED };
})();

document.addEventListener("DOMContentLoaded", () => I18N.init());
