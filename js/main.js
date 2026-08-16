document.addEventListener("DOMContentLoaded", () => {
  // Menu mobile
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  // Evidenzia la pagina corrente nel menu
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[data-nav]").forEach((a) => {
    if (a.getAttribute("data-nav") === path) a.classList.add("active");
  });

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  // Aggiorna il link "Area Riservata" / "Accedi" in base alla sessione.
  // Riusa le stesse chiavi già usate dal bottone principale della home
  // (home.cta.dashboard / home.cta.login, vedi auth.js -> pmUpdateHomeCta)
  // invece di introdurne di nuove per lo stesso identico testo.
  const navAuthSlot = document.querySelector("[data-nav-auth]");
  if (navAuthSlot) {
    const loggedIn = !!(window.Auth && Auth.getToken());
    navAuthSlot.href = loggedIn ? "dashboard.html" : "login.html";
    navAuthSlot.setAttribute("data-i18n", loggedIn ? "home.cta.dashboard" : "home.cta.login");
    if (typeof I18N !== "undefined") {
      navAuthSlot.textContent = I18N.t(loggedIn ? "home.cta.dashboard" : "home.cta.login");
    }
    document.addEventListener("i18n:changed", () => {
      navAuthSlot.textContent = I18N.t(loggedIn ? "home.cta.dashboard" : "home.cta.login");
    });
  }
});

/** Markup riutilizzabile della linea ECG, usato come divisore tra sezioni. */
function renderEcgDivider() {
  return `
  <div class="ecg-divider" aria-hidden="true">
    <svg viewBox="0 0 1400 46" preserveAspectRatio="none">
      <path class="ecg-line ecg-red" d="M0 23 L180 23 L210 23 L230 6 L250 40 L270 23 L300 23 L1400 23" />
      <path class="ecg-line" d="M0 23 L520 23 L550 23 L570 6 L590 40 L610 23 L640 23 L1400 23" />
    </svg>
  </div>`;
}
