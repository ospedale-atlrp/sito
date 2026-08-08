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
    document.documentElement.setAttribute("lang", current());
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === current());
    });
  }

  let currentLang = "it";
  function current() { return currentLang; }

  async function load(lang) {
    if (!SUPPORTED.includes(lang)) lang = "it";
    try {
      const res = await fetch(`../js/lang/${lang}.json`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      dict = await res.json();
      currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      applyToDom();
      document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
    } catch (err) {
      // Prima falliva in silenzio: se il file di traduzione manca o non
      // risponde, non succedeva nulla di visibile e sembrava "rotto".
      // Ora almeno lo segnaliamo in console per poterlo diagnosticare.
      console.error("i18n: impossibile caricare la lingua \"" + lang + "\":", err.message);
    }
  }

  async function init() {
    await load(detectDefault());
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.addEventListener("click", () => load(btn.dataset.lang));
    });
  }

  return { init, load, t, current, SUPPORTED };
})();

document.addEventListener("DOMContentLoaded", () => I18N.init());
