/**
 * Modais com <dialog> nativo: foco preso, fechamento por Esc e backdrop acessível.
 * Único modal do site: os detalhes de projeto (#modal-projeto). O orçamento saiu
 * do <dialog> e virou seção na própria página do serviço.
 */
export function initModal() {
  initProjectModal();
}

function initProjectModal() {
  const dialog = document.getElementById('modal-projeto');
  if (!dialog) return;

  // Carrega a base de dados dos projetos injetada pelo SSR
  let projects = [];
  const scriptTag = document.getElementById('projetos-data');
  if (scriptTag) {
    try {
      projects = JSON.parse(scriptTag.textContent || '[]');
    } catch {
      projects = [];
    }
  }

  const categoryEl = document.getElementById('modal-project-category');
  const titleEl = document.getElementById('modal-project-title');
  const mediaEl = document.getElementById('modal-project-media');
  const metaEl = document.getElementById('modal-project-meta');
  const descEl = document.getElementById('modal-project-desc');
  const deliverablesEl = document.getElementById('modal-project-deliverables');
  const deliverablesWrap = document.getElementById('modal-project-deliverables-wrap');
  const standardsEl = document.getElementById('modal-project-standards');
  const ctaEl = document.getElementById('modal-project-cta');

  function openProject(slug) {
    if (!slug) return;
    const project = projects.find((p) => p.slug === slug) || projects.find((p) => p.title?.toLowerCase().includes(slug.toLowerCase()));
    if (!project) return;

    if (categoryEl) categoryEl.textContent = project.category || 'Projeto Técnico';
    if (titleEl) titleEl.textContent = project.title || '';
    if (metaEl) metaEl.textContent = project.meta || '';
    if (descEl) descEl.textContent = project.description || '';

    if (mediaEl) {
      const photo = project.photo || '/img/projetos.webp';
      const alt = `${project.title || 'Projeto'}, ${project.meta || ''}`;
      mediaEl.innerHTML = `<img src="${photo}" alt="${alt}" class="modal__img" loading="lazy" />`;
    }

    if (deliverablesEl && deliverablesWrap) {
      const items = (Array.isArray(project.deliverables) ? project.deliverables : []).filter(Boolean);
      if (items.length > 0) {
        deliverablesWrap.hidden = false;
        deliverablesEl.innerHTML = items
          .map(
            (item) => `<li>
              <svg class="modal__check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              <span>${item}</span>
            </li>`,
          )
          .join('');
      } else {
        deliverablesWrap.hidden = true;
      }
    }

    if (standardsEl) {
      if (project.standards) {
        standardsEl.hidden = false;
        standardsEl.innerHTML = `<strong>Normas e referências técnicas:</strong> ${project.standards}`;
      } else {
        standardsEl.hidden = true;
      }
    }

    if (ctaEl) {
      const text = encodeURIComponent(`Olá, engenheira Ayla. Gostaria de mais informações e orçamento para o serviço de: ${project.title}.`);
      ctaEl.href = `https://wa.me/553391456937?text=${text}`;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    // Sincroniza hash sem provocar salto de scroll
    if (location.hash !== `#${project.slug}`) {
      history.replaceState(null, '', `#${project.slug}`);
    }
  }

  // Gatilhos de clique em cada card de projeto
  document.querySelectorAll('[data-project-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = btn.getAttribute('data-project-open');
      openProject(slug);
    });
  });

  // Fechamento
  dialog.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => dialog.close());
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    // Ao fechar, limpa a hash se correspondia a um projeto
    if (location.hash && projects.some((p) => `#${p.slug}` === location.hash)) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  });

  // Deep-linking: abrir modal caso o usuário acesse direto /projetos/#ppci
  function checkHash() {
    const rawHash = location.hash.replace(/^#/, '');
    if (rawHash) {
      openProject(rawHash);
    } else if (dialog.open) {
      dialog.close();
    }
  }

  if (location.hash) {
    // Pequeno delay para garantir que o DOM esteja pronto
    setTimeout(checkHash, 50);
  }

  window.addEventListener('hashchange', checkHash);
}

