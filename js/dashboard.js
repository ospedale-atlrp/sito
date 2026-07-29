let CURRENT_USER = null;

document.addEventListener("DOMContentLoaded", async () => {
  const token = Auth.getToken();
  if (!token) return goToLogin();

  try {
    const { user } = await apiFetch("/api/auth/me", { auth: true });
    if (user.mustChangePassword) return goToLogin();
    CURRENT_USER = user;
    Auth.setUser(user);
  } catch {
    return goToLogin();
  }

  document.getElementById("btn-logout").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "login.html";
  });

  setupTabs();
  renderHeader();
  document.addEventListener("i18n:changed", renderHeader);

  populateGradeSelect();
  document.addEventListener("i18n:changed", populateGradeSelect);

  if (CURRENT_USER.isDirezione) {
    document.getElementById("admin-create-panel").style.display = "block";
    document.getElementById("th-actions").style.display = "";
    document.getElementById("create-form").addEventListener("submit", handleCreateUser);
    loadAdminRoster();
  } else {
    document.getElementById("staff-readonly-note").style.display = "block";
    loadStaffRoster();
  }
  document.addEventListener("i18n:changed", () => {
    CURRENT_USER.isDirezione ? loadAdminRoster() : loadStaffRoster();
  });

  document.getElementById("profile-username").textContent = CURRENT_USER.username;
  const updateProfileRole = () => { document.getElementById("profile-role").textContent = gradeLabel(CURRENT_USER.grade); };
  updateProfileRole();
  document.addEventListener("i18n:changed", updateProfileRole);
});

function goToLogin() {
  window.location.href = "login.html";
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

function renderHeader() {
  const u = CURRENT_USER;
  document.getElementById("dash-avatar").textContent = u.nickname.slice(0, 2).toUpperCase();
  document.getElementById("dash-name").textContent = `${I18N.t("dashboard.welcome")}, ${u.nickname}`;
  document.getElementById("dash-username").textContent = u.username;
  const pill = document.getElementById("dash-role-pill");
  pill.textContent = `${gradeLabel(u.grade)} · ${u.isDirezione ? I18N.t("dashboard.direzione.badge") : I18N.t("dashboard.staff.badge")}`;
  pill.className = "role-pill " + (u.isDirezione ? "direzione" : "staff");
}

function populateGradeSelect() {
  const select = document.getElementById("create-grade-select");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = HIERARCHY.map((g) => `<option value="${g.key}">${gradeLabel(g.key)}</option>`).join("");
  if (previous) select.value = previous;
}

// ---------------- Direzione: pannello amministrativo ----------------

async function loadAdminRoster() {
  const tbody = document.getElementById("roster-tbody");
  try {
    const { users } = await apiFetch("/api/users", { auth: true });
    tbody.innerHTML = users.map((u) => renderAdminRow(u)).join("");
    wireAdminRowActions();
  } catch {
    tbody.innerHTML = `<tr><td colspan="4">${I18N.t("common.error")}</td></tr>`;
  }
}

function renderAdminRow(u) {
  const isDirettore = CURRENT_USER.grade === "dirigente";
  const gradeOptions = HIERARCHY.map((g) => `<option value="${g.key}" ${g.key === u.grade ? "selected" : ""}>${gradeLabel(g.key)}</option>`).join("");
  const gradeCell = isDirettore
    ? `<select class="grade-select js-grade-select" ${u.id === CURRENT_USER.id ? "disabled" : ""}>${gradeOptions}</select>`
    : gradeLabel(u.grade);
  return `
    <tr data-user-id="${u.id}" data-nickname="${escapeAttr(u.nickname)}">
      <td class="u-name">${escapeAttr(u.username)}</td>
      <td>${gradeCell}</td>
      <td>
        <span class="status-dot ${u.active ? "" : "inactive"}">${u.active ? I18N.t("admin.status.active") : I18N.t("admin.status.inactive")}</span>
      </td>
      <td>
        <div class="row-actions">
          ${isDirettore ? `<button class="btn btn-sm btn-outline js-promote">${I18N.t("admin.action.promote")}</button>` : ""}
          <button class="btn btn-sm btn-outline js-reset">${I18N.t("admin.action.resetPassword")}</button>
          ${u.id !== CURRENT_USER.id ? `
            <button class="btn btn-sm btn-outline js-toggle-active">${u.active ? I18N.t("admin.action.deactivate") : I18N.t("admin.action.activate")}</button>
            <button class="btn btn-sm btn-danger js-remove">${I18N.t("admin.action.remove")}</button>
          ` : ""}
        </div>
      </td>
    </tr>`;
}

function wireAdminRowActions() {
  document.querySelectorAll("#roster-tbody tr").forEach((row) => {
    const userId = row.dataset.userId;
    const nickname = row.dataset.nickname;

    const promoteBtn = row.querySelector(".js-promote");
    if (promoteBtn) promoteBtn.addEventListener("click", async () => {
      const select = row.querySelector(".js-grade-select");
      const newGrade = select.value;
      if (!confirm(I18N.t("admin.confirm.grade", { nickname }))) return;
      try {
        const { user, usernameChanged } = await apiFetch(`/api/users/${userId}/grade`, {
          method: "PATCH", body: { grade: newGrade }, auth: true,
        });
        if (usernameChanged) alert(I18N.t("admin.usernameChanged", { nickname, username: user.username }));
        loadAdminRoster();
      } catch {
        alert(I18N.t("common.error"));
      }
    });

    const resetBtn = row.querySelector(".js-reset");
    if (resetBtn) resetBtn.addEventListener("click", async () => {
      if (!confirm(I18N.t("admin.confirm.resetPassword", { nickname }))) return;
      try {
        const { tempPassword } = await apiFetch(`/api/users/${userId}/reset-password`, { method: "POST", auth: true });
        alert(I18N.t("admin.resetPassword.result", { nickname, password: tempPassword }));
      } catch {
        alert(I18N.t("common.error"));
      }
    });

    const toggleBtn = row.querySelector(".js-toggle-active");
    if (toggleBtn) toggleBtn.addEventListener("click", async () => {
      const isActive = row.querySelector(".status-dot").textContent.trim() === I18N.t("admin.status.active");
      try {
        await apiFetch(`/api/users/${userId}/active`, { method: "PATCH", body: { active: !isActive }, auth: true });
        loadAdminRoster();
      } catch {
        alert(I18N.t("common.error"));
      }
    });

    const removeBtn = row.querySelector(".js-remove");
    if (removeBtn) removeBtn.addEventListener("click", async () => {
      if (!confirm(I18N.t("admin.confirm.remove", { nickname }))) return;
      try {
        await apiFetch(`/api/users/${userId}`, { method: "DELETE", auth: true });
        loadAdminRoster();
      } catch {
        alert(I18N.t("common.error"));
      }
    });
  });
}

async function handleCreateUser(e) {
  e.preventDefault();
  const errorEl = document.getElementById("create-error");
  const successEl = document.getElementById("create-success");
  errorEl.classList.remove("show");
  successEl.classList.remove("show");

  const form = e.target;
  const nickname = form.nickname.value.trim();
  const grade = form.grade.value;

  try {
    const { user, tempPassword } = await apiFetch("/api/users", { method: "POST", body: { nickname, grade }, auth: true });
    successEl.textContent = I18N.t("admin.newUser.success", { username: user.username, password: tempPassword });
    successEl.classList.add("show");
    form.reset();
    loadAdminRoster();
  } catch (err) {
    errorEl.textContent = err.message || I18N.t("common.error");
    errorEl.classList.add("show");
  }
}

// ---------------- Personale: elenco in sola lettura ----------------

async function loadStaffRoster() {
  const tbody = document.getElementById("roster-tbody");
  try {
    const { users } = await apiFetch("/api/users/roster", { auth: true });
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td class="u-name">${escapeAttr(u.username)}</td>
        <td>${gradeLabel(u.grade)}${u.isDirezione ? ` <span class="role-pill direzione" style="margin-left:6px;">${I18N.t("dashboard.direzione.badge")}</span>` : ""}</td>
        <td><span class="status-dot">${I18N.t("admin.status.active")}</span></td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = `<tr><td colspan="3">${I18N.t("common.error")}</td></tr>`;
  }
}

function escapeAttr(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
