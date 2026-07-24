/* Prenotazioni condivise su Supabase, create dal personale nel gestionale. */
const PM_RESERVATION_LABELS = { cambio_sesso: 'Cambio Sesso', certificato_medico: 'Certificato Medico' };
const PM_RECIPIENTS = {
  certificato_medico: ['Medico di Base', 'Medico di Laboratorio', 'Medico Responsabile Ambulatorio', 'Chirurgo Specializzando', 'Chirurgo Strutturato', 'Chirurgo Vice Primario', 'Chirurgo Primario', 'Dirigente'],
  cambio_sesso: ['Chirurgo Specializzando', 'Chirurgo Strutturato', 'Chirurgo Vice Primario', 'Chirurgo Primario', 'Dirigente']
};
function pmCanRegister(user) { return !!user && !!window.PM_DB; }
function pmShowReservationMessage(ids, text, ok) { const el=document.getElementById(ok?ids.success:ids.error); if(el){el.textContent=text;el.classList.add('show');} }
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
  pmRenderMyReservations('my-reservations-list'); pmRenderReceivedReservations();
}
async function pmTakeReservation(id) {
  const user=pmCurrentUser(); if(!user) return;
  const {error}=await PM_DB.from('reservations').update({status:'presa_in_carico',assigned_staff_id:user.id,assigned_staff_name:user.name||user.username}).eq('id',id);
  if(error) alert(error.message); pmRenderReceivedReservations();
}
async function pmCloseReservation(id) {
  const response=prompt('Risposta per il paziente (verrà usata anche dal bot Telegram quando sarà collegato):','');
  if(response===null) return;
  const {error}=await PM_DB.from('reservations').update({status:'chiusa',staff_response:response,closed_at:new Date().toISOString()}).eq('id',id);
  if(error) alert(error.message); pmRenderReceivedReservations();
}
function pmReservationRow(r,user) {
  const assigned=r.assigned_staff_id===user.id;
  const patient=`${r.nome} ${r.cognome} (${r.codice_fiscale||'—'})`;
  let action='';
  if(r.status==='inviata') action=`<button class="btn btn-sm btn-primary js-take" data-id="${r.id}">Prendi in carico</button>`;
  if(r.status==='presa_in_carico' && assigned) action=`<button class="btn btn-sm btn-primary js-close" data-id="${r.id}">Chiudi prenotazione</button>`;
  return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag ${r.type==='cambio_sesso'?'tag-sesso':''}">${PM_RESERVATION_LABELS[r.type]}</span><br><b>${patient}</b><br>Telegram: @${r.telegram_username||'non indicato'}<br>Stato: ${r.status.replaceAll('_',' ')}</div>${action}</div>`;
}
async function pmRenderReceivedReservations(panelId,listId,countersId) {
  panelId=panelId||'received-reservations-panel'; listId=listId||'received-reservations-list'; const list=document.getElementById(listId), user=pmCurrentUser(); if(!list||!user)return;
  const rows=(await pmReservationsForUser(user)).filter(r=>r.target_roles.includes(user.role)&&['inviata','presa_in_carico'].includes(r.status));
  const panel=document.getElementById(panelId); if(panel)panel.style.display='block';
  list.innerHTML=rows.length?rows.map(r=>pmReservationRow(r,user)).join(''):'<div class="reservations-empty">Nessuna prenotazione in attesa.</div>';
  list.querySelectorAll('.js-take').forEach(b=>b.addEventListener('click',()=>pmTakeReservation(b.dataset.id)));
  list.querySelectorAll('.js-close').forEach(b=>b.addEventListener('click',()=>pmCloseReservation(b.dataset.id)));
}
async function pmRenderMyReservations(containerId) {
  const el=document.getElementById(containerId),user=pmCurrentUser(); if(!el||!user)return;
  const rows=(await pmReservationsForUser(user)).filter(r=>r.citizen_id===user.id);
  el.innerHTML=rows.length?rows.map(r=>`<div class="reservation-row"><div class="res-info"><b>${PM_RESERVATION_LABELS[r.type]}</b><br>${r.nome} ${r.cognome} — ${r.status.replaceAll('_',' ')}</div></div>`).join(''):'<div class="reservations-empty">Non hai ancora creato prenotazioni.</div>';
}
function pmRenderReservationCounters(){}
function pmRenderApprovedCounters(){}
function pmCountUserReservations(){return {cambio_sesso:0,certificato_medico:0};}
document.addEventListener('DOMContentLoaded',()=>{pmRenderReceivedReservations();pmRenderMyReservations('my-reservations-list');});
