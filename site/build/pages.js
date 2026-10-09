import { esc, icon, arrow, slot, pageHead, ctaBand, leadForm, faqSection, formOf, questionario, adaptiveForm, EXTRAS } from './render.js';
import { imgSize } from './imgsize.js';

/* ============================ HOME ============================ */

/**
 * Destaques da home: derivados dos projetos marcados com `featured`, não de uma
 * lista própria. Antes a home tinha `proofSlots` com as fotos duplicadas e os
 * slugs de destino fixos no código — renomear o slug de um projeto quebrava o
 * link em silêncio.
 */
function destaques(b, projetos) {
  const cards = (projetos.slots ?? []).filter((s) => s.featured);
  if (cards.length === 0) return '';

  return `
<section class="section" id="obras">
  <div class="wrap">
    <div class="section__header">
      <h2 class="section__title">${esc(b.proofTitle)}</h2>
      <p class="section__intro">${esc(b.proofIntro)}</p>
    </div>
    <div class="proof">
      ${cards
        .map(
          (s) => `
      <a class="proof__card" href="/projetos/#${esc(s.slug)}" title="Ver detalhes deste projeto">
        ${slot(s.photo, '', `${s.title}, ${s.meta}`)}
      </a>`,
        )
        .join('')}
    </div>
    <p class="section__more text-center">
      <a class="btn btn--secondary" href="/projetos/">Ver todos os projetos</a>
    </p>
  </div>
</section>`;
}

/**
 * Recorte pequeno de uma foto da galeria.
 *
 * O upload grava uma variante por largura (`<id>-1200.webp`, `<id>-600.webp`),
 * então a miniatura do cartão sai do nome da foto grande. Fotos que vieram com o
 * site não têm variante: o `imgSize` não acha o arquivo e volta a original.
 */
function menor(src, largura) {
  const alt = src.replace(/-\d+\.webp$/, `-${largura}.webp`);
  return alt === src ? null : alt;
}

/**
 * Miniatura do cartão de solução na home: a mesma foto que o serviço mostra em
 * /servicos/, no recorte de 600px — a de 1200 pesa até 30x mais e o cartão tem
 * um terço da largura. Sem foto, o cartão volta a mostrar só o ícone.
 */
function cardMedia(servico) {
  const foto = servico?.image;
  if (typeof foto !== 'string' || !foto.startsWith('/')) return '';
  // As fotos que vieram com o site não têm variante gerada; para elas continua
  // valendo o recorte manual `/img/service-<slug>.webp`, que já está no repo.
  const src = [menor(foto, 600), `/img/service-${servico.slug}.webp`, foto].find(
    (c) => c && imgSize(c),
  );
  const size = src && imgSize(src);
  if (!size) return '';
  return `<div class="card__media"><img src="${src}" alt="" width="${size.width}" height="${size.height}" loading="lazy" decoding="async" /></div>`;
}

/**
 * Foto de fundo da hero no desktop.
 *
 * `<picture>` e não `background-image`: a URL vem do painel (aba Galeria) e a
 * CSP do site proíbe estilo inline, então ela tem de morar no HTML. O `<source>`
 * casa com o breakpoint de 920px do main.scss — no celular o fundo está oculto e
 * o navegador cai no `<img>`, que é a mesma foto do cartão de perfil logo abaixo
 * e portanto não custa um download a mais.
 */
function heroBg(h) {
  // Fallback para a foto que veio com o site: enquanto o painel não gravar a
  // dele, a hero do desktop continua com fundo em vez de ficar num vazio escuro.
  const desktop = h.desktopImage ?? '/img/hero-desktop.webp';
  if (typeof desktop !== 'string' || !desktop.startsWith('/')) return '';
  // width/height são os do `src` (a foto do celular), não os do `<source>`: é a
  // imagem do fallback que o atributo descreve.
  const size = imgSize(h.imageSlot);
  return `<picture class="hero__bg" aria-hidden="true">
    <source media="(min-width: 921px)" srcset="${desktop}" />
    <img src="${esc(h.imageSlot)}" alt="" ${size ? `width="${size.width}" height="${size.height}" ` : ''}fetchpriority="high" decoding="async" />
  </picture>`;
}

/** @param {object} [deps] blocos de outras páginas: `projetos`, `servicos` e `sobre`. */
export function home(b, deps = {}) {
  const h = b.hero;
  return `
<section class="hero">
  ${heroBg(h)}
  <div class="wrap hero__grid">
    <div class="hero__body">
      <h1 class="hero__title">${esc(h.title)}</h1>
      <p class="hero__sub">${esc(h.subtitle)}</p>
      <div class="hero__actions">
        <a class="btn btn--gold btn--lg" href="${esc(h.ctaPrimary.href)}" target="_blank" rel="noopener">
          <span>${esc(h.ctaPrimary.label)}</span>
          <svg class="btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <a class="btn btn--ghost btn--lg" href="${esc(h.ctaSecondary.href)}">${esc(h.ctaSecondary.label)}</a>
      </div>
      <div class="hero__trust">
        ${(h.trust ?? []).map((t) => `<span class="hero__trust-item">${icon('check')} ${esc(t)}</span>`).join('')}
      </div>
    </div>
    <div class="hero__media">
      <div class="hero-profile">
        ${slot(h.imageSlot, 'slot--portrait', 'Ayla Gotelip, engenheira responsável pela Gotelip Engenharia', true)}
        <div class="hero-profile__bar">
          <div class="hero-profile__avatar">
            <span class="hero-profile__initials">AG</span>
          </div>
          <div class="hero-profile__info">
            <strong>Ayla Gotelip</strong>
            <span>Engenheira Responsável · CREA-MG</span>
          </div>
          <span class="hero-profile__tag">ART Registrada</span>
        </div>
      </div>
    </div>
  </div>
</section>

${
  b.stats?.length
    ? `<section class="stats" aria-label="Indicadores da Gotelip Engenharia">
  <div class="wrap stats__row">
    ${b.stats
      .map(
        (s, idx) =>
          `<div class="stats__item">
            <span class="stats__icon" aria-hidden="true">${icon(s.icon || 'check')}</span>
            <span class="stats__text">
              <span class="stats__value">${esc(s.value)}</span>
              <span class="stats__label">${esc(s.label)}</span>
            </span>
          </div>${idx < b.stats.length - 1 ? '<div class="stats__divider" aria-hidden="true"></div>' : ''}`,
      )
      .join('')}
  </div>
</section>`
    : ''
}

<section class="section" id="jornada">
  <div class="wrap">
    <div class="section__header">
      <h2 class="section__title">${esc(b.journeyTitle)}</h2>
      <p class="section__intro">${esc(b.journeyIntro)}</p>
    </div>
    <ol class="journey">
      ${b.journey
        .map(
          (j, idx) => `
      <li class="journey__col">
        <div class="journey__badge-wrap">
          <span class="journey__stage">${esc(j.stage)}</span>
          <span class="journey__step">0${idx + 1}</span>
        </div>
        <h3 class="journey__title">${esc(j.title)}</h3>
        <p class="journey__text">${esc(j.text)}</p>
        <ul class="journey__list">
          ${j.items.map((i) => `<li><span class="journey__check">${icon('check')}</span><span>${esc(i)}</span></li>`).join('')}
        </ul>
      </li>`,
        )
        .join('')}
    </ol>
  </div>
</section>

<section class="section section--alt" id="solucoes">
  <div class="wrap">
    <div class="section__header">
      <h2 class="section__title">${esc(b.servicesTitle)}</h2>
      <p class="section__intro">${esc(b.servicesIntro)}</p>
    </div>
    <div class="cards">
      ${b.services
        .map((s) => {
          const media = cardMedia((deps.servicos?.services ?? []).find((x) => x.slug === s.slug));
          return `
      <article class="card">
        ${media}
        <div class="card__body">
          <div class="card__top">
            ${media ? '' : `<span class="card__icon">${icon(s.icon)}</span>`}
            <span class="card__badge">Norma CBMMG</span>
          </div>
          <h3 class="card__title">${esc(s.title)}</h3>
          <p class="card__text">${esc(s.text)}</p>
          <a class="card__link" href="/servicos/${esc(s.slug || s.icon)}/">
            <span>Conhecer o serviço</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </article>`;
        })
        .join('')}
    </div>
  </div>
</section>

<section class="why" id="diferencial">
  <div class="wrap why__grid">
    <div class="why__media">
      <div class="why-frame">
        ${slot(b.whyImageSlot, '', 'Ayla Gotelip apresentando um projeto de combate a incêndio para um cliente em seu escritório')}
      </div>
    </div>
    <div class="why__body">
      <h2 class="why__title">${esc(b.whyTitle)}</h2>
      <p class="why__text">${esc(b.whyText)}</p>
      <ul class="why__list">
        ${b.whyBullets
          .map(
            (t) => `
        <li>
          <div class="why__bullet-bar"></div>
          <div>${esc(t)}</div>
        </li>`,
          )
          .join('')}
      </ul>
      <div class="why__actions">
        <a class="btn btn--gold" href="/sobre/">Conhecer a atuação da engenheira</a>
      </div>
    </div>
  </div>
</section>

${destaques(b, deps.projetos ?? {})}

${faqSection(b.faqTitle, deps.sobre?.faq)}

${ctaBand(b.contact, b.ctaTitle, b.ctaText)}`;
}

/* ============================ SOBRE ============================ */

export function sobre(b) {
  return `
${pageHead(b.title, b.lead, 'Institucional · Gotelip Engenharia')}

<section class="section">
  <div class="wrap bio">
    <div class="bio__media">${slot(b.portraitSlot, 'slot--portrait', 'Engenheira Ayla Gotelip')}</div>
    <div class="bio__body">
      <h2 class="section__title">${esc(b.bioTitle)}</h2>
      ${b.bio.map((p) => `<p class="bio__p">${esc(p)}</p>`).join('')}
      <dl class="regs">
        ${b.registros
          .map(
            (r) => `<div class="regs__item"><dt>${esc(r.label)}</dt><dd>${esc(r.value) || '<span class="pending">A informar</span>'}</dd></div>`,
          )
          .join('')}
      </dl>
    </div>
  </div>
</section>

${
  b.commitment
    ? `<section class="section section--alt">
  <div class="wrap bio">
    <div class="bio__body">
      <h2 class="section__title">${esc(b.commitment.title)}</h2>
      ${b.commitment.paragraphs.map((p) => `<p class="bio__p">${esc(p)}</p>`).join('')}
    </div>
    <div class="bio__media">
      <div class="commit-steps">
        <div class="commit-step">
          <div class="commit-step__num">01</div>
          <div class="commit-step__body">
            <strong>Levantamento técnico</strong>
            <span>Visita ao imóvel e enquadramento nas Instruções Técnicas do CBMMG</span>
          </div>
        </div>
        <div class="commit-step">
          <div class="commit-step__num">02</div>
          <div class="commit-step__body">
            <strong>Projeto conforme norma</strong>
            <span>Dimensionamento sem excessos nem equipamentos fora de especificação</span>
          </div>
        </div>
        <div class="commit-step">
          <div class="commit-step__num">03</div>
          <div class="commit-step__body">
            <strong>Protocolo no Infoscip</strong>
            <span>Tramitação digital com acompanhamento presencial na vistoria militar</span>
          </div>
        </div>
        <div class="commit-step commit-step--final">
          <div class="commit-step__num">04</div>
          <div class="commit-step__body">
            <strong>AVCB aprovado</strong>
            <span>Entrega do alvará com ART registrada no CREA-MG 214049/D</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`
    : ''
}

<section class="section">
  <div class="wrap">
    <div class="section__header text-center">
      <h2 class="section__title section__title--center">${esc(b.mvvTitle)}</h2>
    </div>
    <div class="mvv">
      ${b.mvv
        .map(
          (m) => `
      <article class="mvv-card">
        <div class="mvv-card__head">
          <span class="mvv-card__icon">${icon(m.icon)}</span>
          <h3 class="mvv-card__title">${esc(m.title)}</h3>
        </div>
        ${m.text ? `<p class="mvv-card__text">${esc(m.text)}</p>` : ''}
        ${m.items ? `<ul class="card__list">${m.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      </article>`,
        )
        .join('')}
    </div>
  </div>
</section>

${
  b.accreditations
    ? `<section class="section section--alt">
  <div class="wrap text-center">
    <h2 class="section__title section__title--center">${esc(b.accreditations.title)}</h2>
    <p class="section__intro section__intro--center">${esc(b.accreditations.intro)}</p>
    <div class="orgs-grid">
      ${b.accreditations.items
        .map(
          (item) => `
      <div class="org-card">
        <img src="${esc(item.logo)}" alt="${esc(item.name)}" class="org-card__logo" loading="lazy" />
        <div class="org-card__info">
          <strong>${esc(item.name)}</strong>
          <span>${esc(item.desc)}</span>
        </div>
      </div>`,
        )
        .join('')}
    </div>
  </div>
</section>`
    : ''
}

${faqSection(b.faqTitle, b.faq)}

${ctaBand(b.contact, b.ctaTitle, b.ctaText)}`;
}

/* ============================ SERVIÇOS ============================ */

/**
 * Foto do serviço no topo do cartão. `alt` vazio de propósito: o título do
 * cartão, logo abaixo, já nomeia o serviço — repetir a mesma informação no
 * leitor de tela só atrapalha. `width`/`height` reais mantêm o CLS em zero.
 */
const serviceCardMedia = (src) => {
  const size = imgSize(src);
  return `
        <div class="svc-card__media">
          <img src="${esc(src)}" alt=""${size ? ` width="${size.width}" height="${size.height}"` : ''} loading="lazy" decoding="async" />
        </div>`;
};

/** Cartão de serviço do hub e da navegação cruzada entre serviços. */
const serviceCard = (s) => `
      <article class="svc-card${s.image ? ' svc-card--photo' : ''}">
        ${s.image ? serviceCardMedia(s.image) : ''}
        <div class="svc-card__body">
          <div class="svc-card__header">
            ${s.image ? '' : `<span class="svc-card__icon">${icon(s.icon)}</span>`}
            <h2 class="svc-card__title"><a href="/servicos/${esc(s.slug)}/">${esc(s.title)}</a></h2>
          </div>
          <p class="svc-card__text">${esc(s.lead)}</p>
          <span class="svc-card__more">Ver o serviço${arrow(14)}</span>
        </div>
      </article>`;

export function servicos(b) {
  return `
${pageHead(b.title, b.lead, 'Serviços técnicos · CBMMG')}

<section class="section">
  <div class="wrap">
    <div class="svc-grid">
      ${b.services.map(serviceCard).join('')}
    </div>
  </div>
</section>

<section class="section section--alt" id="extras">
  <div class="wrap">
    <div class="section__header text-center">
      <h2 class="section__title section__title--center">${esc(b.extrasTitle || 'Soluções complementares')}</h2>
      <p class="section__intro section__intro--center">${esc(b.extrasIntro || 'Laudos, planos e projetos auxiliares para regularização patrimonial integral.')}</p>
    </div>
    <div class="extras-grid">
      ${EXTRAS.map(
        (ex) => `
      <a class="extra-card" href="/orcamento/?servico=${esc(ex.slug)}">
        <span class="extra-card__icon">${icon(ex.icon)}</span>
        <span class="extra-card__title">${esc(ex.title)}</span>
        <span class="extra-card__cue">Pedir orçamento${arrow(13)}</span>
      </a>`,
      ).join('')}
    </div>
  </div>
</section>

${ctaBand(b.contact, b.ctaTitle, b.ctaText)}`;
}

/* ======================= SERVIÇO (página) ======================= */

/** `seed` é o serviço que originou a rota; usado se a API não devolver mais esse slug. */
export function servico(b, slug, seed) {
  const services = b.services ?? [];
  const s = services.find((x) => x.slug === slug) ?? seed;
  if (!s) throw new Error(`[servicos] serviço "${slug}" não encontrado nem na API nem no seed local`);
  const outros = services.filter((x) => x.slug !== slug);
  // Serviço com questionário próprio troca o formulário genérico. O formulário fica
  // na própria página, não num modal: é a conversão da página, e um <dialog> esconde
  // atrás de um clique — e de JS — o único caminho para virar lead.
  const quiz = formOf(slug);

  return `
<section class="phead phead--svc">
  <div class="wrap svc-head">
    <div class="svc-head__body">
      <a class="phead__back" href="/servicos/">${arrow(14, true)}Todos os serviços</a>
      <h1 class="phead__title">${esc(s.title)}</h1>
      <p class="phead__lead">${esc(s.lead)}</p>
      <div class="svc-head__actions">
        <a class="btn btn--gold btn--lg" href="/orcamento/?servico=${slug}">Solicitar orçamento</a>
        <a class="btn btn--ghost btn--lg" href="https://wa.me/${esc(b.contact.phoneDigits)}" target="_blank" rel="noopener">Falar no WhatsApp</a>
      </div>
    </div>
    ${s.image ? `<div class="svc-head__media">${slot(s.image, '', `${s.title}, Gotelip Engenharia`, true)}</div>` : ''}
  </div>
</section>

<section class="section">
  <div class="wrap svc-body">
    <div class="svc-body__col">
      <h2 class="svc-body__subtitle">Itens inclusos no serviço</h2>
      <ul class="ticks">${s.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="svc-body__col">
      <h2 class="svc-body__subtitle">Quando você precisa</h2>
      <ul class="ticks">${s.when.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <aside class="svc-body__note">
      <h3 class="svc-body__note-title">Diretriz Técnica</h3>
      <p>${esc(s.note)}</p>
      <a class="btn btn--gold btn--block" href="/orcamento/?servico=${slug}">Solicitar orçamento</a>
    </aside>
  </div>
</section>

<section class="section" id="avaliacao">
  <div class="wrap svc-quiz">
    <div class="svc-quiz__aside">
      <h2 class="svc-quiz__title">Fale diretamente com a engenheira responsável</h2>
      <p class="svc-quiz__lead">As perguntas da nossa triagem técnica online são as mesmas necessárias para o enquadramento perante o Corpo de Bombeiros Militar de Minas Gerais. Respondê-las permite definir escopo e prazos com precisão.</p>
      <ol class="steps">
        <li class="steps__item">
          <h3 class="steps__title">Leitura do caso</h3>
          <p class="steps__text">A engenheira responsável analisa o que você descreveu e confere o enquadramento nas Instruções Técnicas do CBMMG.</p>
        </li>
        <li class="steps__item">
          <h3 class="steps__title">Retorno em até 24 horas</h3>
          <p class="steps__text">Com o que precisa ser feito, o prazo estimado e o próximo passo. Avaliação inicial sem custo.</p>
        </li>
        <li class="steps__item">
          <h3 class="steps__title">Visita com hora marcada</h3>
          <p class="steps__text">Quando o caso exige medição no local, o agendamento sai já no retorno.</p>
        </li>
      </ol>
      <p class="svc-quiz__alt">Prefere conversar antes de preencher? <a class="link-gold" href="https://wa.me/${esc(b.contact.phoneDigits)}" target="_blank" rel="noopener">Chame no WhatsApp</a>.</p>
    </div>
    <div class="svc-quiz__bridge">
      <div class="bridge-card">
        <div class="bridge-card__badge"><span class="badge-tag">Triagem Técnica Online</span></div>
        <h3 class="bridge-card__title">Orçamento Técnico para ${esc(s.title)}</h3>
        <p class="bridge-card__text">Inicie nossa triagem rápida em uma página dedicada. O formulário será aberto automaticamente com as perguntas específicas de <strong>${esc(s.title)}</strong>.</p>
        <div class="bridge-card__trust">
          <span>✓ Enquadramento CBMMG</span>
          <span>✓ Menos de 1 minuto</span>
          <span>✓ Sem custo inicial</span>
        </div>
        <div class="bridge-card__actions">
          <a class="btn btn--gold btn--lg btn--block" href="/orcamento/?servico=${slug}">
            <span>Solicitar orçamento deste serviço</span>
            ${arrow(16)}
          </a>
          <a class="btn btn--ghost btn--block" href="https://wa.me/${esc(b.contact.phoneDigits)}" target="_blank" rel="noopener">
            <span>Conversar no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

${
  outros.length
    ? `<section class="section section--alt">
  <div class="wrap">
    <div class="section__header">
      <h2 class="section__title">A responsabilidade técnica cobre as quatro etapas</h2>
      <p class="section__intro">Projeto, regularização, laudos e execução com uma única responsável, sem repassar o problema entre fornecedores.</p>
    </div>
    <div class="svc-grid">${outros.map(serviceCard).join('')}</div>
  </div>
</section>`
    : ''
}

${ctaBand(b.contact, b.ctaTitle, b.ctaText)}`;
}

export function serviceJsonLd(s, route, c) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.title,
    description: s.lead,
    serviceType: s.title,
    url: route,
    provider: { '@type': 'ProfessionalService', name: 'Gotelip Engenharia', '@id': 'https://gotelipengenharia.com/#business' },
    areaServed: { '@type': 'City', name: c.city },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Itens inclusos: ${s.title}`,
      itemListElement: s.includes.map((x) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: x } })),
    },
  })}<\/script>`;
}

/* ============================ PROJETOS ============================ */

export function projetos(b) {
  return `
${pageHead(b.title, b.lead, 'Portfólio de projetos')}

<section class="section">
  <div class="wrap">
    <div class="gallery">
      ${b.slots
        .map(
          (s) => `
      <article class="gallery__item">
        <button
          type="button"
          class="gallery__card-btn"
          data-project-open="${esc(s.slug || '')}"
          aria-haspopup="dialog"
          aria-controls="modal-projeto"
        >
          <span class="gallery__thumb">
            ${slot(s.photo, '', `${s.title}, ${s.meta}`)}
            <span class="gallery__badge">${esc(s.badge || s.category || 'Ver detalhes')}</span>
          </span>
          <span class="gallery__cap">
            ${s.category ? `<span class="gallery__category">${esc(s.category)}</span>` : ''}
            <h2 class="gallery__title">${esc(s.title)}</h2>
            <p class="gallery__meta">${esc(s.meta)}</p>
            <span class="gallery__cta-hint">
              <span>Mais informações</span>
              ${arrow(14)}
            </span>
          </span>
        </button>
      </article>`,
        )
        .join('')}
    </div>
    <p class="empty-note">${esc(b.note)}</p>
  </div>
</section>

${ctaBand(b.contact, b.ctaTitle, b.ctaText)}

<dialog class="modal modal--project" id="modal-projeto" aria-labelledby="modal-project-title" aria-modal="true">
  <div class="modal__header">
    <div>
      <span class="modal__category" id="modal-project-category"></span>
      <h2 class="modal__title" id="modal-project-title"></h2>
    </div>
    <button class="modal__close" type="button" data-modal-close aria-label="Fechar detalhes do projeto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <div class="modal__scroll">
    <div class="modal__hero-media" id="modal-project-media"></div>
    <div class="modal__meta-bar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      <span id="modal-project-meta"></span>
    </div>
    <div class="modal__lead-desc" id="modal-project-desc"></div>
    <div class="modal__deliverables-block" id="modal-project-deliverables-wrap">
      <h3 class="modal__section-title">Escopo técnico e entregas</h3>
      <ul class="modal__deliverables" id="modal-project-deliverables"></ul>
    </div>
    <div class="modal__standards" id="modal-project-standards"></div>
  </div>
  <div class="modal__footer">
    <button class="btn btn--secondary btn--sm" type="button" data-modal-close>Fechar</button>
    <a class="btn btn--gold btn--sm" id="modal-project-cta" href="https://wa.me/553391456937" target="_blank" rel="noopener">
      <span>Falar com a engenheira no WhatsApp</span>
      ${arrow(14)}
    </a>
  </div>
</dialog>
<script id="projetos-data" type="application/json">${JSON.stringify(b.slots)}</script>`;
}

/* ============================ BLOG ============================ */

/**
 * Categorias de um artigo. O painel grava `tag` como uma linha separada por
 * virgula ("Regularizacao, Custos") e cada uma e renderizada isolada: etiqueta
 * propria no cartao, link de filtro proprio no arquivo e contagem propria na
 * nuvem. Sem isto, "Regularizacao, Custos" viraria uma unica hashtag inutil.
 */
const tagsOf = (p) => String(p.tag ?? '').split(',').map((t) => t.trim()).filter(Boolean);

/** Cartão de artigo, usado no índice do blog e na lista de leitura relacionada. */
const postCard = (p, featured = false) => `
      <article class="post${featured ? ' post--featured' : ''}">
        <div class="post__meta">
          ${tagsOf(p).map((t) => `<span class="post__tag">${esc(t)}</span>`).join('')}
          <time datetime="${esc(p.date)}">${esc(p.dateLabel)}</time>
          ${p.readTime ? `<span class="post__dot" aria-hidden="true"></span><span>${esc(p.readTime)}</span>` : ''}
        </div>
        <h2 class="post__title"><a href="/blog/${esc(p.slug)}/">${esc(p.title)}</a></h2>
        <p class="post__excerpt">${esc(p.excerpt)}</p>
        <span class="post__more">Ler o artigo${arrow(14)}</span>
      </article>`;

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* Data vem como 'YYYY-MM-DD'; fatiar a string evita o deslocamento de fuso do
   `new Date()`, que joga a publicação para o dia anterior. */
const ym = (date) => date.slice(0, 7);
const monthLabel = (key) => `${key.slice(0, 4)} / ${MESES[+key.slice(5, 7) - 1]}`;
const dayLabel = (date) => `${date.slice(8)}/${date.slice(5, 7)}`;

/** Entrada do arquivo cronológico: data, título, resumo e etiquetas. */
const archiveEntry = (p) => `
        <li class="entry"${tagsOf(p).length ? ` data-tag="${esc(tagsOf(p).join(', '))}"` : ''}>
          <time class="entry__date" datetime="${esc(p.date)}">${dayLabel(p.date)}</time>
          <div class="entry__body">
            <h3 class="entry__title"><a href="/blog/${esc(p.slug)}/">${esc(p.title)}</a></h3>
            <p class="entry__excerpt">${esc(p.excerpt)}</p>
            <p class="entry__tags">
              ${tagsOf(p).map((t) => `<a class="entry__tag" href="#tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}
              ${p.readTime ? `<span class="entry__read">${esc(p.readTime)}</span>` : ''}
            </p>
          </div>
        </li>`;

export function blog(b) {
  const posts = [...(b.posts ?? [])].sort((a, z) => z.date.localeCompare(a.date));

  // Nuvem de hashtags com a contagem de cada uma, na ordem em que aparecem.
  const tags = new Map();
  for (const p of posts) for (const t of tagsOf(p)) tags.set(t, (tags.get(t) ?? 0) + 1);

  // Agrupa por ano-mês preservando a ordem decrescente já estabelecida.
  const months = new Map();
  for (const p of posts) {
    if (!months.has(ym(p.date))) months.set(ym(p.date), []);
    months.get(ym(p.date)).push(p);
  }

  return `
${pageHead(b.title, b.lead, 'Artigos e orientações')}

<section class="section">
  <div class="wrap wrap--narrow">
    ${
      posts.length
        ? `<div class="archive__filters" hidden>
      <form class="archive__search" role="search">
        <label class="archive__label" for="q">Buscar nos artigos</label>
        <input id="q" type="search" name="q" placeholder="Busque por tema, ou # para filtrar por hashtag" autocomplete="off"
          role="combobox" aria-expanded="false" aria-controls="tagmenu" aria-autocomplete="list" />
        <ul class="tagmenu" id="tagmenu" role="listbox" aria-label="Hashtags" hidden>
          ${[...tags]
            .map(
              ([tag, n], i) => `<li role="option" id="tagmenu-${i}" aria-selected="false" data-tag="${esc(tag)}">
            <span class="tagmenu__tag">#${esc(tag)}</span><span class="tagmenu__n">${n}</span>
          </li>`,
            )
            .join('')}
          <li class="tagmenu__empty" hidden>Nenhuma hashtag com esse nome.</li>
        </ul>
      </form>
      <p class="archive__count" role="status">${posts.length} artigos</p>
    </div>
    <div class="archive">
      ${[...months]
        .map(
          ([key, items]) => `<section class="archive__month">
        <h2 class="archive__title">${monthLabel(key)}</h2>
        <ol class="archive__list">${items.map(archiveEntry).join('')}
        </ol>
      </section>`,
        )
        .join('')}
    </div>
    <p class="archive__empty" hidden>Nenhum artigo corresponde a essa busca. <button class="archive__clear" type="button">Limpar filtros</button></p>`
        : `<div class="empty">
        <h2 class="empty__title">${esc(b.emptyTitle)}</h2>
        <p class="empty__text">${esc(b.emptyText)}</p>
        <ul class="empty__list">${b.planned.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <a class="btn btn--gold" href="/contato/#orcamento">Tirar dúvidas com a engenheira</a>
      </div>`
    }
  </div>
</section>

${ctaBand(b.contact, b.ctaTitle ?? 'Precisa de orientação sobre a sua edificação?', b.ctaText ?? 'Descreva a atividade exercida e a situação atual do imóvel para receber uma avaliação técnica preliminar.')}`;
}

/* ============================ ARTIGO ============================ */

/** `seed` é o post que originou a rota; usado quando a API não devolve mais esse slug. */
export function post(b, slug, seed) {
  const posts = b.posts ?? [];
  const a = posts.find((p) => p.slug === slug) ?? seed;
  if (!a) throw new Error(`[blog] artigo "${slug}" não encontrado nem na API nem no seed local`);
  const related = posts.filter((p) => p.slug !== slug).slice(0, 2);

  return `
<article class="article">
  <header class="phead phead--article">
    <div class="wrap wrap--narrow">
      <a class="phead__back" href="/blog/">${arrow(14, true)}Voltar para os artigos</a>
      <h1 class="phead__title phead__title--article">${esc(a.title)}</h1>
      <p class="phead__lead">${esc(a.excerpt)}</p>
      <div class="article__meta">
        ${tagsOf(a).map((t) => `<span class="article__tag">#${esc(t)}</span>`).join('')}${tagsOf(a).length ? `<span class="post__dot" aria-hidden="true"></span>` : ''}
        <time datetime="${esc(a.date)}">${esc(a.dateLabel)}</time>
        ${a.readTime ? `<span class="post__dot" aria-hidden="true"></span><span>${esc(a.readTime)}</span>` : ''}
        <span class="post__dot" aria-hidden="true"></span><span>Ayla Gotelip · Engenheira responsável</span>
      </div>
    </div>
  </header>

  <div class="wrap wrap--narrow">
    <div class="prose">${a.body}</div>
  </div>
</article>

${
  related.length
    ? `<section class="section section--alt">
  <div class="wrap wrap--narrow">
    <div class="section__header">
      <h2 class="section__title">Outros artigos</h2>
    </div>
    <div class="posts">${related.map((p) => postCard(p)).join('')}</div>
  </div>
</section>`
    : ''
}

${ctaBand(b.contact, 'Dúvida sobre a situação da sua edificação?', 'Descreva a atividade exercida e o estado atual do imóvel para receber uma avaliação técnica preliminar.')}`;
}

export function articleJsonLd(a, route) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    datePublished: a.date,
    dateModified: a.date,
    inLanguage: 'pt-BR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': route },
    author: { '@type': 'Person', name: 'Ayla Gotelip', jobTitle: 'Engenheira responsável' },
    publisher: { '@type': 'Organization', name: 'Gotelip Engenharia', '@id': 'https://gotelipengenharia.com/#business' },
  })}<\/script>`;
}

/* ============================ CONTATO ============================ */

export function contato(b) {
  const c = b.contact;
  return `
${pageHead(b.title, b.lead, 'Canais de atendimento')}

<section class="section">
  <div class="wrap contact">
    <div class="contact__info">
      <h2 class="section__title">Dados de atendimento</h2>
      <dl class="infos">
        <div class="infos__item">${icon('phone')}<div><dt>Telefone e WhatsApp</dt><dd><a href="tel:+${esc(c.phoneDigits)}">${esc(c.phone)}</a></dd></div></div>
        <div class="infos__item">${icon('mail')}<div><dt>E-mail</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd></div></div>
        <div class="infos__item">${icon('pin')}<div><dt>Endereço</dt><dd>${esc(c.address)}<br />${esc(c.city)}, ${esc(c.state)} · CEP ${esc(c.zip)}</dd></div></div>
        <div class="infos__item">${icon('clock')}<div><dt>Atendimento</dt><dd>${esc(c.hours)}</dd></div></div>
      </dl>
      <p class="contact__legal">CNPJ ${esc(c.cnpj)}${c.crea ? ` · ${esc(c.crea)}` : ''}</p>
      <a class="btn btn--gold" href="https://wa.me/${esc(c.phoneDigits)}" target="_blank" rel="noopener">Conversar no WhatsApp</a>
    </div>
    <div class="contact__form">
      <div class="contact__bridge">
        <div class="contact__bridge-icon">${icon('blueprint')}</div>
        <div class="contact__bridge-body">
          <h2 class="contact__bridge-title">Precisa de orçamento técnico?</h2>
          <p class="contact__bridge-text">Para projetos de prevenção e combate a incêndio (PPCI/AVCB), laudos, eventos ou brigada, use nossa triagem inteligente com enquadramento normativo.</p>
        </div>
        <a class="btn btn--gold btn--block" href="/orcamento/">Acessar formulário de orçamento técnico</a>
      </div>

      <div class="contact__direct">
        <h3 class="contact__direct-title">Ou envie uma mensagem direta</h3>
        ${leadForm()}
      </div>
    </div>
  </div>
</section>
`;
}

/* ============================ ORÇAMENTO ============================ */

export function orcamento(b) {
  const c = b.contact;
  return `
<section class="phead phead--light orcamento-phead">
  <div class="wrap">
    <h1 class="phead__title">Solicitar orçamento técnico</h1>
    <p class="phead__lead">Triagem inteligente para enquadramento nas normas do Corpo de Bombeiros Militar de Minas Gerais (CBMMG). Avaliação direta da engenheira responsável em até 24 horas úteis.</p>
    <div class="orcamento-phead__pills">
      <span class="orcamento-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span>Sem custo inicial</span>
      </span>
      <span class="orcamento-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span>Retorno em até 24h úteis</span>
      </span>
      <span class="orcamento-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span>Engenheira CREA-MG com ART</span>
      </span>
      <span class="orcamento-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span>Conformidade CBMMG / Infoscip</span>
      </span>
    </div>
  </div>
</section>

<section class="section orcamento-section">
  <div class="wrap orcamento-wrap">
    <aside class="orcamento-aside">
      <div class="orcamento-aside__card">
        <div class="orcamento-aside__header">
          <h2 class="orcamento-aside__title">Como funciona a sua avaliação</h2>
          <p class="orcamento-aside__lead">Triagem técnica com enquadramento prévio perante as Instruções Técnicas do CBMMG, assegurando clareza de escopo, prazos e custos.</p>
        </div>

        <div class="orcamento-timeline" aria-label="Etapas da avaliação técnica">
          <div class="orcamento-timeline__item">
            <div class="orcamento-timeline__marker" aria-hidden="true">01</div>
            <div class="orcamento-timeline__content">
              <strong class="orcamento-timeline__title">Triagem das características</strong>
              <p class="orcamento-timeline__text">Análise de área construída, ocupação e grau de risco conforme as ITs do CBMMG.</p>
            </div>
          </div>
          <div class="orcamento-timeline__item">
            <div class="orcamento-timeline__marker" aria-hidden="true">02</div>
            <div class="orcamento-timeline__content">
              <strong class="orcamento-timeline__title">Proposta com escopo definido</strong>
              <p class="orcamento-timeline__text">Retorno em até 24 horas úteis com orçamento detalhado, prazos reais e ART/CREA inclusa.</p>
            </div>
          </div>
          <div class="orcamento-timeline__item">
            <div class="orcamento-timeline__marker" aria-hidden="true">03</div>
            <div class="orcamento-timeline__content">
              <strong class="orcamento-timeline__title">Protocolo Infoscip ou vistoria</strong>
              <p class="orcamento-timeline__text">Tramitação digital direta perante o Corpo de Bombeiros ou agendamento de medição in loco.</p>
            </div>
          </div>
        </div>

        <div class="orcamento-trust">
          <div class="orcamento-trust__item">
            <div class="orcamento-trust__icon">${icon('shield')}</div>
            <div class="orcamento-trust__info">
              <strong>CREA-MG Habilitada</strong>
              <span>Engenheira Civil e de Segurança</span>
            </div>
          </div>
          <div class="orcamento-trust__item">
            <div class="orcamento-trust__icon">${icon('blueprint')}</div>
            <div class="orcamento-trust__info">
              <strong>ART Inclusa</strong>
              <span>Anotação de Responsabilidade Técnica</span>
            </div>
          </div>
          <div class="orcamento-trust__item">
            <div class="orcamento-trust__icon">${icon('clock')}</div>
            <div class="orcamento-trust__info">
              <strong>Retorno em até 24h</strong>
              <span>Diagnóstico técnico ágil e sem custo</span>
            </div>
          </div>
          <div class="orcamento-trust__item">
            <div class="orcamento-trust__icon">${icon('building')}</div>
            <div class="orcamento-trust__info">
              <strong>Cadastrada no CBMMG</strong>
              <span>Habilitada no sistema Infoscip</span>
            </div>
          </div>
        </div>

        <div class="orcamento-aside__help">
          <div class="orcamento-aside__help-head">
            <div class="orcamento-aside__help-icon">${icon('phone')}</div>
            <div>
              <h3 class="orcamento-aside__help-title">Prazo de notificação correndo?</h3>
              <p class="orcamento-aside__help-text">Se você recebeu fiscalização recente do CBMMG com prazo em aberto, o canal direto por WhatsApp agiliza o diagnóstico emergencial.</p>
            </div>
          </div>
          <a class="btn btn--gold btn--block" href="https://wa.me/${esc(c.phoneDigits)}" target="_blank" rel="noopener">
            <span>Falar no WhatsApp com a engenheira</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </aside>
    <div class="orcamento-form-col">
      ${adaptiveForm()}
    </div>
  </div>
</section>
`;
}

export function faqJsonLd(faq) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  })}<\/script>`;
}
