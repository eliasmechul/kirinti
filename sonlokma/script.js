// Geçici: kayıtlar şimdilik tarayıcıda saklanır. Gerçek sunucu/form servisine bağlanacak.
document.querySelectorAll('form.signup').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const msg = form.parentElement.querySelector('.form-msg') || form.querySelector('.form-msg');
    const data = [...form.querySelectorAll('input,select')].map(el => el.value);
    try {
      const key = 'kirinti_' + form.dataset.kind;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ data, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (_) {}
    msg.textContent = form.dataset.kind === 'isletme'
      ? 'Teşekkürler! Başvurunu aldık, seninle iletişime geçeceğiz.'
      : 'Harika! Listeye eklendin, şehrin açılınca haber vereceğiz.';
    form.reset();
  });
});
