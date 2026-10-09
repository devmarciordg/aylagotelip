/**
 * Primitivas compartilhadas e cabeçalho/rodapé de todas as páginas.
 * Sem template engine: funções que devolvem string bastam e o bundle
 * público fica com zero JavaScript de conteúdo.
 */

import { readFileSync } from 'node:fs';
import { imgSize } from './imgsize.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Ícones desenhados, traço 1.5, grade 24. Nada de emoji. */
const ICONS = {
  blueprint: '<path d="M3 5.5 12 3l9 2.5v13L12 21l-9-2.5z"/><path d="M12 3v18"/><path d="M7 8.5h3M7 12h3M14 12h3M14 15.5h3"/>',
  stamp: '<path d="M9 3.5h6a2 2 0 0 1 2 2.3l-.7 4.7a1 1 0 0 0 1 1.2h.7a2 2 0 0 1 2 2v1.8H4v-1.8a2 2 0 0 1 2-2h.7a1 1 0 0 0 1-1.2L7 5.8a2 2 0 0 1 2-2.3Z"/><path d="M4 19.5h16"/>',
  clipboard: '<path d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15"/><rect x="9" y="2.5" width="6" height="4" rx="1"/><path d="M9 11.5h6M9 15h4"/>',
  wrench: '<path d="M15.2 3.4a5.5 5.5 0 0 0-6.6 7.1L3 16.1V21h4.9l5.6-5.6a5.5 5.5 0 0 0 7.1-6.6l-3.2 3.2-2.8-.7-.7-2.8z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
  scale: '<path d="M12 3v18M7 21h10"/><path d="M12 6 5 8.5 2.5 15h9L9 8.5M12 6l7 2.5L21.5 15h-9L15 8.5"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
  pin: '<path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5Z"/><circle cx="12" cy="10" r="2.75"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
};

/** Seta direcional inline. `back` inverte para a esquerda. */
export const arrow = (size = 16, back = false) =>
  `<svg class="arrow${back ? ' arrow--back' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;

export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ICONS.clipboard}</svg>`;

/**
 * Renderiza imagem real se for caminho válido, ou slot com aviso de pendência
 * se for texto descritivo.
 *
 * `alt` é obrigatório para imagem real: um alt genérico repetido em todas as
 * fotos não descreve nada e é pior que ausente para quem usa leitor de tela.
 * `priority` marca a imagem da primeira dobra — ela carrega adiantada e nunca
 * `lazy`, porque é o elemento de LCP.
 */
export const slot = (srcOrText, className = '', alt = '', priority = false) => {
  if (typeof srcOrText === 'string' && (srcOrText.startsWith('/') || srcOrText.startsWith('http') || /\.(webp|png|jpe?g|svg)$/i.test(srcOrText))) {
    if (!alt) throw new Error(`[slot] imagem sem alt: ${srcOrText}`);
    const size = imgSize(srcOrText);
    return `<div class="slot-frame ${className}"><img class="slot-img" src="${esc(srcOrText)}" alt="${esc(alt)}"${
      size ? ` width="${size.width}" height="${size.height}"` : ''
    }${priority ? ' loading="eager" fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"'} /></div>`;
  }
  return `<div class="slot ${className}" role="img" aria-label="${esc(srcOrText)}"><span class="slot__tag">Foto pendente</span><span class="slot__text">${esc(srcOrText)}</span></div>`;
};

const NAV = [
  { href: '/', label: 'Início', key: 'home' },
  { href: '/sobre/', label: 'Sobre', key: 'sobre' },
  { href: '/servicos/', label: 'Soluções', key: 'servicos' },
  { href: '/projetos/', label: 'Projetos', key: 'projetos' },
  { href: '/blog/', label: 'Blog', key: 'blog' },
  { href: '/contato/', label: 'Contato', key: 'contato' },
];

/* Itens do mega menu. O gatilho é sempre um link real: sem estado ARIA para
   sincronizar, sem JavaScript, abre no hover e no :focus-within. */
const MENU = [
  {
    href: '/servicos/',
    label: 'Serviços',
    key: 'servicos',
    panel: {
      items: [
        { href: '/servicos/projetos/', icon: 'blueprint', title: 'Projetos técnicos (PPCI)', text: 'Dimensionamento conforme normas do CBMMG.' },
        { href: '/servicos/consultoria/', icon: 'target', title: 'Consultoria de riscos', text: 'Auditorias preventivas e laudos com ART.' },
        { href: '/servicos/brigada/', icon: 'shield', title: 'Treinamento de brigada', text: 'Instrução prática e simulados de emergência.' },
        { href: '/servicos/inss/', icon: 'scale', title: 'INSS de obra e CND', text: 'Redução legal e regularização na Receita Federal.' },
        { href: '/servicos/eventos/', icon: 'pin', title: 'Eventos temporários', text: 'Feiras, shows e rodeios com estrutura desmontável.' },
        { href: '/servicos/avaliacao-imoveis/', icon: 'building', title: 'Avaliação de imóveis', text: 'Laudo de conformidade para compra, venda e locação.' },
      ],
      aside: {
        title: 'Notificação do Corpo de Bombeiros?',
        text: 'Envie as exigências da notificação para receber uma avaliação preliminar dos procedimentos.',
        cta: { href: '/orcamento/?servico=consultoria', label: 'Pedir avaliação técnica' },
      },
    },
  },
  { href: '/projetos/', label: 'Projetos', key: 'projetos' },
  { href: '/blog/', label: 'Blog', key: 'blog' },
  { href: '/sobre/', label: 'Sobre', key: 'sobre' },
  { href: '/contato/', label: 'Contato', key: 'contato' },
];

const chevron =
  '<svg class="nav__chev" width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden="true"><path d="M1.2 1.2 6 5.8l4.8-4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const megaPanel = (p) => `
        <div class="mega">
          <div class="mega__inner">
            <div class="mega__items">
              ${p.items
                .map(
                  (i) => `<a class="mega__item" href="${i.href}">
                <span class="mega__icon">${icon(i.icon)}</span>
                <span class="mega__text"><strong>${esc(i.title)}</strong><em>${esc(i.text)}</em></span>
              </a>`,
                )
                .join('\n              ')}
            </div>
            ${
              p.aside
                ? `<aside class="mega__aside">
              <p class="mega__asideTitle">${esc(p.aside.title)}</p>
              <p class="mega__asideText">${esc(p.aside.text)}</p>
              <a class="btn btn--gold btn--sm" href="${p.aside.cta.href}">${esc(p.aside.cta.label)}</a>
            </aside>`
                : ''
            }
          </div>
        </div>`;

export function topBar() {
  return `
<aside class="top-bar">
  <div class="wrap top-bar__inner">
    <div class="top-bar__left">
      <span class="top-bar__badge">Atendimento Técnico</span>
      <span class="top-bar__msg">Projetos de combate a incêndio e regularização em Governador Valadares e região</span>
    </div>
    <a class="top-bar__link" href="https://wa.me/553391456937" target="_blank" rel="noopener">
      <span>Falar com a engenheira no WhatsApp</span>
      <svg class="top-bar__arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
  </div>
</aside>`;
}

export function header(page) {
  return `
${topBar()}
<header class="head" id="topo">
  <div class="wrap head__bar">
    <a class="logo" href="/" aria-label="Gotelip Engenharia, página inicial">
      <img src="/logo.svg" alt="Gotelip Engenharia" width="168" height="40" />
    </a>

    <button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">
      <span class="burger__line"></span><span class="burger__line"></span><span class="burger__line"></span>
    </button>

    <nav class="nav" id="nav">
      <ul class="nav__list">
        ${MENU.map(
          (n) => `<li class="nav__item${n.panel ? ' nav__item--mega' : ''}">
          <a class="nav__link" href="${n.href}"${n.key === page ? ' aria-current="page"' : ''}>${n.label}${n.panel ? chevron : ''}</a>${n.panel ? megaPanel(n.panel) : ''}
        </li>`,
        ).join('\n        ')}
      </ul>
      <a class="btn btn--gold btn--sm nav__cta" href="/orcamento/">Solicitar orçamento</a>
    </nav>
  </div>
</header>`;
}

/** Faixa de topo das páginas internas. */
export function pageHead(title, lead, tag = '', extraClass = '') {
  return `
<section class="phead${extraClass ? ` ${extraClass}` : ''}">
  <div class="wrap">
    ${tag ? `<span class="badge badge--gold phead__eyebrow">${esc(tag)}</span>` : ''}
    <h1 class="phead__title">${esc(title)}</h1>
    ${lead ? `<p class="phead__lead">${esc(lead)}</p>` : ''}
  </div>
</section>`;
}

export function faqSection(title, items) {
  if (!items || !items.length) return '';
  return `
<section class="section section--faq" id="faq">
  <div class="wrap wrap--narrow">
    <div class="section__header text-center">
      <h2 class="section__title section__title--center">${esc(title || 'Perguntas frequentes')}</h2>
      <p class="section__intro section__intro--center">Informações práticas sobre regularização, documentação e exigências do Corpo de Bombeiros.</p>
    </div>
    <div class="faq">
      ${items
        .map(
          (f, idx) => `
      <details class="faq__item"${idx === 0 ? ' open' : ''}>
        <summary class="faq__q">${esc(f.q)}</summary>
        <div class="faq__a"><p>${esc(f.a)}</p></div>
      </details>`,
        )
        .join('')}
    </div>
  </div>
</section>`;
}

export function ctaBand(c, title, text) {
  return `
<section class="cta cta--band" id="orcamento">
  <div class="wrap cta__band">
    <div class="cta__content">
      <h2 class="cta__title">${esc(title)}</h2>
      <p class="cta__text">${esc(text)}</p>
      <div class="cta__trust">
        <span>✓ Avaliação inicial sem custo</span>
        <span>✓ Atendimento com hora marcada</span>
        <span>✓ Atuação em Governador Valadares e região</span>
      </div>
    </div>
    <div class="cta__actions">
      <a class="btn btn--gold btn--lg" href="https://wa.me/${esc(c.phoneDigits)}" target="_blank" rel="noopener">
        <span>Conversar no WhatsApp</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
      <a class="btn btn--ghost btn--lg" href="/orcamento/">Solicitar proposta comercial</a>
    </div>
  </div>
</section>`;
}

/**
 * Questionários por serviço, na mesma fonte que a API usa para validar o envio.
 * Schema em dois arquivos divergiria: o site mostraria campo que a API recusa.
 */
export const FORMS = JSON.parse(
  readFileSync(new URL('../../backend/shared/forms.json', import.meta.url), 'utf8'),
);

/** @returns {[string, object]|undefined} par [chave, schema] do serviço, se houver. */
export const formOf = (slug) =>
  Object.entries(FORMS).find(([k, f]) => k[0] !== '_' && [].concat(f.service ?? []).includes(slug));

function campo(f) {
  const req = f.required ? ' required' : '';
  const marca = f.required
    ? ' <span class="field__req" aria-hidden="true" title="Obrigatório">*</span>'
    : ' <span class="field__opt">(opcional)</span>';
  const meia = f.half ? ' field--half' : '';

  if (f.type === 'radio') {
    const opcoes = [...f.options.map((o) => ({ v: o, t: o })), ...(f.other ? [{ v: '__outro__', t: 'Outro' }] : [])];
    // Sim/Não não merece uma linha inteira cada; pergunta com opção longa, sim.
    const curtas = opcoes.every((o) => o.t.length <= 16);
    return `
    <fieldset class="field field--choice">
      <legend class="field__label">${esc(f.label)}${marca}</legend>
      <div class="choices${curtas ? ' choices--inline' : ''}">
        ${opcoes
          .map(
            (o, i) => `
        <label class="choice">
          <input type="radio" name="${esc(f.id)}" value="${esc(o.v)}"${i === 0 ? req : ''} />
          <span class="choice__mark" aria-hidden="true"></span>
          <span class="choice__text">${esc(o.t)}</span>
        </label>`,
          )
          .join('')}
      </div>
      ${
        f.other
          ? `<input class="field__input field__input--other" type="text" name="${esc(f.id)}__outro"
        placeholder="Se marcou “Outro”, especifique aqui" aria-label="${esc(f.label)}: especifique aqui" />`
          : ''
      }
    </fieldset>`;
  }

  if (f.type === 'textarea') {
    return `
    <label class="field${meia}"><span class="field__label">${esc(f.label)}${marca}</span>
      <textarea class="field__input" name="${esc(f.id)}" rows="3"${req}></textarea></label>`;
  }

  const inputmode = f.type === 'number' ? ' inputmode="decimal"' : '';
  return `
    <label class="field${meia}"><span class="field__label">${esc(f.label)}${marca}</span>
      <input class="field__input" type="${f.type === 'number' ? 'text' : esc(f.type)}"
        name="${esc(f.id)}"${inputmode}${req} /></label>`;
}

/**
 * Formulário de um serviço específico. `data-form` diz à API qual schema validar.
 *
 * Os campos vêm agrupados pelo próprio schema (`group`): 17 a 20 perguntas numa lista
 * corrida lêem como papelada, e quem chega notificado abandona. Em blocos nomeados o
 * visitante vê do que se trata cada trecho e quanto falta.
 */
const BRANCH_MAP = {
  projetos: 'ppci',
  consultoria: 'consultoria',
  eventos: 'eventos',
  brigada: 'brigada',
  inss: 'inss',
  'avaliacao-imoveis': 'avaliacao',
  avaliacao: 'avaliacao',
};

/**
 * Soluções complementares: uma lista só, consumida pelo hub de serviços e pelo
 * questionário. O `slug` é o que liga o cartão ao rádio já marcado no formulário
 * (`/orcamento/?servico=<slug>`), então duas listas divergiriam em silêncio.
 */
export const EXTRAS = [
  { slug: 'acessibilidade', icon: 'scale', title: 'Laudo de acessibilidade (NBR 9050)' },
  { slug: 'pae', icon: 'clipboard', title: 'Plano de atendimento de emergência (PAE)' },
  { slug: 'vigilancia-sanitaria', icon: 'shield', title: 'Adequação para Vigilância Sanitária' },
  { slug: 'alarme-wireless', icon: 'wrench', title: 'Alarme de incêndio wireless' },
  { slug: 'mapeamento-riscos', icon: 'target', title: 'Gestão e mapeamento de riscos' },
];

const BRANCHES = [
  {
    id: 'ppci',
    title: 'Projeto Técnico (PPCI / AVCB)',
    desc: 'Obtenção ou renovação de AVCB/CLCB, obra nova ou ampliação.',
    icon: 'blueprint',
  },
  {
    id: 'consultoria',
    title: 'Notificação CBMMG / Consultoria',
    desc: 'Adequações, resposta a autos dos bombeiros e laudos com ART.',
    icon: 'target',
  },
  {
    id: 'eventos',
    title: 'Eventos Temporários',
    desc: 'Licenciamento provisório de shows, feiras e estruturas móveis.',
    icon: 'stamp',
  },
  {
    id: 'brigada',
    title: 'Treinamento de Brigada',
    desc: 'Capacitação teórica e prática conforme a IT 12 do CBMMG.',
    icon: 'shield',
  },
  {
    id: 'inss',
    title: 'Redução de INSS de Obra',
    desc: 'Aferição no SERO da Receita Federal para averbação em cartório.',
    icon: 'scale',
  },
  {
    id: 'avaliacao',
    title: 'Avaliação Técnica de Imóvel',
    desc: 'Laudo de conformidade de segurança para compra, venda, locação ou due diligence.',
    icon: 'building',
  },
  {
    id: 'complementar',
    title: 'Soluções Complementares',
    desc: 'Acessibilidade, PAE, vigilância sanitária, alarme e mapeamento de riscos.',
    icon: 'clipboard',
  },
  {
    id: 'outro',
    title: 'Outra Demanda Técnica',
    desc: 'Esclarecimentos gerais, assessoria ou demandas personalizadas.',
    icon: 'clipboard',
  },
];

function adaptiveRadio(id, label, options, isHalf = false, hasOther = false, disabled = false) {
  const req = ' required';
  const dis = disabled ? ' disabled' : '';
  const meia = isHalf ? ' field--half' : '';
  const curtas = options.every((o) => o.length <= 16);
  return `
    <fieldset class="field field--choice${meia}">
      <legend class="field__label">${esc(label)} <span class="field__req" aria-hidden="true">*</span></legend>
      <div class="choices${curtas ? ' choices--inline' : ''}">
        ${options
          .map(
            (o, idx) => `
        <label class="choice">
          <input type="radio" name="${esc(id)}" value="${esc(o)}"${idx === 0 ? req : ''}${dis} />
          <span class="choice__mark" aria-hidden="true"></span>
          <span class="choice__text">${esc(o)}</span>
        </label>`,
          )
          .join('')}
        ${
          hasOther
            ? `
        <label class="choice">
          <input type="radio" name="${esc(id)}" value="__outro__"${dis} />
          <span class="choice__mark" aria-hidden="true"></span>
          <span class="choice__text">Outro</span>
        </label>`
            : ''
        }
      </div>
      ${
        hasOther
          ? `
      <input class="field__input field__input--other" type="text" name="${esc(id)}__outro"
        placeholder="Se marcou “Outro”, especifique aqui" aria-label="${esc(label)}: especifique aqui"${dis} />`
          : ''
      }
    </fieldset>`;
}

function adaptiveInput(id, label, type = 'text', placeholder = '', isRequired = false, isHalf = false, disabled = false, autocomplete = '') {
  const req = isRequired ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const meia = isHalf ? ' field--half' : '';
  const marca = isRequired
    ? ' <span class="field__req" aria-hidden="true">*</span>'
    : ' <span class="field__opt">(opcional)</span>';
  const inputmode = type === 'tel' ? ' inputmode="tel"' : type === 'number' ? ' inputmode="decimal"' : '';
  const auto = autocomplete ? ` autocomplete="${autocomplete}"` : '';

  return `
    <label class="field${meia}"><span class="field__label">${esc(label)}${marca}</span>
      <input class="field__input" type="${esc(type)}" name="${esc(id)}" placeholder="${esc(placeholder)}"${auto}${inputmode}${req}${dis} /></label>`;
}

function adaptiveTextarea(id, label, placeholder = '', rows = 3, isRequired = false, isHalf = false, disabled = false) {
  const req = isRequired ? ' required' : '';
  const dis = disabled ? ' disabled' : '';
  const meia = isHalf ? ' field--half' : '';
  const marca = isRequired
    ? ' <span class="field__req" aria-hidden="true">*</span>'
    : ' <span class="field__opt">(opcional)</span>';

  return `
    <label class="field${meia}"><span class="field__label">${esc(label)}${marca}</span>
      <textarea class="field__input" name="${esc(id)}" rows="${rows}" placeholder="${esc(placeholder)}"${req}${dis}></textarea></label>`;
}

function renderBranchPpci(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="ppci"${active ? '' : ' hidden'}>
    ${adaptiveRadio('ppci_tipo_imovel', 'Tipo de imóvel ou ocupação', [
      'Comércio / Loja',
      'Galpão / Indústria',
      'Condomínio Residencial',
      'Clínica / Escola / Serviços',
    ], false, true, dis)}
    ${adaptiveRadio('ppci_situacao', 'Situação perante o Corpo de Bombeiros', [
      'Construção nova ou obra futura',
      'Imóvel existente sem AVCB / PPCI',
      'Renovação de AVCB vencido ou a vencer',
      'Reforma / Ampliação de área construída',
    ], false, false, dis)}
    ${adaptiveInput('ppci_area', 'Área construída aproximada (m²)', 'text', 'Ex.: 450 m²', false, false, dis)}
    ${adaptiveRadio('ppci_pavimentos', 'Número de pavimentos ou altura', [
      'Térreo apenas (1 piso)',
      '2 a 3 pavimentos',
      'Mais de 3 pavimentos (acima de 12m)',
    ], false, false, dis)}
  </div>`;
}

function renderBranchConsultoria(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="consultoria"${active ? '' : ' hidden'}>
    ${adaptiveRadio('consultoria_notificacao', 'Recebeu notificação ou auto do CBMMG?', [
      'Sim — com prazo em aberto para regularizar',
      'Sim — prazo já expirado / urgente',
      'Não — vistoria preventiva ou laudo espontâneo',
    ], false, false, dis)}
    ${adaptiveInput('consultoria_prazo', 'Número do auto ou prazo limite (se houver)', 'text', 'Ex.: Notificação nº 123 / Prazo: 30 dias', false, true, dis)}
    ${adaptiveInput('consultoria_area', 'Área aproximada do imóvel (m²)', 'text', 'Ex.: 320 m²', false, true, dis)}
    ${adaptiveRadio('consultoria_foco', 'Principal pendência ou objetivo técnico', [
      'Defesa técnica / Resposta a notificação do CBMMG',
      'Laudo técnico de vistoria e conformidade com ART',
      'Adequação de extintores, hidrantes e rotas de fuga',
      'Avaliação prévia antes de compra ou locação de imóvel',
    ], false, false, dis)}
  </div>`;
}

function renderBranchEventos(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="eventos"${active ? '' : ' hidden'}>
    ${adaptiveRadio('eventos_tipo', 'Tipo de evento temporário', [
      'Show / Festival musical / Festa',
      'Feira comercial / Exposição / Convenção',
      'Evento esportivo ou religioso',
    ], false, true, dis)}
    ${adaptiveRadio('eventos_publico', 'Público máximo simultâneo estimado', [
      'Até 250 pessoas',
      '251 a 1.000 pessoas',
      'Mais de 1.000 pessoas',
    ], false, false, dis)}
    ${adaptiveInput('eventos_data', 'Data ou período previsto para o evento', 'text', 'Ex.: 20 a 22 de Outubro / Daqui a 30 dias', false, false, dis)}
    ${adaptiveRadio('eventos_estruturas', 'Estruturas que serão montadas', [
      'Palco, iluminação e sonorização',
      'Tendas e coberturas desmontáveis',
      'Arquibancadas ou camarotes elevados',
      'Geradores / Instalações elétricas móveis',
      'Nenhuma estrutura especial (espaço já edificado)',
    ], false, false, dis)}
  </div>`;
}

function renderBranchBrigada(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="brigada"${active ? '' : ' hidden'}>
    ${adaptiveRadio('brigada_tipo', 'Tipo de treinamento de brigada', [
      'Formação inicial de nova brigada (IT 12)',
      'Reciclagem periódica anual',
    ], false, false, dis)}
    ${adaptiveRadio('brigada_participantes', 'Número aproximado de brigadistas', [
      'Até 10 brigadistas',
      '11 a 20 brigadistas',
      'Mais de 20 brigadistas',
    ], false, false, dis)}
    ${adaptiveRadio('brigada_local', 'Local pretendido para o treinamento', [
      'Na sede da própria empresa (In company)',
      'Em espaço de treinamento indicado pela Gotelip',
    ], false, false, dis)}
  </div>`;
}

function renderBranchInss(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="inss"${active ? '' : ' hidden'}>
    ${adaptiveRadio('inss_tipo_fase', 'Fase da obra e destinação', [
      'Obra já concluída (busca de CND para averbação em cartório)',
      'Obra em andamento (planejamento tributário)',
      'Residencial unifamiliar (casa própria)',
      'Comercial, galpão industrial ou edifício multifamiliar',
    ], false, false, dis)}
    ${adaptiveInput('inss_area', 'Área construída total da obra (m²)', 'text', 'Ex.: 280 m²', false, false, dis)}
    ${adaptiveRadio('inss_documentos', 'Situação das notas fiscais e comprovantes', [
      'Possuo notas fiscais de materiais e contratações guardadas',
      'Possuo apenas parte dos comprovantes de compra',
      'Praticamente nenhuma nota / obra por autoconstrução',
    ], false, false, dis)}
  </div>`;
}

function renderBranchAvaliacao(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="avaliacao"${active ? '' : ' hidden'}>
    ${adaptiveRadio('avaliacao_objetivo', 'Objetivo da avaliação', [
      'Compra de imóvel — due diligence antes da escritura',
      'Venda de imóvel — laudo para negociação',
      'Locação — vistoria prévia à assinatura do contrato',
      'Renovação de seguro ou auditoria por seguradora',
    ], false, false, dis)}
    ${adaptiveRadio('avaliacao_tipo_imovel', 'Tipo do imóvel a ser avaliado', [
      'Comércio / Loja / Escritório',
      'Galpão / Indústria',
      'Condomínio Residencial Multifamiliar',
      'Clínica / Escola / Serviços',
    ], false, true, dis)}
    ${adaptiveInput('avaliacao_area', 'Área aproximada do imóvel (m²)', 'text', 'Ex.: 350 m²', false, false, dis)}
    ${adaptiveRadio('avaliacao_avcb', 'Situação atual perante o CBMMG', [
      'Possui AVCB / CLCB vigente',
      'AVCB vencido ou nunca obtido',
      'Não sei informar',
    ], false, false, dis)}
  </div>`;
}

function renderBranchComplementar(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="complementar"${active ? '' : ' hidden'}>
    <fieldset class="field field--choice">
      <legend class="field__label">Qual solução complementar você precisa? <span class="field__req" aria-hidden="true">*</span></legend>
      <div class="choices">
        ${EXTRAS.map(
          (e, idx) => `
        <label class="choice">
          <input type="radio" name="complementar_servico" value="${esc(e.title)}" data-slug="${esc(e.slug)}"${idx === 0 ? ' required' : ''}${dis ? ' disabled' : ''} />
          <span class="choice__mark" aria-hidden="true"></span>
          <span class="choice__text">${esc(e.title)}</span>
        </label>`,
        ).join('')}
      </div>
    </fieldset>
    ${adaptiveTextarea('complementar_descricao', 'Descreva o imóvel e a exigência recebida', 'Ex.: clínica de 220 m² — a vigilância sanitária exigiu laudo de acessibilidade para renovar o alvará.', 3, false, false, dis)}
  </div>`;
}

function renderBranchOutro(active) {
  const dis = !active;
  return `
  <div class="branch-panel" data-branch="outro"${active ? '' : ' hidden'}>
    ${adaptiveTextarea('outro_descricao', 'Descreva a sua demanda ou dúvida técnica', 'Descreva o seu imóvel, a sua empresa ou a sua necessidade técnica perante o Corpo de Bombeiros...', 3, true, false, dis)}
  </div>`;
}

export function adaptiveForm(slug = '') {
  const initialBranch = BRANCH_MAP[slug] ?? (slug ? slug : '');
  const hasInitial = Boolean(initialBranch);

  const PASSOS = [
    { n: 1, label: 'Serviço' },
    { n: 2, label: 'Detalhes' },
    { n: 3, label: 'Observações' },
    { n: 4, label: 'Contato' },
  ];

  return `
<form class="form form--adaptive form--wizard" id="lead-form" novalidate data-form="adaptativo"${hasInitial ? ` data-initial-branch="${esc(initialBranch)}"` : ''}>
  <div class="wiz__head">
    <div class="wiz__rail" role="progressbar" aria-label="Progresso da triagem técnica" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1" aria-valuetext="Etapa 1 de 4: Serviço">
      ${PASSOS.map((p) => `<span class="wiz__seg" data-seg="${p.n}"><i class="wiz__seg-fill"></i></span>`).join('')}
    </div>
    <div class="wiz__meta">
      <p class="wiz__count">Etapa <b data-wiz-current>1</b> de 4 · <span data-wiz-label>Serviço</span></p>
      <button class="wiz__chip" type="button" data-wiz-chip hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span data-wiz-chip-text></span>
        <span class="wiz__chip-edit">alterar</span>
      </button>
    </div>
  </div>

  <div class="wiz__body">
  <fieldset class="form__step" data-step="1" id="etapa-demanda">
    <legend class="form__step-legend">
      <span class="form__step-title" tabindex="-1">Qual serviço você precisa?</span>
      <span class="form__step-hint">Escolha uma opção e mostramos apenas as perguntas certas para o seu caso.</span>
    </legend>
    <div class="adaptive-branches" role="radiogroup" aria-label="Selecione o serviço pretendido">
      ${BRANCHES.map(
        (b) => `
      <label class="branch-card${b.id === initialBranch ? ' branch-card--active' : ''}">
        <input type="radio" name="service_branch" value="${b.id}"${b.id === initialBranch ? ' checked' : ''} />
        <span class="branch-card__icon" aria-hidden="true">${icon(b.icon)}</span>
        <span class="branch-card__content">
          <strong class="branch-card__title">${esc(b.title)}</strong>
          <span class="branch-card__desc">${esc(b.desc)}</span>
        </span>
        <span class="branch-card__check" aria-hidden="true"></span>
      </label>`,
      ).join('')}
    </div>
  </fieldset>

  <fieldset class="form__step" data-step="2" id="etapa-detalhes" hidden>
    <legend class="form__step-legend">
      <span class="form__step-title" tabindex="-1">Detalhes técnicos da sua demanda</span>
      <span class="form__step-hint">Valores aproximados já bastam para o pré-enquadramento nas Instruções Técnicas do CBMMG.</span>
    </legend>
    <div class="adaptive-panels">
      ${renderBranchPpci(initialBranch === 'ppci')}
      ${renderBranchConsultoria(initialBranch === 'consultoria')}
      ${renderBranchEventos(initialBranch === 'eventos')}
      ${renderBranchBrigada(initialBranch === 'brigada')}
      ${renderBranchInss(initialBranch === 'inss')}
      ${renderBranchAvaliacao(initialBranch === 'avaliacao')}
      ${renderBranchComplementar(initialBranch === 'complementar')}
      ${renderBranchOutro(initialBranch === 'outro')}
    </div>
  </fieldset>

  <fieldset class="form__step" data-step="3" id="etapa-notas" hidden>
    <legend class="form__step-legend">
      <span class="form__step-title" tabindex="-1">Algo mais que a engenheira deva saber?</span>
      <span class="form__step-hint">Opcional. Prazos apertados, notificações anteriores ou dúvidas que queira antecipar.</span>
    </legend>
    <label class="field"><span class="field__label">Informações complementares <span class="field__opt">(opcional)</span></span>
      <textarea class="field__input" name="notes" rows="4" placeholder="Ex.: preciso do AVCB até o fim do mês por exigência do shopping."></textarea></label>
  </fieldset>

  <fieldset class="form__step" data-step="4" id="etapa-contato" hidden>
    <legend class="form__step-legend">
      <span class="form__step-title" tabindex="-1">Para onde enviamos o retorno?</span>
      <span class="form__step-hint">A engenheira Ayla Gotelip responde pessoalmente em até 24 horas úteis.</span>
    </legend>
    <div class="form__row">
      <label class="field"><span class="field__label">Nome completo ou empresa <span class="field__req" aria-hidden="true">*</span></span>
        <input class="field__input" name="name_company" required autocomplete="name" placeholder="Seu nome ou razão social" /></label>
      <label class="field"><span class="field__label">WhatsApp para retorno <span class="field__req" aria-hidden="true">*</span></span>
        <input class="field__input" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="(33) 99999-9999" /></label>
    </div>
    <div class="form__row">
      <label class="field"><span class="field__label">Cidade e UF <span class="field__opt">(opcional)</span></span>
        <input class="field__input" name="city" autocomplete="address-level2" placeholder="Ex.: Governador Valadares, MG" /></label>
      <label class="field"><span class="field__label">E-mail corporativo ou pessoal <span class="field__opt">(opcional)</span></span>
        <input class="field__input" name="email" type="email" autocomplete="email" placeholder="seu.email@exemplo.com.br" /></label>
    </div>
    <div class="form__security">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Avaliação técnica sem compromisso · Retorno em até 24h úteis · Emissão de ART perante o CREA-MG</span>
    </div>
  </fieldset>

  </div>

  <div class="wiz__foot">
    <button class="btn btn--secondary wiz__back" type="button" data-wiz-back hidden>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span>Voltar</span>
    </button>
    <button class="btn btn--gold wiz__next" type="button" data-wiz-next>
      <span>Continuar</span>
      <svg class="btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
    <button class="btn btn--gold wiz__send" type="submit" hidden>
      <span>Solicitar avaliação técnica</span>
      <svg class="btn__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
    <p class="form__status" role="status" aria-live="polite"></p>
  </div>
</form>`;
}

export function directContactForm() {
  return `
<form class="form form--direct" id="lead-form" novalidate>
  <div class="form__head">
    <span class="form__req-note"><span class="field__req" aria-hidden="true">*</span> Campos obrigatórios</span>
  </div>
  <div class="form__row">
    <label class="field"><span class="field__label">Nome completo ou empresa <span class="field__req" aria-hidden="true">*</span></span>
      <input class="field__input" name="name_company" required autocomplete="name" placeholder="Seu nome ou razão social" /></label>
    <label class="field"><span class="field__label">WhatsApp para retorno <span class="field__req" aria-hidden="true">*</span></span>
      <input class="field__input" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="(33) 99999-9999" /></label>
  </div>
  <div class="form__row">
    <label class="field"><span class="field__label">Cidade e UF <span class="field__opt">(opcional)</span></span>
      <input class="field__input" name="city" autocomplete="address-level2" placeholder="Ex.: Governador Valadares, MG" /></label>
    <label class="field"><span class="field__label">E-mail corporativo ou pessoal <span class="field__opt">(opcional)</span></span>
      <input class="field__input" name="email" type="email" autocomplete="email" placeholder="seu.email@exemplo.com.br" /></label>
  </div>
  <label class="field"><span class="field__label">Como podemos ajudar você ou sua empresa? <span class="field__req" aria-hidden="true">*</span></span>
    <textarea class="field__input" name="demand" rows="3" required placeholder="Descreva sua dúvida, necessidade ou agendamento de reunião..."></textarea></label>
  <label class="field"><span class="field__label">Informações complementares <span class="field__opt">(opcional)</span></span>
    <textarea class="field__input" name="notes" rows="2" placeholder="Prazos, horário de preferência ou detalhes adicionais."></textarea></label>
  <button class="btn btn--gold btn--block" type="submit">Enviar mensagem</button>
  <p class="form__note">Retorno em até 24 horas úteis. Seus dados estão seguros e não são compartilhados.</p>
  <p class="form__status" role="status" aria-live="polite"></p>
</form>`;
}

export function questionario(key, form) {
  return adaptiveForm(key);
}

export function leadForm() {
  return directContactForm();
}

export function footer(c) {
  const SOLUTIONS = [
    { href: '/servicos/projetos/', label: 'Projetos técnicos (PPCI)' },
    { href: '/servicos/consultoria/', label: 'Consultoria de riscos e laudos' },
    { href: '/servicos/brigada/', label: 'Treinamento de brigada' },
    { href: '/servicos/inss/', label: 'INSS de obra e CND' },
    { href: '/servicos/eventos/', label: 'Eventos temporários' },
  ];

  return `
<footer class="foot">
  <div class="wrap foot__grid">
    <div class="foot__brand">
      <img src="/logo.svg" alt="Gotelip Engenharia" width="190" height="45" />
      <p class="foot__desc">${esc(c.footerText)}</p>
      <p class="foot__note">${esc(c.hours)}</p>
      <p class="foot__note">CNPJ ${esc(c.cnpj)}${c.crea ? ` · ${esc(c.crea)}` : ''}</p>
    </div>
    <div class="foot__col">
      <h2 class="foot__title">Serviços</h2>
      ${SOLUTIONS.map((s) => `<p><a href="${s.href}">${s.label}</a></p>`).join('\n      ')}
    </div>
    <div class="foot__col">
      <h2 class="foot__title">Institucional</h2>
      ${NAV.map((n) => `<p><a href="${n.href}">${n.label}</a></p>`).join('\n      ')}
      <p><a href="/sobre/#faq">Perguntas frequentes</a></p>
    </div>
    <div class="foot__col">
      <h2 class="foot__title">Contato & Localização</h2>
      <p><a class="foot__link-highlight" href="tel:+${esc(c.phoneDigits)}">${esc(c.phone)}</a></p>
      <p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
      <p class="foot__address">${esc(c.address)}<br />${esc(c.city)}, ${esc(c.state)} · CEP ${esc(c.zip)}</p>
    </div>
  </div>
  <div class="wrap foot__bar">
    <small>© ${new Date().getFullYear()} Gotelip Engenharia. Todos os direitos reservados. Conformidade com as Instruções Técnicas do CBMMG.<br />Desenvolvido por <a class="foot__credit" href="https://marciordg.com" target="_blank" rel="noopener">RDG Developer</a></small>
  </div>
</footer>`;
}

export function jsonLd(meta, c, services) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': 'https://gotelipengenharia.com/#business',
    name: 'Gotelip Engenharia',
    description: meta.description,
    telephone: c.phone,
    email: c.email,
    url: 'https://gotelipengenharia.com/',
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.address,
      addressLocality: c.city,
      addressRegion: c.state,
      postalCode: c.zip,
      addressCountry: 'BR',
    },
    areaServed: { '@type': 'City', name: c.city },
    ...(services ? { knowsAbout: services.map((s) => s.title) } : {}),
  })}<\/script>`;
}
