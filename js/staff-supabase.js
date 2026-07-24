/* Direzione pubblica: usa l'organico condiviso e mantiene le foto esistenti. */
(function () {
  const photos = { SadObama_: 'SadObama_.png', lionelMMU: 'Alexis Dialo.png', Lunaticooh: 'Luke Skywalker.png' };
  function initials(name, username) { return String(name || username || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
  function card(person, role) {
    const photo = photos[person.username] || person.username + '.png';
    return '<div class="leader-card"><span class="leader-role">'+role+'</span><div class="leader-avatar"><img src="../img/'+encodeURIComponent(photo)+'" alt="'+person.display_name+'" onerror="this.parentElement.classList.add(\'no-photo\');this.remove();"><span class="leader-avatar-fallback">'+initials(person.display_name, person.username)+'</span></div><span class="leader-name">'+person.display_name+'</span><span class="leader-nick">'+person.username+'</span></div>';
  }
  async function render() {
    if (!window.PM_DB) return;
    const { data } = await PM_DB.from('staff_directory').select('username, display_name, role').eq('active', true).in('role', ['Dirigente', 'Chirurgo Primario']);
    const list = data || [];
    const director = document.getElementById('tier-dirigente'), primary = document.getElementById('tier-primario');
    if (director) director.innerHTML = list.filter(x => x.role === 'Dirigente').map(x => card(x, 'Dirigente')).join('') || '<p class="form-note">Nessun Dirigente al momento.</p>';
    if (primary) primary.innerHTML = list.filter(x => x.role === 'Chirurgo Primario').map(x => card(x, 'Chirurgo Primario')).join('') || '<p class="form-note">Nessun Chirurgo Primario al momento.</p>';
  }
  document.addEventListener('DOMContentLoaded', render);
})();
