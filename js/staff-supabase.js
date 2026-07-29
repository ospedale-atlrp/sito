/* Direzione pubblica: usa l'organico condiviso. Le foto sono assegnate per
   "slot" (Dirigente, Primario1, Primario2, Primario3, ...) in base all'ordine
   di anzianità (chi è diventato Primario prima occupa lo slot più basso),
   non per username fisso: così se cambiano i nomi o si aggiunge un terzo
   Primario, basta rinominare/aggiungere il file foto corrispondente in img/
   senza toccare il codice. */
(function () {
  function initials(name, username) { return String(name || username || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
  function card(person, roleLabel, photoSlot) {
    const photo = photoSlot + '.png';
    return '<div class="leader-card"><span class="leader-role">'+roleLabel+'</span><div class="leader-avatar"><img src="../img/'+encodeURIComponent(photo)+'" alt="'+person.display_name+'" onerror="this.parentElement.classList.add(\'no-photo\');this.remove();"><span class="leader-avatar-fallback">'+initials(person.display_name, person.username)+'</span></div><span class="leader-name">'+person.display_name+'</span><span class="leader-nick">'+person.username+'</span></div>';
  }
  async function render() {
    if (!window.PM_DB) return;
    const { data } = await PM_DB.from('staff_directory').select('username, display_name, role, created_at').eq('active', true).in('role', ['Dirigente', 'Chirurgo Primario']).order('created_at', { ascending: true });
    const list = data || [];
    const dirigenti = list.filter(x => x.role === 'Dirigente');
    const primari = list.filter(x => x.role === 'Chirurgo Primario');
    const director = document.getElementById('tier-dirigente'), primary = document.getElementById('tier-primario');
    if (director) director.innerHTML = dirigenti.map(x => card(x, 'Dirigente', 'Dirigente')).join('') || '<p class="form-note">Nessun Dirigente al momento.</p>';
    if (primary) primary.innerHTML = primari.map((x, i) => card(x, 'Chirurgo Primario', 'Primario' + (i + 1))).join('') || '<p class="form-note">Nessun Chirurgo Primario al momento.</p>';
  }
  document.addEventListener('DOMContentLoaded', render);
})();