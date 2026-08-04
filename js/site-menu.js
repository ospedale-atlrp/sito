/* Menu globale: lingua, aspetto, notifiche e accesso. */
const PM_THEME_KEY = "pm_theme";

function pmThemePreference() { return localStorage.getItem(PM_THEME_KEY) || "system"; }
function pmGetTheme() { const pref=pmThemePreference(); return pref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref; }
function pmApplyTheme(theme) { document.documentElement.setAttribute("data-theme", theme || pmGetTheme()); }
function pmSetTheme(pref) { localStorage.setItem(PM_THEME_KEY,pref); pmApplyTheme(); pmRenderSiteMenu(); }
pmApplyTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){if(pmThemePreference()==="system")pmApplyTheme();});
function pmRoleAtLeast(role,minRole) { const roles=typeof PM_ROLES!=="undefined"?PM_ROLES:[]; return roles.indexOf(role)>=roles.indexOf(minRole) && roles.indexOf(minRole)!==-1; }

/* Nuovo look del pannello menu: scheda sfocata che scivola da destra, in
   coerenza con lo stile "a isola" già usato nella dashboard. Iniettato una
   sola volta perché non tocchiamo css/style.css. */
function pmInjectSiteMenuStyle() {
  if (document.getElementById("pm-site-menu-style")) return;
  const style = document.createElement("style");
  style.id = "pm-site-menu-style";
  style.textContent = `
    .site-topleft-float { position:fixed; top:18px; left:18px; z-index:998; display:flex; align-items:center; gap:10px; }

    .site-brand-float { display:flex; align-items:center; gap:10px;
      padding:8px 16px 8px 8px; border-radius:999px; text-decoration:none; font-weight:600; font-family:var(--font-body);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); transition:transform .15s ease; }
    .site-brand-float:hover { transform:translateY(-1px); }
    .site-brand-float .brand-logo-icon { width:32px; height:32px; border-radius:50%; object-fit:cover; flex-shrink:0; }
    html[data-theme="light"] .site-brand-float, html:not([data-theme]) .site-brand-float { background:rgba(255,255,255,0.75); box-shadow:0 4px 16px rgba(20,20,30,0.14); border:1px solid rgba(0,0,0,0.06); }
    html[data-theme="dark"] .site-brand-float { background:rgba(40,42,48,0.75); box-shadow:0 4px 16px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); }
    html[data-theme="light"] .site-brand-float, html:not([data-theme]) .site-brand-float, html[data-theme="light"] .site-brand-float span, html:not([data-theme]) .site-brand-float span { color:#1c1c22 !important; }
    html[data-theme="dark"] .site-brand-float, html[data-theme="dark"] .site-brand-float span { color:#f2f2f5 !important; }

    .site-bugreport-float { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; text-decoration:none;
      font-weight:600; font-family:var(--font-body); font-size:0.85rem; white-space:nowrap;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); transition:transform .15s ease; }
    .site-bugreport-float:hover { transform:translateY(-1px); }
    html[data-theme="light"] .site-bugreport-float, html:not([data-theme]) .site-bugreport-float { background:rgba(255,255,255,0.75); box-shadow:0 4px 16px rgba(20,20,30,0.14); border:1px solid rgba(0,0,0,0.06); color:#1c1c22 !important; }
    html[data-theme="dark"] .site-bugreport-float { background:rgba(40,42,48,0.75); box-shadow:0 4px 16px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); color:#f2f2f5 !important; }

    @media (max-width: 560px) {
      .site-brand-float { padding:8px; }
      .site-brand-float .brand-text { display:none; }
      .site-bugreport-float .bugreport-text { display:none; }
      .site-bugreport-float { padding:8px; }
    }

    .site-menu-toggle { position:fixed; top:18px; right:18px; z-index:1001; width:46px; height:46px; border-radius:50%; border:none; cursor:pointer;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px;
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition:transform .15s ease; }
    .site-menu-toggle:hover { transform:scale(1.06); }
    .site-menu-toggle span { display:block; width:20px; height:2px; border-radius:2px; background:currentColor; transition:all .2s ease; }
    html[data-theme="light"] .site-menu-toggle, html:not([data-theme]) .site-menu-toggle { background:rgba(255,255,255,0.75); color:#1c1c22 !important; box-shadow:0 4px 16px rgba(20,20,30,0.14); border:1px solid rgba(0,0,0,0.06); }
    html[data-theme="dark"] .site-menu-toggle { background:rgba(40,42,48,0.75); color:#f2f2f5 !important; box-shadow:0 4px 16px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); }
    .site-menu-toggle[aria-expanded="true"] span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
    .site-menu-toggle[aria-expanded="true"] span:nth-child(2) { opacity:0; }
    .site-menu-toggle[aria-expanded="true"] span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }

    .site-menu-guest-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%;
      padding:11px 14px; border-radius:12px; background:#229ED9; color:#fff !important; text-decoration:none;
      font-family:var(--font-body); font-weight:600; font-size:0.9rem; transition:background .15s ease, transform .15s ease; }
    .site-menu-guest-btn:hover { background:#1688bf; transform:translateY(-1px); }

    .site-menu-panel { position:fixed; top:74px; right:18px; z-index:1000; width:min(310px, calc(100vw - 36px));
      border-radius:18px; padding:10px; opacity:0; transform:translateY(-8px) scale(0.97); pointer-events:none;
      transition:opacity .16s ease, transform .16s ease; }
    .site-menu-panel.open { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
    html[data-theme="light"] .site-menu-panel, html:not([data-theme]) .site-menu-panel { background:#ffffff; box-shadow:0 14px 42px rgba(20,20,30,0.2); border:1px solid rgba(0,0,0,0.08); }
    html[data-theme="dark"] .site-menu-panel { background:#1c1d22; box-shadow:0 14px 42px rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,0.1); }
    html[data-theme="light"] .site-menu-panel *, html:not([data-theme]) .site-menu-panel * { color:#1a1a1e !important; }
    html[data-theme="dark"] .site-menu-panel * { color:#f2f2f5 !important; }
    .site-menu-panel .site-menu-item.danger, .site-menu-panel .site-menu-item.danger * { color:#c0392b !important; }
    .site-menu-panel .menu-notice-count, .site-menu-panel .menu-notice-count * { color:#fff !important; }

    .site-menu-section { padding:10px; border-radius:14px; margin-bottom:8px; }
    html[data-theme="light"] .site-menu-section, html:not([data-theme]) .site-menu-section { background:rgba(0,0,0,0.035); }
    html[data-theme="dark"] .site-menu-section { background:rgba(255,255,255,0.05); }
    .site-menu-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.06em; opacity:0.6; margin-bottom:6px; font-weight:700; }
    .site-menu-account-head { display:flex; align-items:center; gap:10px; padding-bottom:8px; margin-bottom:6px; border-bottom:1px solid rgba(127,127,127,0.18); }
    .site-menu-account-head .account-avatar img { width:34px; height:34px; border-radius:50%; object-fit:cover; }
    .site-menu-account-head .account-name { font-weight:700; font-size:0.92rem; }
    .site-menu-account-head .account-status { font-size:0.76rem; opacity:0.65; }
    .site-menu-item { display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:8px 10px; border-radius:10px; border:none; background:transparent; cursor:pointer; font-family:var(--font-body); font-size:0.86rem; text-decoration:none; transition:background .15s ease; }
    .site-menu-item:hover { background:rgba(127,127,127,0.14); }
    .site-menu-item.active { font-weight:700; background:rgba(127,127,127,0.12); }
    .notification-menu-button { justify-content:space-between; margin-top:6px; }
    @media (min-width: 641px) and (max-width: 1024px) { .notification-menu-button { margin-top:12px; } }
    .notice-btn-right { display:flex; align-items:center; gap:7px; }
    .menu-notice-count { background:#c0392b; font-size:0.7rem; padding:1px 7px; border-radius:999px; min-width:17px; text-align:center; }
    .menu-notice-count.is-zero { background:rgba(127,127,127,0.35); }
    .menu-notice-arrow { display:inline-block; font-size:0.7rem; opacity:0.6; transition:transform .18s ease; }
    .notification-menu-button[aria-expanded="true"] .menu-notice-arrow { transform:rotate(180deg); }
    .menu-notice-list { max-height:0; opacity:0; margin-top:0; overflow:hidden; display:flex; flex-direction:column; gap:4px;
      transition:max-height .24s ease, opacity .18s ease, margin-top .24s ease; }
    .menu-notice-list.open { max-height:240px; opacity:1; margin-top:8px; overflow-y:auto; padding-top:8px; border-top:1px solid rgba(127,127,127,0.18); }
    .notification-item { position:relative; padding:7px 26px 7px 9px; border-radius:10px; font-size:0.8rem; line-height:1.3; transition:opacity .15s ease; }
    .notice-delete { position:absolute; top:5px; right:5px; width:18px; height:18px; padding:0; border:none; border-radius:50%;
      background:rgba(127,127,127,0.2); color:inherit; font-size:0.8rem; line-height:1; cursor:pointer;
      display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .15s ease, background .15s ease, color .15s ease; }
    .notification-item:hover .notice-delete, .notice-delete:focus-visible { opacity:0.85; }
    .notice-delete:hover { opacity:1; background:#c0392b; color:#fff; }
    @media (hover: none) { .notice-delete { opacity:0.45; } }
    html[data-theme="light"] .notification-item, html:not([data-theme]) .notification-item { background:rgba(0,0,0,0.045); }
    html[data-theme="dark"] .notification-item { background:rgba(255,255,255,0.07); }
    .notification-item b { display:block; margin-bottom:1px; }
    .site-menu-langs-full, .theme-choices { display:flex; gap:5px; flex-wrap:wrap; }
    .site-menu-langs-full button, .theme-choices button { flex:1; min-width:78px; padding:7px 6px; border-radius:10px; border:1px solid transparent; background:rgba(127,127,127,0.1); cursor:pointer; font-family:var(--font-body); font-size:0.78rem; display:flex; flex-direction:column; align-items:center; gap:2px; transition:all .15s ease; }
    .site-menu-langs-full button.active, .theme-choices button.active { border-color:rgba(127,127,127,0.35); font-weight:700; }
    html[data-theme="light"] .site-menu-langs-full button.active, html:not([data-theme]) .site-menu-langs-full button.active,
    html[data-theme="light"] .theme-choices button.active, html:not([data-theme]) .theme-choices button.active { background:rgba(0,0,0,0.08); }
    html[data-theme="dark"] .site-menu-langs-full button.active, html[data-theme="dark"] .theme-choices button.active { background:rgba(255,255,255,0.16); }
  `;
  document.head.appendChild(style);
}

function pmBuildSiteMenuShell(){
  pmInjectSiteMenuStyle();
  if(document.getElementById("site-menu-toggle"))return;

  const topLeft=document.createElement("div"); topLeft.className="site-topleft-float"; document.body.appendChild(topLeft);

  const brand=document.createElement("a"); brand.className="site-brand-float";
  brand.innerHTML='<img src="../img/logo_ospedale.png" alt="Logo Policlinico Nazionale Montessori" class="brand-logo-icon" /><span class="brand-text">Policlinico Nazionale Montessori</span>';
  // Funziona sia dalla home nella radice sia dalle pagine in index/.
  brand.href="../index.html";
  topLeft.appendChild(brand);

  const bugLink=document.createElement("a"); bugLink.className="site-bugreport-float"; bugLink.href="segnalazioni.html";
  bugLink.innerHTML='🐞 <span class="bugreport-text">Segnalazioni Bug</span>';
  topLeft.appendChild(bugLink);

  const toggle=document.createElement("button"); toggle.id="site-menu-toggle";toggle.className="site-menu-toggle";toggle.setAttribute("aria-label","Apri menu");toggle.setAttribute("aria-expanded","false");toggle.innerHTML="<span></span><span></span><span></span>";document.body.appendChild(toggle);
  const panel=document.createElement("aside");panel.id="site-menu-panel";panel.className="site-menu-panel";document.body.appendChild(panel);
  toggle.addEventListener("click",function(e){e.stopPropagation();const open=panel.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});
  document.addEventListener("click",function(e){if(!panel.contains(e.target)&&!toggle.contains(e.target)){panel.classList.remove("open");toggle.setAttribute("aria-expanded","false");}});
}
function pmMenuItem(href,label,icon){const page=location.pathname.split("/").pop()||"index.html";return '<a href="'+href+'" class="site-menu-item '+(page===href?"active":"")+'">'+(icon?icon+" ":"")+label+'</a>';}

/* Avvisi: letti dalla tabella "notifications" su Supabase (per ruolo o per
   singolo utente). Lo stato "letto/non letto" vive nella tabella
   notification_status. */
const PM_NOTICE_HIDE_AFTER_MS = 3 * 60 * 60 * 1000; // 3 ore dopo essere state viste, spariscono dalla lista
/* Salvataggio di "letta"/"eliminata": usa fetch con keepalive:true invece
   del client Supabase normale, perché queste scritture partono spesso un
   attimo prima di un cambio pagina (chiudi il pannello ed esci, o navighi
   altrove) — con un fetch normale il browser interrompe la richiesta a
   metà quando la pagina cambia, e lo stato non viene mai salvato davvero.
   keepalive fa sì che la richiesta venga comunque completata in background
   anche se la pagina che l'ha avviata non c'è più. Usato solo qui (non su
   tutte le chiamate Supabase) perché il browser limita la quantità totale
   di dati "in volo" nelle richieste keepalive: per questi payload minuscoli
   non è un problema, per fetch più grandi (liste, upload) lo sarebbe. */
async function pmSupabaseKeepaliveUpsert(table, rows, onConflictCols) {
  if (!window.PM_SUPABASE_URL || !window.PM_SUPABASE_PUBLISHABLE_KEY || !window.PM_DB) return;
  try {
    const { data: sessionData } = await PM_DB.auth.getSession();
    const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
    if (!token) return;
    const url = window.PM_SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + table + "?on_conflict=" + encodeURIComponent(onConflictCols);
    await fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "apikey": window.PM_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": "Bearer " + token,
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });
  } catch (_) { /* un salvataggio di stato avviso mancato non deve bloccare l'interfaccia */ }
}
async function pmFetchNotificationStatus(user) {
  if (!user || !window.PM_DB) return {};
  const { data, error } = await PM_DB.from("notification_status").select("notification_id, seen_at, dismissed_at").eq("user_id", user.id);
  const map = {};
  if (!error) (data || []).forEach(function (row) { map[row.notification_id] = row; });
  return map;
}
async function pmMarkNoticesSeen(user, ids) {
  if (!user || !ids.length) return;
  const now = new Date().toISOString();
  const rows = ids.map(function (id) { return { user_id: user.id, notification_id: id, seen_at: now }; });
  await pmSupabaseKeepaliveUpsert("notification_status", rows, "user_id,notification_id");
}
async function pmDismissNotice(user, id) {
  if (!user) return;
  await pmSupabaseKeepaliveUpsert("notification_status", [{ user_id: user.id, notification_id: id, dismissed_at: new Date().toISOString() }], "user_id,notification_id");
}
async function pmFetchNotifications(user) {
  if (!user || !window.PM_DB) return [];
  const [byRole, byUser] = await Promise.all([
    PM_DB.from("notifications").select("*").eq("target_role", user.role).order("created_at", { ascending: false }).limit(20),
    PM_DB.from("notifications").select("*").eq("target_user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const merged = (byRole.data || []).concat(byUser.data || []);
  merged.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  return merged.slice(0, 20);
}

async function pmRenderSiteMenu(){
  pmBuildSiteMenuShell();const panel=document.getElementById("site-menu-panel"),user=typeof pmCurrentUser==="function"?pmCurrentUser():null,lang=typeof I18N!=="undefined"?I18N.current():"it",pref=pmThemePreference();let html="";
  let notices = [], visibleNotices = [], unread = 0, statusMap = {};
  if (user) {
    const results = await Promise.all([pmFetchNotifications(user), pmFetchNotificationStatus(user)]);
    notices = results[0];
    statusMap = results[1];
    const now = Date.now();
    visibleNotices = notices.filter(function (n) {
      const st = statusMap[n.id];
      if (st && st.dismissed_at) return false;
      if (st && st.seen_at) { return (now - new Date(st.seen_at).getTime()) < PM_NOTICE_HIDE_AFTER_MS; }
      return true;
    });
    unread = visibleNotices.filter(function (n) { const st = statusMap[n.id]; return !st || !st.seen_at; }).length;
  }
  if(user){html+='<div class="site-menu-section"><div class="site-menu-account-head"><div class="account-avatar"><img src="../img/logo_ospedale.png" alt="Logo Policlinico Nazionale Montessori" /></div><div><div class="account-name">'+user.username+'</div><div class="account-status">'+user.role+'</div></div></div>'+pmMenuItem("dashboard.html","Area riservata","▣")+pmMenuItem("segnalazioni.html","Segnalazioni","🐞")+'<button class="site-menu-item notification-menu-button" id="site-menu-notices" aria-expanded="false"><span>🔔 Avvisi</span><span class="notice-btn-right"><span class="menu-notice-count'+(unread?'':' is-zero')+'">'+unread+'</span><span class="menu-notice-arrow">▾</span></span></button><div class="menu-notice-list" id="site-menu-notice-list">'+pmNoticeList(visibleNotices)+'</div><a href="#" id="site-menu-logout" class="site-menu-item danger">↪ Esci</a></div>';}else{html+='<div class="site-menu-section"><a href="login.html" class="site-menu-guest-btn">✈ Accedi con Telegram</a></div>';}
  html+='<div class="site-menu-section"><div class="site-menu-label">Lingua</div><div class="site-menu-langs site-menu-langs-full"><button data-lang="it" class="'+(lang==="it"?"active":"")+'">IT · Italiano</button><button data-lang="es" class="'+(lang==="es"?"active":"")+'">ESP · Spagnolo</button><button data-lang="en" class="'+(lang==="en"?"active":"")+'">ENG · Inglese</button></div></div>';
  html+='<div class="site-menu-section"><div class="site-menu-label">Aspetto del sito</div><div class="theme-choices"><button data-theme-choice="light" class="'+(pref==="light"?"active":"")+'">☼<span>Chiaro</span></button><button data-theme-choice="dark" class="'+(pref==="dark"?"active":"")+'">☾<span>Scuro</span></button><button data-theme-choice="system" class="'+(pref==="system"?"active":"")+'">▣<span>Dispositivo</span></button></div></div>';
  panel.innerHTML=html;
  panel.querySelectorAll('a[href="index.html"]').forEach(function(link){link.href="../index.html";});
  const log=document.getElementById("site-menu-logout");if(log)log.addEventListener("click",function(e){e.preventDefault();pmLogout();});
  panel.querySelectorAll("[data-lang]").forEach(function(b){b.addEventListener("click",function(){if(typeof I18N!=="undefined")I18N.load(b.dataset.lang);});});
  panel.querySelectorAll("[data-theme-choice]").forEach(function(b){b.addEventListener("click",function(){pmSetTheme(b.dataset.themeChoice);});});
  panel.querySelectorAll(".notice-delete").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      pmDismissNotice(user, btn.dataset.id);
      const item=btn.closest(".notification-item");
      if(item){ item.style.opacity="0"; setTimeout(function(){ item.remove(); },150); }
    });
  });
  const noticesBtn=document.getElementById("site-menu-notices"),list=document.getElementById("site-menu-notice-list");
  if(noticesBtn&&list)noticesBtn.addEventListener("click",function(){
    const willOpen=!list.classList.contains("open");
    list.classList.toggle("open",willOpen);
    noticesBtn.setAttribute("aria-expanded",String(willOpen));
    if(willOpen){
      const unseenIds = visibleNotices.filter(function(n){ const st=statusMap[n.id]; return !st || !st.seen_at; }).map(function(n){return n.id;});
      pmMarkNoticesSeen(user, unseenIds);
      const countEl=noticesBtn.querySelector(".menu-notice-count");
      if(countEl){countEl.textContent="0";countEl.classList.add("is-zero");}
    }
  });
}
function pmNoticeList(items){return items.length?items.slice(0,5).map(function(n){return '<div class="notification-item"><button type="button" class="notice-delete" data-id="'+n.id+'" aria-label="Elimina avviso">×</button><b>'+n.title+'</b><span>'+n.body+'</span></div>';}).join(""):'<div class="notification-item">Nessun avviso.</div>';}
// NB: niente listener DOMContentLoaded qui — ci pensa già auth.js a chiamare
// pmRenderSiteMenu() dopo aver caricato l'utente (per evitare un rendering
// prematuro con utente=null che cancellerebbe lo storico "letto" via
// pmPruneNoticeMap). Il menu resta comunque aggiornato al cambio lingua.
// (Lo stato letta/eliminata ora vive su Supabase, non più in localStorage:
// questo problema di rendering prematuro non lo riguarda più direttamente,
// ma il fetch inutile va comunque evitato.)
document.addEventListener("i18n:changed",pmRenderSiteMenu);
