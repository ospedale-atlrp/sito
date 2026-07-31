/* Gestionale personale: l'operazione sensibile avviene nella Edge Function Supabase. */
(function () {
  const extras = ['Board', 'Istruttore', 'Psicologo'];
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const allRoles = () => typeof PM_ROLES !== 'undefined' ? PM_ROLES : [];
  const editableRoles = () => { const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null; const roles = allRoles(); return user ? roles.slice(roles.indexOf(user.role) + 1) : []; };
  const roleOptions = (selected, includeSelected = true) => { const roles = editableRoles(); const visible = includeSelected && !roles.includes(selected) ? [selected].concat(roles) : roles; return '<option value="" disabled>Seleziona un ruolo</option>'+visible.map(role => '<option '+(role === selected ? 'selected' : '')+'>'+esc(role)+'</option>').join(''); };
  const extraOptions = selected => '<div class="extra-role-pills">'+extras.map(extra => '<label class="extra-role-pill"><input type="checkbox" value="'+extra+'" '+(selected.includes(extra) ? 'checked' : '')+'><span>'+extra+'</span></label>').join('')+'</div>';
  function isManager() { const u = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null; return u && ['Dirigente','Chirurgo Primario','Admin'].includes(u.role); }
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
  function readExtras(box) { return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value); }
  async function renderDirectory() {
    const table = document.getElementById('accounts-tbody-modal');
    if (!table || !window.PM_DB) return;
    const { data, error } = await PM_DB.from('staff_directory').select('username, display_name, role, extra_roles, active');
    if (error) { table.innerHTML = '<tr><td colspan="6">Impossibile caricare l\u2019organico.</td></tr>'; return; }
    const roleIndex = role => { const index = allRoles().indexOf(role); return index === -1 ? 999 : index; };
    const ordered = (data || []).slice().sort((a, b) => roleIndex(a.role) - roleIndex(b.role) || a.display_name.localeCompare(b.display_name, 'it'));
    table.innerHTML = ordered.map(person => {
      const selectedExtras = person.extra_roles || [];
      const locked = selectedExtras.includes('Board');
      const editable = editableRoles().includes(person.role);
      return '<tr data-username="'+esc(person.username)+'"><td><input class="staff-text-input js-username" value="'+esc(person.username)+'"></td><td><input class="staff-text-input js-name" value="'+esc(person.display_name)+'"></td><td>'+ (editable ? '<select class="staff-role-select js-role">'+roleOptions(person.role)+'</select>' : '<span class="staff-role-label">'+esc(person.role)+'</span>') +'</td><td><div class="js-extras">'+extraOptions(selectedExtras)+'</div></td><td>'+ (person.active ? '<span class="staff-status is-active">Attivo</span>' : '<span class="staff-status">Disattivato</span>') +'</td><td><div class="staff-action-buttons"><button class="btn btn-sm btn-primary js-details">Aggiorna dati</button> '+(locked ? '<span class="staff-board-lock">Board protetto</span>' : '<button class="btn btn-sm btn-danger js-fire">Licenzia</button>')+'</div></td></tr>';
    }).join('') || '<tr><td colspan="6">Nessun dipendente trovato.</td></tr>';
    if (isManager()) bindRows(table); else table.querySelectorAll('select,input,button').forEach(el => el.disabled = true);
  }
  function bindRows(table) {
    table.querySelectorAll('tr[data-username]').forEach(row => {
      const username = row.dataset.username;
      row.querySelector('.js-details').onclick = async () => {
        const roleSelect = row.querySelector('.js-role');
        const payload = {
          username,
          newUsername: row.querySelector('.js-username').value.trim(),
          displayName: row.querySelector('.js-name').value.trim(),
          extraRoles: readExtras(row.querySelector('.js-extras')),
        };
        if (roleSelect) payload.role = roleSelect.value;
        try { await invoke('update-details', payload); await renderDirectory(); pmToast('Dati aggiornati.', 'success'); } catch (e) { pmToast(e.message || 'Errore nell\u2019aggiornamento dati.', 'error'); }
      };
      const fire = row.querySelector('.js-fire'); if (fire) fire.onclick = async () => {
        if (!(await pmConfirm('Licenziare ' + username + '? Il suo account rester\u00e0 attivo ma torner\u00e0 automaticamente "Cittadino" (paziente).'))) return;
        try { await invoke('fire', { username }); await renderDirectory(); pmToast(username + ' licenziato: ora \u00e8 un Cittadino.', 'success'); }
        catch (e) { pmToast(e.message || 'Errore.', 'error'); }
      };
    });
  }
  window.pmRenderStaffDirectory = renderDirectory;
  document.addEventListener('DOMContentLoaded', renderDirectory);
})();
