export function initNav() {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (!burger || !nav) return;

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    nav.toggleAttribute('data-open', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };

  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('click', (e) => {
    if (nav.hasAttribute('data-open') && !nav.contains(e.target) && !burger.contains(e.target)) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
}
