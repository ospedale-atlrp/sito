/* Prenotazioni condivise su Supabase, create dal personale nel gestionale. */
const PM_RESERVATION_LABELS = { cambio_sesso: 'Cambio Sesso', certificato_medico: 'Certificato Medico' };
const PM_RECIPIENTS = {
  certificato_medico: ['Medico di Base', 'Medico di Laboratorio', 'Medico Responsabile Ambulatorio', 'Chirurgo Specializzando', 'Chirurgo Strutturato', 'Chirurgo Vice Primario', 'Chirurgo Primario', 'Dirigente'],
  cambio_sesso: ['Chirurgo Specializzando', 'Chirurgo Strutturato', 'Chirurgo Vice Primario', 'Chirurgo Primario', 'Dirigente']
};
function pmCanRegister(user) { return !!user && !!window.PM_DB; }
function pmIsReservationRecipient(user) { return !!user && (PM_RECIPIENTS.certificato_medico.includes(user.role) || PM_RECIPIENTS.cambio_sesso.includes(user.role)); }
/* Solo da Infermiere Assistente in su (nell'ordine gerarchico di PM_ROLES,
   dove l'indice 0 è il grado più alto) si può compilare una richiesta;
   Paramedici e Specializzandi possono solo consultare. */
function pmCanCompileReservation(user) {
  if (!user || typeof PM_ROLES === 'undefined') return false;
  const idx = PM_ROLES.indexOf(user.role);
  const cutoff = PM_ROLES.indexOf('Infermiere Assistente');
  return idx !== -1 && cutoff !== -1 && idx <= cutoff;
}

function pmShowReservationMessage(ids, text, ok) { const el=document.getElementById(ok?ids.success:ids.error); if(el){el.textContent=text;el.classList.add('show');} }
/* Crea un avviso nella tabella "notifications": per uno o più ruoli
   (targetRoles, una riga per ruolo) oppure per un singolo utente (targetUserId). */
async function pmCreateNotification(opts) {
  if (!window.PM_DB) return;
  try {
    if (opts.targetRoles && opts.targetRoles.length) {
      const rows = opts.targetRoles.map((role) => ({ target_role: role, title: opts.title, body: opts.body }));
      await PM_DB.from('notifications').insert(rows);
      return;
    }
    if (opts.targetUserId) { await PM_DB.from('notifications').insert({ target_user_id: opts.targetUserId, title: opts.title, body: opts.body }); return; }
    if (opts.targetRole) { await PM_DB.from('notifications').insert({ target_role: opts.targetRole, title: opts.title, body: opts.body }); }
  } catch (_) { /* un avviso mancato non deve bloccare l'azione principale */ }
}
async function pmReservationsForUser(user) {
  if (!window.PM_DB || !user) return [];
  const {data,error}=await PM_DB.from('reservations').select('*').order('created_at',{ascending:false});
  return error ? [] : (data||[]);
}
async function pmHandleReservationSubmit(e,type,recipientRoles,successMsg,ids) {
  e.preventDefault(); const user=pmCurrentUser(), form=e.target; ids=ids||{error:'reservation-error',success:'reservation-success'};
  if(!pmCanRegister(user)) return pmShowReservationMessage(ids,'Accesso al database non disponibile.',false);
  const nome=form.nome.value.trim(), cognome=form.cognome.value.trim(), cf=form.cf.value.trim(), telegram=form.telegram.value.trim(), sesso=form.sesso.value;
  if(!nome||!cognome||!cf||!telegram||!sesso) return pmShowReservationMessage(ids,'Compila tutti i campi.',false);
  const {error}=await PM_DB.from('reservations').insert({
    citizen_id:user.id, citizen_username:user.username, type, nome, cognome, codice_fiscale:cf,
    sesso, telegram_username:telegram.replace(/^@/,'').trim(), target_roles:recipientRoles||PM_RECIPIENTS[type], status:'inviata'
  });
  if(error) return pmShowReservationMessage(ids,error.message,false);
  pmShowReservationMessage(ids,successMsg+' La richiesta è stata inviata al personale competente.',true); form.reset();
  if (typeof pmCreateNotification === 'function') {
    pmCreateNotification({
      targetRoles: recipientRoles || PM_RECIPIENTS[type],
      title: 'Nuova prenotazione',
      body: (user.name || user.username) + ' ha inviato una richiesta di ' + PM_RESERVATION_LABELS[type] + '.',
    });
  }
  pmRenderReceivedReservations('received-reservations-list');
}
async function pmTakeReservation(id) {
  const user=pmCurrentUser(); if(!user) return;
  const { data, error } = await PM_DB.functions.invoke('take-reservation', { body: { reservationId: id } });
  let serverMessage = null;
  if (error && error.context && typeof error.context.json === 'function') {
    try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
  }
  if (error || !data || data.error) {
    pmToast(serverMessage || (data && data.error) || 'Errore nella presa in carico.', 'error');
    return;
  }
  pmToast(data.telegramSent ? 'Prenotazione presa in carico. Paziente avvisato su Telegram.' : 'Prenotazione presa in carico. (Il paziente non ha ancora avviato il bot: avvisato solo sul sito.)', 'success');
}
async function pmCloseReservation(id) {
  const ok = await pmConfirm('Chiudere questa pratica? Non sarà più possibile scrivere nella chat.');
  if (!ok) return;
  const {error}=await PM_DB.from('reservations').update({status:'chiusa',closed_at:new Date().toISOString()}).eq('id',id);
  if(error) pmToast(error.message,'error');
  else pmToast('Pratica chiusa.','success');
}
function pmReservationRow(r,user) {
  const assigned=r.assigned_staff_id===user.id;
  const patient=`${r.nome} ${r.cognome} (${r.codice_fiscale||'—'})`;
  let action='';
  if(r.status==='inviata') action=`<button class="btn btn-sm btn-primary js-take" data-id="${r.id}">Prendi in carico</button>`;
  if(r.status==='presa_in_carico' && assigned) action=`<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}">Apri</button> <button class="btn btn-sm btn-danger js-close" data-id="${r.id}">Chiudi</button>`;
  return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag ${r.type==='cambio_sesso'?'tag-sesso':''}">${PM_RESERVATION_LABELS[r.type]}</span><br><b>${patient}</b><br>Telegram: @${r.telegram_username||'non indicato'}<br>Stato: ${r.status.replaceAll('_',' ')}</div>${action}</div>`;
}
async function pmRenderReceivedReservations(listId) {
  listId = listId || 'received-reservations-list';
  const list=document.getElementById(listId), user=pmCurrentUser(); if(!list||!user)return;
  if (!pmIsReservationRecipient(user)) { list.innerHTML=''; return; }
  const rows=(await pmReservationsForUser(user)).filter(r=>r.target_roles.includes(user.role)&&['inviata','presa_in_carico'].includes(r.status));
  list.innerHTML=rows.length?rows.map(r=>pmReservationRow(r,user)).join(''):'<div class="reservations-empty">Nessuna prenotazione in attesa.</div>';
  list.querySelectorAll('.js-take').forEach(b=>b.addEventListener('click',()=>{pmTakeReservation(b.dataset.id).then(()=>pmRenderReceivedReservations(listId));}));
  list.querySelectorAll('.js-close').forEach(b=>b.addEventListener('click',()=>{pmCloseReservation(b.dataset.id).then(()=>pmRenderReceivedReservations(listId));}));
  list.querySelectorAll('.js-open-chat').forEach(b=>b.addEventListener('click',()=>{ if (typeof pmOpenReservationChat === 'function') pmOpenReservationChat(b.dataset.id); }));
}
async function pmRenderMyReservations(containerId) {
  const el=document.getElementById(containerId),user=pmCurrentUser(); if(!el||!user)return;
  const rows=(await pmReservationsForUser(user)).filter(r=>r.citizen_id===user.id);
  el.innerHTML=rows.length?rows.map(r=>`<div class="reservation-row"><div class="res-info"><b>${PM_RESERVATION_LABELS[r.type]}</b><br>${r.nome} ${r.cognome} — ${r.status.replaceAll('_',' ')}</div></div>`).join(''):'<div class="reservations-empty">Non hai ancora creato prenotazioni.</div>';
}
function pmCapabilitiesSummary(user) {
  const sentences = [];
  if (typeof PM_ADMIN_ROLES !== 'undefined' && PM_ADMIN_ROLES.includes(user.role)) {
    sentences.push('Puoi creare, modificare, disattivare ed eliminare gli account del personale');
    sentences.push(user.role === 'Dirigente' ? 'puoi assegnare qualsiasi ruolo, compreso Chirurgo Primario' : 'puoi assegnare ruoli da Chirurgo Vice Primario in giù');
  }
  if (pmCanCompileReservation(user)) {
    sentences.push('puoi compilare richieste di Certificato Medico e Cambio Sesso nel modulo ospedale');
  } else {
    sentences.push('non puoi compilare richieste del modulo ospedale, riservato al personale da Infermiere Assistente in su');
  }
  if (pmIsReservationRecipient(user)) {
    const certOnly = PM_RECIPIENTS.certificato_medico.includes(user.role) && !PM_RECIPIENTS.cambio_sesso.includes(user.role);
    sentences.push(certOnly ? 'ricevi e gestisci le richieste di Certificato Medico indirizzate al tuo ruolo' : 'ricevi e gestisci le richieste di Certificato Medico e Cambio Sesso indirizzate al tuo ruolo');
  }
  return sentences.join(', ') + '.';
}
function pmRenderReservationCounters(){}
function pmRenderApprovedCounters(){}
function pmCountUserReservations(){return {cambio_sesso:0,certificato_medico:0};}
