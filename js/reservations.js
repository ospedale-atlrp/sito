/* Prenotazioni condivise su Supabase, create dal personale nel gestionale. */
function pmT(key, fallback, vars) {
  let s = null;
  if (typeof I18N !== 'undefined') { const v = I18N.t(key, vars); if (v && v !== key) s = v; }
  if (s === null) {
    s = fallback || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
  }
  return s;
}
function pmReservationLabels() { return { cambio_sesso: pmT('dashboard.form.cambio_sesso', 'Cambio Sesso'), certificato_medico: pmT('dashboard.form.certificato_medico', 'Certificato Medico') }; }
const PM_RECIPIENTS = {
  certificato_medico: ['Medico di Base', 'Medico di Laboratorio', 'Medico Responsabile Ambulatorio', 'Chirurgo Specializzando', 'Chirurgo Strutturato', 'Chirurgo Vice Primario', 'Chirurgo Primario', 'Dirigente'],
  cambio_sesso: ['Chirurgo Specializzando', 'Chirurgo Strutturato', 'Chirurgo Vice Primario', 'Chirurgo Primario', 'Dirigente']
};
function pmCanRegister(user) { return !!user && !!window.PM_DB; }
function pmIsReservationRecipient(user) { return !!user && (PM_RECIPIENTS.certificato_medico.includes(user.role) || PM_RECIPIENTS.cambio_sesso.includes(user.role)); }
/* Stessa identica logica usata lato server (take-reservation,
   send-reservation-message, close-reservation): il "vero" paziente di una
   prenotazione è chi ha quell'username Telegram indicato, non
   necessariamente chi l'ha compilata (citizen_id). Se non c'è un
   username indicato (prenotazioni "per me stesso"), il paziente coincide
   con chi l'ha creata. Questo vale SEMPRE, qualunque sia il ruolo attuale
   della persona: un medico può essere paziente di una prenotazione altrui,
   e deve vederla come tale, non mescolata al proprio lavoro. */
function pmIsPatientOf(r, user) {
  if (!r || !user) return false;
  const handle = String(r.telegram_username || '').trim().replace(/^@/, '').toLowerCase();
  if (handle) return handle === String(user.telegramUsername || '').trim().toLowerCase();
  return r.citizen_id === user.id;
}
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
   (targetRoles, una riga per ruolo) oppure per un singolo utente (targetUserId).
   NB: titolo e corpo vengono salvati già tradotti, nella lingua di chi
   compila la prenotazione in quel momento — chi legge l'avviso in un'altra
   lingua lo vedrà comunque in quella lingua, perché il testo è già "cotto"
   nel database. Per una traduzione davvero per-lettore servirebbe salvare
   solo la chiave e i parametri, e tradurla lato client quando viene letta:
   cambiamento più ampio, fuori dai file attualmente coinvolti. */
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
  if(!pmCanRegister(user)) return pmShowReservationMessage(ids,pmT('common.db_unavailable','Accesso al database non disponibile.'),false);
  const nome=form.nome.value.trim(), cognome=form.cognome.value.trim(), cf=form.cf.value.trim(), sesso=form.sesso.value;
  // Toggle "Per Me" / "Per i Pazienti" (solo nel form staff): se presente e
  // impostato su "me_stesso", il campo telegram è nascosto/non richiesto e
  // usiamo il Telegram già collegato al login di chi compila. Il form del
  // paziente (che compila sempre per sé) non ha questo campo: stesso
  // comportamento, usa sempre il proprio Telegram.
  const modalitaRadio = form.querySelector('input[name="modalita"]:checked');
  const isForSelf = !form.telegram || (modalitaRadio && modalitaRadio.value === 'me_stesso');
  const telegram = isForSelf ? (user.telegramUsername || '') : form.telegram.value.trim().replace(/^@/,'').trim();
  if(!nome||!cognome||!cf||!sesso) return pmShowReservationMessage(ids,pmT('common.fill_all_fields','Compila tutti i campi.'),false);

  // Certificato Agonistico: presente solo per il tipo "certificato_medico".
  let agonistico = null;
  if (type === 'certificato_medico' && form.agonistico) {
    if (!form.agonistico.value) return pmShowReservationMessage(ids,pmT('dashboard.form.agonistico_required','Seleziona se il certificato è agonistico.'),false);
    agonistico = form.agonistico.value === 'si';
  }

  const {data:inserted,error}=await PM_DB.from('reservations').insert({
    citizen_id:user.id, citizen_username:user.username, type, nome, cognome, codice_fiscale:cf,
    sesso, telegram_username:telegram, target_roles:recipientRoles||PM_RECIPIENTS[type], status:'inviata', agonistico
  }).select('id').single();
  if(error) return pmShowReservationMessage(ids,error.message,false);
  pmShowReservationMessage(ids,successMsg+pmT('dashboard.request.sent_suffix',' La richiesta è stata inviata al personale competente.'),true); form.reset();
  if (typeof pmCreateNotification === 'function') {
    pmCreateNotification({
      targetRoles: recipientRoles || PM_RECIPIENTS[type],
      title: pmT('dashboard.request.notify_title', 'Nuova prenotazione'),
      body: pmT('dashboard.request.notify_body', '{name} ha inviato una richiesta di {service}.', { name: (user.name || user.username), service: pmReservationLabels()[type] }),
    });
  }
  if (inserted && inserted.id) {
    // Notifiche Telegram (medico + paziente): non blocca l'esito del form
    // se dovesse fallire, l'importante è che la prenotazione sia salvata.
    PM_DB.functions.invoke('notify-reservation-created', { body: { reservationId: inserted.id } }).catch(() => {});
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
    pmToast(serverMessage || (data && data.error) || pmT('reservations.take_charge_error','Errore nella presa in carico.'), 'error');
    return;
  }
  pmToast(data.telegramSent ? pmT('reservations.taken_toast_telegram','Prenotazione presa in carico. Paziente avvisato su Telegram.') : pmT('reservations.taken_toast_no_telegram','Prenotazione presa in carico. (Il paziente non ha ancora avviato il bot: avvisato solo sul sito.)'), 'success');
}
async function pmCloseReservation(id) {
  const ok = await pmConfirm(pmT('reservations.close_confirm','Chiudere questa pratica? Non sarà più possibile scrivere nella chat.'));
  if (!ok) return;
  const { data, error } = await PM_DB.functions.invoke('close-reservation', { body: { reservationId: id } });
  let serverMessage = null;
  if (error && error.context && typeof error.context.json === 'function') {
    try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
  }
  if (error || !data || data.error) {
    pmToast(serverMessage || (data && data.error) || pmT('reservations.close_error','Errore nella chiusura.'), 'error');
    return;
  }
  pmToast(pmT('reservations.closed_toast','Pratica chiusa. Paziente avvisato.'),'success');
}
function pmReservationRow(r,user) {
  const assigned=r.assigned_staff_id===user.id;
  const patient=`${r.nome} ${r.cognome} (${r.codice_fiscale||'—'})`;
  let action='';
  if(r.status==='inviata') action=`<button class="btn btn-sm btn-primary js-take" data-id="${r.id}">${pmT('reservations.take_charge','Prendi in carico')}</button>`;
  if(r.status==='presa_in_carico' && assigned) action=`<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}" data-closed="0">${pmT('reservations.open','Apri')}</button> <button class="btn btn-sm btn-danger js-close" data-id="${r.id}">${pmT('common.close','Chiudi')}</button>`;
  if(r.status==='chiusa' && assigned) action=`<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}" data-closed="1">${pmT('reports.view_conversation','Vedi conversazione')}</button>`;
  const agonisticoLine = (r.type === 'certificato_medico' && r.agonistico !== null && r.agonistico !== undefined)
    ? `<br>${pmT('reservations.agonistico_label','Agonistico:')} ${r.agonistico ? pmT('common.yes','Sì') : pmT('common.no','No')}` : '';
  const statusLabels = { inviata: pmT('reservations.status_inviata','In attesa'), presa_in_carico: pmT('reservations.status_presa_in_carico','Presa in carico'), chiusa: pmT('reservations.status_chiusa','Chiusa') };
  const statusText = statusLabels[r.status] || r.status.replaceAll('_',' ');
  return `<div class="reservation-row"><div class="res-info"><span class="reservation-tag ${r.type==='cambio_sesso'?'tag-sesso':''}">${pmReservationLabels()[r.type]}</span><br><b>${patient}</b>${agonisticoLine}<br>${pmT('reservations.telegram_label','Telegram:')} @${r.telegram_username||pmT('reservations.not_provided','non indicato')}<br>${pmT('common.status','Stato')}: ${statusText}</div>${action}</div>`;
}
async function pmRenderReceivedReservations(listId) {
  listId = listId || 'received-reservations-list';
  const list=document.getElementById(listId), user=pmCurrentUser(); if(!list||!user)return;
  if (!pmIsReservationRecipient(user)) { list.innerHTML=''; return; }
  const rows=(await pmReservationsForUser(user)).filter(r=>
    r.target_roles.includes(user.role)
    && !pmIsPatientOf(r,user)
    && (
      r.status==='inviata'
      || (r.status==='presa_in_carico' && r.assigned_staff_id===user.id)
      // Chiusa: resta visibile SOLO a chi l'aveva presa in carico (stesso
      // controllo di prima, "assigned_staff_id===user.id"), solo per
      // rivederla in sola lettura — non compaiono più "Prendi in carico"
      // né "Chiudi", quindi non si può riaprire il flusso da qui.
      || (r.status==='chiusa' && r.assigned_staff_id===user.id)
    )
  );
  list.innerHTML=rows.length?rows.map(r=>pmReservationRow(r,user)).join(''):'<div class="reservations-empty">'+pmT('reservations.none_pending','Nessuna prenotazione in attesa.')+'</div>';
  list.querySelectorAll('.js-take').forEach(b=>b.addEventListener('click',()=>{pmTakeReservation(b.dataset.id).then(()=>pmRenderReceivedReservations(listId));}));
  list.querySelectorAll('.js-close').forEach(b=>b.addEventListener('click',()=>{pmCloseReservation(b.dataset.id).then(()=>pmRenderReceivedReservations(listId));}));
  list.querySelectorAll('.js-open-chat').forEach(b=>b.addEventListener('click',()=>{ if (typeof pmOpenReservationChat === 'function') pmOpenReservationChat(b.dataset.id, { readOnly: b.dataset.closed === '1' }); }));
}
function pmMyReservationRow(r) {
  const statusLabels = { inviata: pmT('reservations.status_inviata','In attesa'), presa_in_carico: pmT('reservations.status_presa_in_carico','Presa in carico'), chiusa: pmT('reservations.status_chiusa','Chiusa') };
  const statusLabel = statusLabels[r.status] || r.status.replaceAll('_',' ');
  let action = '';
  if (r.status === 'presa_in_carico') {
    action = `<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}" data-closed="0">${pmT('reports.open_chat','Apri chat')}</button>`;
  } else if (r.status === 'chiusa') {
    action = `<button class="btn btn-sm btn-outline js-open-chat" data-id="${r.id}" data-closed="1">${pmT('reports.view_conversation','Vedi conversazione')}</button>`;
  }
  const assignedInfo = r.assigned_staff_name ? `<br>${pmT('reservations.followed_by','Seguito da:')} ${r.assigned_staff_name}` : '';
  return `<div class="reservation-row"><div class="res-info"><b>${pmReservationLabels()[r.type]}</b><br>${r.nome} ${r.cognome} — <b>${statusLabel}</b>${assignedInfo}</div>${action}</div>`;
}
async function pmRenderMyReservations(containerId) {
  const el=document.getElementById(containerId),user=pmCurrentUser(); if(!el||!user)return;
  const rows=(await pmReservationsForUser(user)).filter(r=>pmIsPatientOf(r,user));
  el.innerHTML=rows.length?rows.map(pmMyReservationRow).join(''):'<div class="reservations-empty">'+pmT('reservations.none_created','Non hai ancora creato prenotazioni.')+'</div>';
  el.querySelectorAll('.js-open-chat').forEach(b=>b.addEventListener('click',()=>{ if (typeof pmOpenReservationChat === 'function') pmOpenReservationChat(b.dataset.id, { readOnly: b.dataset.closed === '1' }); }));
}
function pmRenderReservationCounters(){}
function pmRenderApprovedCounters(){}
function pmCountUserReservations(){return {cambio_sesso:0,certificato_medico:0};}

// Ridisegna le liste già a schermo quando cambia la lingua (senza questo,
// le righe già renderizzate restano nella lingua con cui erano state create).
document.addEventListener('i18n:changed', function () {
  if (document.getElementById('received-reservations-list')) pmRenderReceivedReservations('received-reservations-list');
  if (document.getElementById('staff-my-reservations-list')) pmRenderMyReservations('staff-my-reservations-list');
  if (document.getElementById('my-reservations-list')) pmRenderMyReservations('my-reservations-list');
});

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

    // Mostra "Certificato Agonistico" solo quando il servizio scelto è
    // Certificato Medico (stesso comportamento del form staff).
    const agonField = document.getElementById('patient-agonistico-field');
    const agonSelect = document.getElementById('patient-agonistico');
    if (form.tipo && agonField && agonSelect) {
      form.tipo.addEventListener('change', () => {
        const isCertificato = form.tipo.value === 'certificato_medico';
        agonField.style.display = isCertificato ? '' : 'none';
        agonSelect.required = isCertificato;
        if (!isCertificato) { agonSelect.value = ''; if (typeof pmRefreshSelect === 'function') pmRefreshSelect(agonSelect); }
      });
    }

    form.addEventListener('submit', (e) => {
      const tipo = form.tipo.value;
      const conf = PM_RECIPIENTS[tipo];
      if (!conf) {
        e.preventDefault();
        pmShowReservationMessage({ error: 'patient-form-error', success: 'patient-form-success' }, pmT('dashboard.request.select_service_error','Seleziona il servizio.'), false);
        return;
      }
      pmHandleReservationSubmit(e, tipo, conf, pmT('dashboard.request.generic_success','Prenotazione inviata.'), { error: 'patient-form-error', success: 'patient-form-success' })
        .then(() => pmRenderMyReservations('my-reservations-list'));
    });
  }

  await pmRenderMyReservations('my-reservations-list');
}
