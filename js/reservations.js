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
  const nome=form.nome.value.trim(), cognome=form.cognome.value.trim(), cf=form.cf.value.trim(), sesso=form.sesso.value;
  // Il modulo dello staff ha un gruppo radio "modalita" (Prenotazione x
  // Pazienti / x Me Stesso); il modulo del paziente per sé non ce l'ha
  // (form.modalita è null in quel caso).
  const modalita = form.modalita ? form.modalita.value : null;
  const perPaziente = modalita === 'pazienti';
  // Solo in "x Pazienti" si usa la @ inserita a mano dallo staff; altrimenti
  // (form del paziente, oppure "x Me Stesso") si usa il Telegram già
  // collegato al proprio profilo.
  const telegram = (form.telegram && (perPaziente || modalita === null))
    ? form.telegram.value.trim().replace(/^@/,'').trim()
    : (user.telegramUsername || '');
  const agonistico = form.agonistico ? form.agonistico.value : '';
  if(!nome||!cognome||!cf||!sesso) return pmShowReservationMessage(ids,'Compila tutti i campi.',false);
  if(perPaziente && !telegram) return pmShowReservationMessage(ids,'Inserisci la @ Telegram del paziente.',false);
  if(type==='certificato_medico' && !agonistico) return pmShowReservationMessage(ids,'Seleziona se il certificato è agonistico.',false);
  const {data:inserted,error}=await PM_DB.from('reservations').insert({
    citizen_id:user.id, citizen_username:user.username, type, nome, cognome, codice_fiscale:cf,
    sesso, telegram_username:telegram, agonistico: type==='certificato_medico' ? agonistico : null,
    target_roles:recipientRoles||PM_RECIPIENTS[type], status:'inviata'
  }).select('id').single();
  if(error) return pmShowReservationMessage(ids,error.message,false);
  pmShowReservationMessage(ids,successMsg+' La richiesta è stata inviata al personale competente.',true); form.reset();
  if (typeof pmCreateNotification === 'function') {
    pmCreateNotification({
      targetRoles: recipientRoles || PM_RECIPIENTS[type],
      title: 'Nuova prenotazione',
      body: (user.name || user.username) + ' ha inviato una richiesta di ' + PM_RESERVATION_LABELS[type] + '.',
    });
  }
  // Prenotazione "x Pazienti": avvisa la @ indicata che la prenotazione è
  // stata inviata a suo nome (via bot Telegram, gestito lato server).
  if (perPaziente && telegram && inserted && inserted.id && window.PM_DB && PM_DB.functions) {
    PM_DB.functions.invoke('notify-new-reservation', { body: { reservationId: inserted.id } }).catch(function () {});
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
  const agonisticoInfo = r.type==='certificato_medico' ? `<br>Agonistico: <b>${r.agonistico==='si'?'Sì':'No'}</b>` : '';
  let action='';
  if(r.status==='inviata') action=`<button class="btn btn-sm btn-primary js-take" data-id="${r.id}">Prendi in carico</button>`;
  if(r.status==='presa_in_carico' && assigned) action=`<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}">Apri</button> <button class="btn btn-sm btn-danger js-close" data-id="${r.id}">Chiudi</button>`;
  return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag ${r.type==='cambio_sesso'?'tag-sesso':''}">${PM_RESERVATION_LABELS[r.type]}</span><br><b>${patient}</b>${agonisticoInfo}<br>Telegram: @${r.telegram_username||'non indicato'}<br>Stato: ${r.status.replaceAll('_',' ')}</div>${action}</div>`;
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
function pmMyReservationRow(r) {
  const statusLabel = { inviata: 'In attesa', presa_in_carico: 'Presa in carico', chiusa: 'Chiusa' }[r.status] || r.status.replaceAll('_',' ');
  let action = '';
  if (r.status === 'presa_in_carico') {
    action = `<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}">Apri chat</button>`;
  }
  const assignedInfo = r.assigned_staff_name ? `<br>Seguito da: ${r.assigned_staff_name}` : '';
  const agonisticoInfo = r.type==='certificato_medico' ? `<br>Agonistico: ${r.agonistico==='si'?'Sì':'No'}` : '';
  return `<div class="reservation-row"><div class="res-info"><b>${PM_RESERVATION_LABELS[r.type]}</b><br>${r.nome} ${r.cognome} — <b>${statusLabel}</b>${assignedInfo}${agonisticoInfo}</div>${action}</div>`;
}
async function pmRenderMyReservations(containerId) {
  const el=document.getElementById(containerId),user=pmCurrentUser(); if(!el||!user)return;
  const rows=(await pmReservationsForUser(user)).filter(r=>r.citizen_id===user.id);
  el.innerHTML=rows.length?rows.map(pmMyReservationRow).join(''):'<div class="reservations-empty">Non hai ancora creato prenotazioni.</div>';
  el.querySelectorAll('.js-open-chat').forEach(b=>b.addEventListener('click',()=>{ if (typeof pmOpenReservationChat === 'function') pmOpenReservationChat(b.dataset.id); }));
}
function pmRenderReservationCounters(){}
function pmRenderApprovedCounters(){}
function pmCountUserReservations(){return {cambio_sesso:0,certificato_medico:0};}

/* Inizializza la sezione dashboard dedicata ai pazienti (ruolo "Cittadino"):
   monta le schede, collega il form di nuova prenotazione e mostra l'elenco
   delle proprie prenotazioni. */
async function pmInitPatientDashboard(user) {
  const display = document.getElementById('patient-username-display');
  if (display) display.textContent = user.username;

  const bar = document.getElementById('patient-segment-bar');
  const panels = document.getElementById('patient-segment-panels');
  if (bar && panels && typeof pmMountSegments === 'function') {
    pmMountSegments(bar, panels, {
      onActivate: (id) => { if (id === 'mie') pmRenderMyReservations('my-reservations-list'); },
    });
  }

  const form = document.getElementById('patient-reservation-form');
  if (form && !form.dataset.wired) {
    form.dataset.wired = '1';

    const patientTipo = document.getElementById('patient-tipo');
    const agonField = document.getElementById('patient-agonistico-field');
    const agonSelect = document.getElementById('patient-agonistico');
    if (patientTipo && agonField && agonSelect) {
      patientTipo.addEventListener('change', () => {
        const isCertificato = patientTipo.value === 'certificato_medico';
        agonField.style.display = isCertificato ? '' : 'none';
        agonSelect.required = isCertificato;
        if (!isCertificato) agonSelect.value = '';
      });
    }

    form.addEventListener('submit', (e) => {
      const tipo = form.tipo.value;
      const conf = PM_RECIPIENTS[tipo];
      if (!conf) {
        e.preventDefault();
        pmShowReservationMessage({ error: 'patient-form-error', success: 'patient-form-success' }, 'Seleziona il servizio.', false);
        return;
      }
      pmHandleReservationSubmit(e, tipo, conf, 'Prenotazione inviata.', { error: 'patient-form-error', success: 'patient-form-success' })
        .then(() => pmRenderMyReservations('my-reservations-list'));
    });
  }

  await pmRenderMyReservations('my-reservations-list');
}
