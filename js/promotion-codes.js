/* Codici promozione: generazione (Direzione) e riscatto (chiunque).
   Le operazioni vere avvengono nelle Edge Function create-promotion-code e
   redeem-promotion-code (usano il service role, mai esposto al browser). */
(function () {

  function showMsg(scope, selector, text, ok) {
    const el = scope.querySelector(selector);
    if (el) { el.textContent = text; el.classList.add('show'); }
  }
  function clearMsgs(scope) {
    scope.querySelectorAll('.form-error, .form-success').forEach((el) => { el.textContent = ''; el.classList.remove('show'); });
  }

  // --- Generazione codice (solo Direzione, pannello "Codici Promozione") ---
  function wireCreateForm() {
    const form = document.getElementById('promo-create-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';

    const user = typeof pmCurrentUser === 'function' ? pmCurrentUser() : null;
    const roleSelect = document.getElementById('promo-role');
    if (roleSelect && user && typeof PM_ROLES !== 'undefined') {
      // Stessa regola lato server: solo ruoli sotto il proprio (tranne il super-admin, che li vede tutti).
      const myIndex = PM_ROLES.indexOf(user.role);
      const assignable = user.isSuperAdmin ? PM_ROLES : (myIndex === -1 ? PM_ROLES : PM_ROLES.slice(myIndex + 1));
      roleSelect.innerHTML = '<option value="" disabled selected>Seleziona</option>' +
        assignable.map((r) => `<option value="${r}">${r}</option>`).join('');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsgs(form.closest('.panel-card'));
      const role = roleSelect.value;
      const expiresRaw = document.getElementById('promo-expires').value;
      if (!role) return;

      const { data, error } = await PM_DB.functions.invoke('create-promotion-code', {
        body: { role, expiresInHours: expiresRaw ? Number(expiresRaw) : null },
      });
      let serverMessage = null;
      if (error && error.context && typeof error.context.json === 'function') {
        try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
      }
      if (error || !data || data.error) {
        showMsg(form.closest('.panel-card'), '#promo-create-error', serverMessage || (data && data.error) || 'Errore nella generazione del codice.', false);
        return;
      }

      const box = document.getElementById('promo-generated');
      const codeEl = document.getElementById('promo-generated-code');
      const expiryEl = document.getElementById('promo-generated-expiry');
      if (box && codeEl) {
        box.style.display = 'block';
        codeEl.textContent = data.code;
        expiryEl.textContent = data.expiresAt
          ? 'Valido fino al ' + new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.expiresAt))
          : 'Nessuna scadenza.';
      }
      showMsg(form.closest('.panel-card'), '#promo-create-success', 'Codice generato con successo.', true);
      form.reset();
    });
  }

  // --- Riscatto codice (chiunque, dal proprio profilo) ---
  function wireRedeemForms() {
    document.querySelectorAll('.js-redeem-code-form').forEach((form) => {
      if (form.dataset.wired) return;
      form.dataset.wired = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const wrapper = form.closest('div');
        const errorEl = wrapper.querySelector('.js-redeem-error');
        const successEl = wrapper.querySelector('.js-redeem-success');
        if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
        if (successEl) { successEl.textContent = ''; successEl.classList.remove('show'); }

        const code = form.code.value.trim();
        if (!code) return;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const { data, error } = await PM_DB.functions.invoke('redeem-promotion-code', { body: { code } });
        submitBtn.disabled = false;
        let serverMessage = null;
        if (error && error.context && typeof error.context.json === 'function') {
          try { const body = await error.context.json(); serverMessage = body && body.error; } catch (_) {}
        }
        if (error || !data || data.error) {
          if (errorEl) { errorEl.textContent = serverMessage || (data && data.error) || 'Codice non valido.'; errorEl.classList.add('show'); }
          return;
        }

        if (successEl) { successEl.textContent = 'Ruolo "' + data.role + '" assegnato! Ricarico la pagina...'; successEl.classList.add('show'); }
        setTimeout(() => window.location.reload(), 1200);
      });
    });
  }

  window.pmRenderPromotionCreatePanel = wireCreateForm;

  document.addEventListener('DOMContentLoaded', function () {
    wireRedeemForms();
  });
})();
