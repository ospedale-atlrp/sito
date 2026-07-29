/**
 * Configurazione centrale del backend.
 * In sviluppo locale il backend gira su http://localhost:3000.
 * Quando pubblichi il sito tramite Tailscale, cambia questo valore con
 * l'indirizzo/hostname Tailscale della macchina che esegue "server/server.js"
 * (es. "http://nome-macchina.tailnet.ts.net:3000").
 */
const API_BASE = window.__API_BASE__ || "http://localhost:3000";

const Auth = {
  TOKEN_KEY: "pnm_token",
  USER_KEY: "pnm_user",

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  setToken(t) { localStorage.setItem(this.TOKEN_KEY, t); },
  clear() { localStorage.removeItem(this.TOKEN_KEY); localStorage.removeItem(this.USER_KEY); },

  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) || "null"); }
    catch { return null; }
  },
  setUser(u) { localStorage.setItem(this.USER_KEY, JSON.stringify(u)); },
};

async function apiFetch(path, { method = "GET", body, auth = false, isForm = false, extraHeaders = {} } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  Object.assign(headers, extraHeaders);
  if (auth) {
    const token = Auth.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("network");
    err.isNetwork = true;
    throw err;
  }

  let data = {};
  try { data = await res.json(); } catch { /* risposta vuota */ }

  if (!res.ok) {
    const err = new Error(data.error || "Errore");
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}
