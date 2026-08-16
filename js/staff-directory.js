/* Gestionale personale: l'operazione sensibile avviene nella Edge Function Supabase. */
(function () {
  function t(key, fallback, vars) {
    let s = null;
    if (typeof I18N !== 'undefined') { const v = I18N.t(key, vars); if (v && v !== key) s = v; }
    if (s === null) {
      s = fallback || key;
      if (vars) Object.keys(vars).forEach((k) => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    }
    return s;
  }
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const allRoles = () => typeof PM_ROLES !== 'undefined' ? PM_ROLES : [];
  // Stesso account riconosciuto come super-admin altrove (lì per Telegram ID,
  // qui per username perché staff_directory non ha il Telegram ID salvato:
  // è solo un'etichetta visiva, il controllo di sicurezza vero è sul server.
  const SUPER_ADMIN_USERNAMES = ['TheG0ldenPig'];
  const editableRoles = () => { const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null; const roles = allRoles(); if (user && user.isSuperAdmin) return roles; return user ? roles.slice(roles.indexOf(user.role) + 1) : []; };
  const roleOptions = (selected, includeSelected = true) => { const roles = editableRoles(); const visible = includeSelected && !roles.includes(selected) ? [selected].concat(roles) : roles; return '<option value="" disabled>' + t('dashboard.direction.select_role', 'Seleziona un ruolo') + '</option>'+visible.map(role => '<option '+(role === selected ? 'selected' : '')+'>'+esc(role)+'</option>').join(''); };
  function isManager() { const u = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null; return u && (u.isSuperAdmin || ['Dirigente','Chirurgo Primario','Admin'].includes(u.role)); }
  async function invoke(action, payload) {
    const { data, error } = await PM_DB.functions.invoke('manage-staff', { body: { action, ...payload } });
    if (error) {
      let message = error.message || 'La funzione Supabase non risponde. Verifica che manage-staff sia pubblicata.';
      if (error.context && typeof error.context.json === 'function') {
        try {
          const body = await error.context.json();
          if (body && body.error) message = body.error;
        } catch (_) { /* risposta non in JSON, resta il messaggio generico */ }
      }
      throw new Error(message);
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  async function renderDirectory() {
    const table = document.getElementById('accounts-tbody-modal');
    if (!table || !window.PM_DB) return;
    const { data, error } = await PM_DB.from('staff_directory').select('username, display_name, role, active');
    if (error) { table.innerHTML = '<tr><td colspan="5">' + t('dashboard.direction.load_error', "Impossibile caricare l\u2019organico.") + '</td></tr>'; return; }
    const roleIndex = role => { const index = allRoles().indexOf(role); return index === -1 ? 999 : index; };
    const ordered = (data || []).slice().sort((a, b) => roleIndex(a.role) - roleIndex(b.role) || a.display_name.localeCompare(b.display_name, 'it'));
    table.innerHTML = ordered.map(person => {
      const editable = editableRoles().includes(person.role);
      const badge = SUPER_ADMIN_USERNAMES.includes(person.username) ? ' <span class="staff-status is-active" style="margin-left:4px;">' + t('dashboard.direction.extra_admin_badge', 'Extra Admin') + '</span>' : '';
      return '<tr data-username="'+esc(person.username)+'"><td><input class="staff-text-input js-username" value="'+esc(person.username)+'"></td><td><input class="staff-text-input js-name" value="'+esc(person.display_name)+'"></td><td>'+ (editable ? '<select class="staff-role-select js-role">'+roleOptions(person.role)+'</select>' : '<span class="staff-role-label">'+esc(person.role)+'</span>') + badge +'</td><td>'+ (person.active ? '<span class="staff-status is-active">' + t('dashboard.direction.status_active', 'Attivo') + '</span>' : '<span class="staff-status">' + t('dashboard.direction.status_inactive', 'Disattivato') + '</span>') +'</td><td><div class="staff-action-buttons"><button class="btn btn-sm btn-primary js-details">' + t('dashboard.direction.btn_update', 'Aggiorna dati') + '</button> <button class="btn btn-sm btn-danger js-fire">' + t('dashboard.direction.btn_fire', 'Licenzia') + '</button></div></td></tr>';
    }).join('') || '<tr><td colspan="5">' + t('dashboard.direction.no_staff', 'Nessun dipendente trovato.') + '</td></tr>';
    if (typeof pmEnhanceSelects === 'function') pmEnhanceSelects(table);
    if (isManager()) bindRows(table); else table.querySelectorAll('select,input,button').forEach(el => el.disabled = true);
  }
  document.addEventListener('i18n:changed', () => { if (document.getElementById('accounts-tbody-modal')) renderDirectory(); });
  function bindRows(table) {
    table.querySelectorAll('tr[data-username]').forEach(row => {
      const username = row.dataset.username;
      row.querySelector('.js-details').onclick = async () => {
        const roleSelect = row.querySelector('.js-role');
        const payload = {
          username,
          newUsername: row.querySelector('.js-username').value.trim(),
          displayName: row.querySelector('.js-name').value.trim(),
        };
        if (roleSelect) payload.role = roleSelect.value;
        try { await invoke('update-details', payload); await renderDirectory(); pmToast(t('dashboard.direction.update_success', 'Dati aggiornati.'), 'success'); } catch (e) { pmToast(e.message || t('dashboard.direction.update_error', "Errore nell'aggiornamento dati."), 'error'); }
      };
      const fire = row.querySelector('.js-fire'); if (fire) fire.onclick = async () => {
        if (!(await pmConfirm(t('dashboard.direction.fire_confirm', 'Licenziare {username}? Il suo account resterà attivo ma tornerà automaticamente "Cittadino" (paziente).', { username })))) return;
        try { await invoke('fire', { username }); await renderDirectory(); pmToast(t('dashboard.direction.fire_success', '{username} licenziato: ora è un Cittadino.', { username }), 'success'); }
        catch (e) { pmToast(e.message || t('common.error_generic', 'Si è verificato un errore. Riprova.'), 'error'); }
      };
    });
  }
  window.pmRenderStaffDirectory = renderDirectory;
  document.addEventListener('DOMContentLoaded', renderDirectory);
})();
