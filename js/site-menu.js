/* Menu globale: lingua, aspetto, notifiche e accesso. */
const PM_THEME_KEY = "pm_theme";
function pmThemePreference() { return localStorage.getItem(PM_THEME_KEY) || "system"; }
function pmGetTheme() { const pref=pmThemePreference(); return pref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref; }
function pmApplyTheme(theme) { document.documentElement.setAttribute("data-theme", theme || pmGetTheme()); }
function pmSetTheme(pref) { localStorage.setItem(PM_THEME_KEY,pref); pmApplyTheme(); pmRenderSiteMenu(); }
pmApplyTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){if(pmThemePreference()==="system")pmApplyTheme();});
function pmRoleAtLeast(role,minRole) { const roles=typeof PM_ROLES!=="undefined"?PM_ROLES:[]; return roles.indexOf(role)>=roles.indexOf(minRole) && roles.indexOf(minRole)!==-1; }

function pmBuildSiteMenuShell(){
  if(document.getElementById("site-menu-toggle"))return;
  const brand=document.createElement("a"); brand.href="index.html"; brand.className="site-brand-float"; brand.innerHTML='<img src="../img/logo_ospedale.png" alt="Logo Policlinico Nazionale Montessori" class="brand-logo-icon" /><span>Policlinico Nazionale Montessori</span>'; document.body.appendChild(brand);
  // Funziona sia dalla home nella radice sia dalle pagine in index/.
  brand.href="../index.html";
  const toggle=document.createElement("button"); toggle.id="site-menu-toggle";toggle.className="site-menu-toggle";toggle.setAttribute("aria-label","Apri menu");toggle.setAttribute("aria-expanded","false");toggle.innerHTML="<span></span><span></span><span></span>";document.body.appendChild(toggle);
  const panel=document.createElement("aside");panel.id="site-menu-panel";panel.className="site-menu-panel";document.body.appendChild(panel);
  toggle.addEventListener("click",function(e){e.stopPropagation();const open=panel.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});
  document.addEventListener("click",function(e){if(!panel.contains(e.target)&&!toggle.contains(e.target)){panel.classList.remove("open");toggle.setAttribute("aria-expanded","false");}});
}
function pmMenuItem(href,label,icon){const page=location.pathname.split("/").pop()||"index.html";return '<a href="'+href+'" class="site-menu-item '+(page===href?"active":"")+'">'+(icon?icon+" ":"")+label+'</a>';}
function pmRenderSiteMenu(){
  pmBuildSiteMenuShell();const panel=document.getElementById("site-menu-panel"),user=typeof pmCurrentUser==="function"?pmCurrentUser():null,lang=typeof I18N!=="undefined"?I18N.current():"it",pref=pmThemePreference();let html="";
  if(user){const n=typeof pmStaffNotices==="function"?pmStaffNotices(user):[], unread=n.filter(function(x){return !x.read;}).length;html+='<div class="site-menu-section"><div class="site-menu-account-head"><div class="account-avatar"><img src="../img/logo_ospedale.png" alt="Logo Policlinico Nazionale Montessori" /></div><div><div class="account-name">'+user.username+'</div><div class="account-status">'+user.role+'</div></div></div>'+pmMenuItem("dashboard.html","Area riservata","▣")+'<button class="site-menu-item notification-menu-button" id="site-menu-notices">🔔 Avvisi <span class="menu-notice-count">'+unread+'</span></button><div class="menu-notice-list" id="site-menu-notice-list" hidden>'+pmNoticeList(n)+'</div><a href="#" id="site-menu-logout" class="site-menu-item danger">↪ Esci</a></div>';}else{html+='<div class="site-menu-section">'+pmMenuItem("login.html","Accesso personale","▣")+pmMenuItem("area-personale.html","Area personale Telegram","✈")+'</div>';}
  html+='<div class="site-menu-section"><div class="site-menu-label">Naviga</div>'+pmMenuItem("staff.html","La nostra direzione","▤")+pmMenuItem("galleria.html","Foto di gruppo","▧")+pmMenuItem("index.html","Torna alla Home","⌂")+'</div>';
  html+='<div class="site-menu-section"><div class="site-menu-label">Lingua</div><div class="site-menu-langs site-menu-langs-full"><button data-lang="it" class="'+(lang==="it"?"active":"")+'">IT · Italiano</button><button data-lang="es" class="'+(lang==="es"?"active":"")+'">ESP · Spagnolo</button><button data-lang="en" class="'+(lang==="en"?"active":"")+'">ENG · Inglese</button></div></div>';
  html+='<div class="site-menu-section"><div class="site-menu-label">Aspetto del sito</div><div class="theme-choices"><button data-theme-choice="light" class="'+(pref==="light"?"active":"")+'">☼<span>Chiaro</span></button><button data-theme-choice="dark" class="'+(pref==="dark"?"active":"")+'">☾<span>Scuro</span></button><button data-theme-choice="system" class="'+(pref==="system"?"active":"")+'">▣<span>Dispositivo</span></button></div></div>';
  panel.innerHTML=html;
  panel.querySelectorAll('a[href="index.html"]').forEach(function(link){link.href="../index.html";});
  const log=document.getElementById("site-menu-logout");if(log)log.addEventListener("click",function(e){e.preventDefault();pmLogout();});
  panel.querySelectorAll("[data-lang]").forEach(function(b){b.addEventListener("click",function(){if(typeof I18N!=="undefined")I18N.load(b.dataset.lang);});});
  panel.querySelectorAll("[data-theme-choice]").forEach(function(b){b.addEventListener("click",function(){pmSetTheme(b.dataset.themeChoice);});});
  const notices=document.getElementById("site-menu-notices"),list=document.getElementById("site-menu-notice-list");if(notices&&list)notices.addEventListener("click",function(){list.hidden=!list.hidden;});
}
function pmNoticeList(items){return items.length?items.slice().reverse().slice(0,5).map(function(n){return '<div class="notification-item"><b>'+n.title+'</b><span>'+n.body+'</span></div>';}).join(""):'<div class="notification-item">Nessun avviso.</div>';}
document.addEventListener("DOMContentLoaded",pmRenderSiteMenu);document.addEventListener("i18n:changed",pmRenderSiteMenu);
