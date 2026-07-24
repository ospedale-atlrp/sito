/* Gestionale personale: l'operazione sensibile avviene nella Edge Function Supabase. */
(function () {
  const extras = ['Board', 'Istruttore', 'Psicologo'];
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const allRoles = () => typeof PM_ROLES !== 'undefined' ? PM_ROLES : [];
  const editableRoles = () => { const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null; const roles = allRoles(); return user ? roles.slice(roles.indexOf(user.role) + 1) : []; };
  const roleOptions = (selected, includeSelected = true) => { const roles = editableRoles(); const visible = includeSelected && !roles.includes(selected) ? [selected].concat(roles) : roles; return '<option value="" disabled>Seleziona un ruolo</option>'+visible.map(role => '<option '+(role === selected ? 'selected' : '')+'>'+esc(role)+'</option>').join(''); };
  const extraOptions = selected => '<div class="extra-role-pills">'+extras.map(extra => '<label class="extra-role-pill"><input type="checkbox" value="'+extra+'" '+(selected.includes(extra) ? 'checked' : '')+'><span>'+extra+'</span></label>').join('')+'</div>';
  function isManager() { const u = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null; return u && ['Dirigente','Chirurgo Primario'].includes(u.role); }
  async function invoke(action, payload) {
    const { data, error } = await PM_DB.functions.invoke('manage-staff', { body: { action, ...payload } });
    if (error) throw new Error(error.message || 'La funzione Supabase non risponde. Verifica che manage-staff sia pubblicata.');
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  function readExtras(box) { return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value); }
  async function renderDirectory() {
    const table = document.getElementById('accounts-tbody-modal');
    if (!table || !window.PM_DB) return;
    const { data, error } = await PM_DB.from('staff_directory').select('username, display_name, role, extra_roles, active');
    if (error) { table.innerHTML = '<tr><td colspan="6">Impossibile caricare l’organico.</td></tr>'; return; }
    const roleIndex = role => { const index = allRoles().indexOf(role); return index === -1 ? 999 : index; };
    const ordered = (data || []).slice().sort((a, b) => roleIndex(a.role) - roleIndex(b.role) || a.display_name.localeCompare(b.display_name, 'it'));
    table.innerHTML = ordered.map(person => {
      const selectedExtras = person.extra_roles || [];
      const locked = selectedExtras.includes('Board');
      const editable = editableRoles().includes(person.role);
      return '<tr data-username="'+esc(person.username)+'"><td><input class="staff-text-input js-username" value="'+esc(person.username)+'"></td><td><input class="staff-text-input js-name" value="'+esc(person.display_name)+'"></td><td>'+ (editable ? '<select class="staff-role-select js-role">'+roleOptions(person.role)+'</select>' : '<span class="staff-role-label">'+esc(person.role)+'</span>') +'</td><td><div class="js-extras">'+extraOptions(selectedExtras)+'</div></td><td>'+ (person.active ? '<span class="staff-status is-active">Attivo</span>' : '<span class="staff-status">Disattivato</span>') +'</td><td><div class="staff-action-buttons"><button class="btn btn-sm btn-outline js-details">Aggiorna dati</button> '+ (editable ? '<button class="btn btn-sm btn-primary js-save">Aggiorna ruolo</button> ' : '') +'<button class="btn btn-sm btn-outline js-reset">Reset password 1234</button> '+(locked ? '<span class="staff-board-lock">Board protetto</span>' : '<button class="btn btn-sm btn-outline js-active">'+(person.active ? 'Disattiva' : 'Riattiva')+'</button> <button class="btn btn-sm btn-danger js-delete">Elimina</button>')+'</div></td></tr>';
    }).join('') || '<tr><td colspan="6">Nessun dipendente trovato.</td></tr>';
    if (isManager()) bindRows(table); else table.querySelectorAll('select,input,button').forEach(el => el.disabled = true);
  }
  function bindRows(table) {
    table.querySelectorAll('tr[data-username]').forEach(row => {
      const username = row.dataset.username;
      row.querySelector('.js-details').onclick = async () => { try { await invoke('update-details', { username, newUsername: row.querySelector('.js-username').value.trim(), displayName: row.querySelector('.js-name').value.trim() }); await renderDirectory(); } catch (e) { alert(e.message || 'Errore nell’aggiornamento dati.'); } };
      const save = row.querySelector('.js-save'); if (save) save.onclick = async () => { try { await invoke('set-role', { username, role: row.querySelector('.js-role').value, extraRoles: readExtras(row.querySelector('.js-extras')) }); await renderDirectory(); } catch (e) { alert(e.message || 'Errore nel salvataggio.'); } };
      row.querySelector('.js-reset').onclick = async () => { if (!confirm('Reimpostare la password a 1234?')) return; try { await invoke('reset-password', { username, password: '1234' }); alert('Password reimpostata: al prossimo accesso dovrà essere cambiata.'); } catch (e) { alert(e.message || 'Errore.'); } };
      const active = row.querySelector('.js-active'); if (active) active.onclick = async () => { try { await invoke('set-active', { username, active: active.textContent === 'Riattiva' }); await renderDirectory(); } catch (e) { alert(e.message || 'Errore.'); } };
      const del = row.querySelector('.js-delete'); if (del) del.onclick = async () => { if (!confirm('Eliminare '+username+'?')) return; try { await invoke('delete', { username }); await renderDirectory(); } catch (e) { alert(e.message || 'Errore.'); } };
    });
    let box = document.getElementById('new-staff-account');
    if (!box) { box = document.createElement('form'); box.id = 'new-staff-account'; box.className = 'new-bando-form staff-create-form'; const defaults = editableRoles(); box.innerHTML = '<h3>Aggiungi dipendente</h3><div class="field"><label>Username</label><input name="username" required placeholder="es. Mario_Rossi"></div><div class="field"><label>Nome e cognome</label><input name="displayName" required></div><div class="field"><label>Ruolo</label><select class="staff-role-select" name="role"><option value="" disabled selected>Seleziona un ruolo</option>'+defaults.map(role => '<option>'+esc(role)+'</option>').join('')+'</select></div><div class="field js-new-extras"><label>Ruoli extra</label>'+extraOptions([])+'</div><button class="btn btn-primary btn-sm">Crea account con password 1234</button>'; table.closest('.panel-card').appendChild(box); box.onsubmit = async event => { event.preventDefault(); try { await invoke('create', { username: box.username.value, displayName: box.displayName.value, role: box.role.value, extraRoles: readExtras(box.querySelector('.js-new-extras')), password: '1234' }); box.reset(); await renderDirectory(); alert('Account creato. Password temporanea: 1234'); } catch (e) { alert(e.message || 'Errore nella creazione.'); } }; }
  }
  window.pmRenderStaffDirectory = renderDirectory;
  document.addEventListener('DOMContentLoaded', renderDirectory);
})();
