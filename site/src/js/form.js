const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

const readCsrfCookie = () => document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/)?.[1] ?? '';

/** O token do double-submit é emitido pela API e reenviado no header. */
async function csrfToken() {
  const existing = readCsrfCookie();
  if (existing) return existing;
  const res = await fetch(`${API}/api/csrf`, { credentials: 'include' });
  if (!res.ok) throw new Error('csrf');
  return (await res.json()).token;
}

const MESSAGES = {
  rate_limited: 'Muitas tentativas seguidas. Aguarde 1 minuto para enviar novamente ou fale diretamente pelo WhatsApp.',
  campos_obrigatorios: 'Por favor, preencha todos os campos obrigatórios assinalados antes de enviar.',
  telefone_invalido: 'Informe um WhatsApp válido com DDD (ex.: (33) 99145-6937).',
  email_invalido: 'Informe um endereço de e-mail válido (ex.: seu.nome@empresa.com.br).',
  csrf: 'Sua sessão expirou por inatividade. Atualize a página e tente enviar novamente.',
};

/**
 * Formata telefone brasileiro com DDD dinamicamente no padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
 */
function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (!digits.length) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formulário adaptativo compila as respostas da branch ativa e formata
 * demanda, empreendimento e respostas para o CRM. Questionário legado
 * (`data-form` específico) envia `{ form, answers }`.
 */
function payload(form) {
  const bruto = Object.fromEntries(new FormData(form));
  const chave = form.dataset.form;

  // Formulário inteligente adaptativo
  if (form.classList.contains('form--adaptive') || chave === 'adaptativo') {
    const branch = bruto.service_branch || 'ppci';
    const branchTitles = {
      ppci: 'Projeto Técnico (PPCI / AVCB)',
      consultoria: 'Notificação CBMMG / Consultoria e Laudos',
      eventos: 'Licenciamento de Eventos Temporários',
      brigada: 'Treinamento de Brigada de Incêndio (IT 12)',
      inss: 'Redução de INSS de Obra e CND (SERO)',
      avaliacao: 'Avaliação Técnica de Imóvel',
      complementar: 'Solução Complementar',
      outro: 'Demanda Técnica Personalizada',
    };

    const branchTitle = branchTitles[branch] || 'Demanda Técnica';

    const enterprise =
      bruto.ppci_tipo_imovel ||
      bruto.consultoria_foco ||
      bruto.eventos_tipo ||
      bruto.inss_tipo_fase ||
      bruto.avaliacao_tipo_imovel ||
      bruto.complementar_servico ||
      (branch === 'brigada' ? 'Treinamento Corporativo de Brigada' : bruto.enterprise || 'Não especificado');

    let demand = branchTitle;
    if (bruto.ppci_situacao) demand += ` — ${bruto.ppci_situacao}`;
    else if (bruto.consultoria_notificacao) demand += ` — Notificação: ${bruto.consultoria_notificacao}`;
    else if (bruto.eventos_publico) demand += ` — Público: ${bruto.eventos_publico}`;
    else if (bruto.brigada_tipo) demand += ` — ${bruto.brigada_tipo}`;
    else if (bruto.inss_tipo_fase) demand += ` — ${bruto.inss_tipo_fase}`;
    else if (bruto.avaliacao_objetivo) demand += ` — ${bruto.avaliacao_objetivo}`;
    else if (bruto.complementar_servico) demand += ` — ${bruto.complementar_servico}`;
    else if (bruto.outro_descricao) demand += ` — ${bruto.outro_descricao.slice(0, 80)}`;

    const activePanel = form.querySelector(`.branch-panel[data-branch="${branch}"]`);
    const answers = { 'Serviço Selecionado': branchTitle };

    if (activePanel) {
      activePanel.querySelectorAll('input:checked, input[type="text"]:not([type="radio"]), textarea').forEach((el) => {
        if (!el.name || el.name === 'service_branch' || el.name.endsWith('__outro')) return;
        const fieldEl = el.closest('.field');
        const rawLabel = fieldEl?.querySelector('.field__label')?.textContent || el.name;
        const cleanLabel = rawLabel.replace(/\s*\*.*$/, '').replace(/\(opcional\)/, '').trim();

        let val = el.value.trim();
        if (val === '__outro__') {
          val = (bruto[`${el.name}__outro`] || 'Outro').trim();
        }
        if (val) {
          answers[cleanLabel] = val;
        }
      });
    }

    return {
      name_company: bruto.name_company || '',
      phone: bruto.phone || '',
      email: bruto.email || '',
      city: bruto.city || '',
      enterprise,
      demand,
      notes: bruto.notes || '',
      answers,
    };
  }

  if (!chave) return bruto;

  const answers = {};
  for (const [nome, valor] of Object.entries(bruto)) {
    if (nome.endsWith('__outro')) continue;
    answers[nome] = valor === '__outro__' ? (bruto[`${nome}__outro`] ?? '') : valor;
  }
  return { form: chave, answers };
}

export function initForm() {
  // Os CTAs levam ao formulário e põem o cursor no primeiro campo editável.
  document.querySelectorAll('[data-open-form]').forEach((el) =>
    el.addEventListener('click', () => {
      setTimeout(() => {
        document
          .querySelector(
            '#lead-form .form__step:not([hidden]) input:not([type="hidden"]):not([disabled]), #lead-form .form__step:not([hidden]) textarea:not([disabled])',
          )
          ?.focus();
      }, 400);
    }),
  );

  const form = document.getElementById('lead-form');
  if (!form) return;

  const SERVICE_TO_BRANCH = {
    projetos: 'ppci',
    ppci: 'ppci',
    avcb: 'ppci',
    consultoria: 'consultoria',
    laudos: 'consultoria',
    notificacao: 'consultoria',
    eventos: 'eventos',
    evento: 'eventos',
    brigada: 'brigada',
    inss: 'inss',
    sero: 'inss',
    cnd: 'inss',
    complementar: 'complementar',
    'avaliacao-imoveis': 'avaliacao',
    avaliacao: 'avaliacao',
    outro: 'outro',
  };

  const wizard = form.classList.contains('form--wizard');
  const branchRadios = form.querySelectorAll('input[name="service_branch"]');
  const branchPanels = form.querySelectorAll('.branch-panel');
  const branchCards = form.querySelectorAll('.branch-card');

  const steps = [...form.querySelectorAll('.form__step')];
  const body = form.querySelector('.wiz__body');
  const segs = [...form.querySelectorAll('.wiz__seg')];
  const rail = form.querySelector('.wiz__rail');
  const atual = form.querySelector('[data-wiz-current]');
  const rotulo = form.querySelector('[data-wiz-label]');
  const chip = form.querySelector('[data-wiz-chip]');
  const chipText = form.querySelector('[data-wiz-chip-text]');
  const btnBack = form.querySelector('[data-wiz-back]');
  const btnNext = form.querySelector('[data-wiz-next]');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form__status');
  const ROTULOS = ['Serviço', 'Detalhes', 'Observações', 'Contato'];
  // O resumo do serviço escolhido só aparece a partir da etapa 2, onde deixa de ser óbvio.
  let escolhido = false;
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
  let passo = 1;

  const say = (text, isError) => {
    if (!status) return;
    status.textContent = text;
    status.toggleAttribute('data-error', Boolean(isError));
  };

  /** Liga a branch escolhida: só o painel ativo fica habilitado e só ele entra no payload. */
  const updateBranch = (selectedId) => {
    branchCards.forEach((card) => {
      const input = card.querySelector('input');
      const ativo = Boolean(selectedId) && input?.value === selectedId;
      card.classList.toggle('branch-card--active', ativo);
      if (input) input.checked = ativo;
    });

    branchPanels.forEach((panel) => {
      const ativo = panel.dataset.branch === selectedId;
      panel.toggleAttribute('hidden', !ativo);
      panel.querySelectorAll('input, select, textarea').forEach((el) => {
        el.disabled = !ativo;
      });
    });

    if (chipText) {
      const titulo = form.querySelector('.branch-card--active .branch-card__title')?.textContent;
      if (titulo) chipText.textContent = titulo;
      escolhido = Boolean(titulo);
    }
    if (chip) chip.hidden = !escolhido || passo === 1;
  };

  /** Só os campos visíveis e habilitados da etapa valem para a validação do passo. */
  const camposDoPasso = (n) => {
    const step = steps[n - 1];
    if (!step) return [];
    return [...step.querySelectorAll('input, select, textarea')].filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
  };

  const passoValido = (n, avisar = false) => {
    if (n === 1 && !form.querySelector('input[name="service_branch"]:checked')) {
      if (avisar) say('Escolha o serviço pretendido para continuar.', true);
      return false;
    }
    const invalido = camposDoPasso(n).find((el) => !el.checkValidity());
    if (invalido) {
      if (avisar) {
        invalido.reportValidity();
        say('Preencha os campos obrigatórios desta etapa antes de continuar.', true);
      }
      return false;
    }
    return true;
  };

  const mostrar = (n, { foco = true, anima = true } = {}) => {
    const alvo = Math.min(Math.max(n, 1), steps.length);
    const mede = Boolean(body) && anima && !calmo.matches;
    const antes = mede ? body.offsetHeight : 0;

    steps.forEach((step, i) => step.toggleAttribute('hidden', i !== alvo - 1));
    passo = alvo;
    say('', false);

    segs.forEach((seg, i) => {
      seg.classList.toggle('wiz__seg--done', i + 1 < alvo);
      seg.classList.toggle('wiz__seg--now', i + 1 === alvo);
    });
    if (atual) atual.textContent = String(alvo);
    if (rotulo) rotulo.textContent = ROTULOS[alvo - 1] ?? '';
    rail?.setAttribute('aria-valuenow', String(alvo));
    rail?.setAttribute('aria-valuetext', `Etapa ${alvo} de ${steps.length}: ${ROTULOS[alvo - 1] ?? ''}`);

    if (chip) chip.hidden = !escolhido || alvo === 1;
    if (btnBack) btnBack.hidden = alvo === 1;
    const ultimo = alvo === steps.length;
    if (btnNext) btnNext.hidden = ultimo;
    if (button) button.hidden = !ultimo;

    const step = steps[alvo - 1];

    if (mede) {
      const depois = body.offsetHeight;
      if (Math.abs(depois - antes) > 2) {
        body.style.overflow = 'hidden';
        const solta = () => {
          body.style.overflow = '';
        };
        body
          .animate([{ height: `${antes}px` }, { height: `${depois}px` }], {
            duration: 340,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          })
          .finished.then(solta, solta);
      }
      step?.classList.remove('form__step--enter');
      void step?.offsetWidth;
      step?.classList.add('form__step--enter');
    }

    if (foco) {
      // O foco vai para o título da etapa: o leitor de tela anuncia a mudança e
      // o teclado entra nos campos na ordem natural.
      step?.querySelector('.form__step-title')?.focus?.({ preventScroll: true });
      const topo = form.getBoundingClientRect().top + window.scrollY - 96;
      if (window.scrollY > topo) {
        window.scrollTo({ top: topo, behavior: calmo.matches ? 'auto' : 'smooth' });
      }
    }
  };

  if (wizard) {
    btnNext?.addEventListener('click', () => {
      if (passoValido(passo, true)) mostrar(passo + 1);
    });
    btnBack?.addEventListener('click', () => mostrar(passo - 1));
    chip?.addEventListener('click', () => mostrar(1));
    // Enter avança a etapa em vez de enviar o formulário incompleto.
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && passo < steps.length && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        btnNext?.click();
      }
    });
  }

  // Origem da visita (parâmetro, hash ou referrer) já entra direto na etapa técnica.
  const detectBranch = () => {
    const params = new URLSearchParams(window.location.search);
    const valor =
      params.get('servico') || params.get('service') || params.get('s') || window.location.hash.replace(/^#/, '');
    if (valor && SERVICE_TO_BRANCH[valor.toLowerCase()]) return SERVICE_TO_BRANCH[valor.toLowerCase()];
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      const match = ref && Object.keys(SERVICE_TO_BRANCH).find((k) => ref.pathname.includes(`/servicos/${k}`));
      if (match) return SERVICE_TO_BRANCH[match];
    } catch {}
    return form.dataset.initialBranch || '';
  };

  // Solução complementar chega pelo slug do cartão (`/orcamento/?servico=pae`):
  // abre na etapa técnica já com a opção marcada, sem o visitante reescolher.
  const slugParam = (new URLSearchParams(window.location.search).get('servico') || '').replace(/[^a-z0-9-]/gi, '');
  const extraRadio = slugParam ? form.querySelector(`.branch-panel input[data-slug="${slugParam}"]`) : null;

  const inicial = extraRadio ? 'complementar' : detectBranch();
  if (inicial) updateBranch(inicial);
  // Depois de `updateBranch`: só o painel ativo fica habilitado, e campo desabilitado não entra no envio.
  if (extraRadio) extraRadio.checked = true;
  if (wizard) mostrar(inicial ? 2 : 1, { foco: false, anima: false });

  branchRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      updateBranch(radio.value);
      // A escolha do serviço já é a confirmação da etapa: avança sozinha.
      if (wizard && passo === 1) setTimeout(() => mostrar(2), 260);
    });
  });

  // Máscara dinâmica de telefone para todos os campos tel
  form.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.addEventListener('input', () => {
      const cursor = input.selectionStart;
      const prevLen = input.value.length;
      input.value = formatPhone(input.value);
      if (cursor >= prevLen) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Deep link ou autofill podem deixar uma etapa anterior incompleta: volta para ela.
    for (let n = 1; n <= steps.length; n += 1) {
      const semServico = n === 1 && !form.querySelector('input[name="service_branch"]:checked');
      const invalido = [...steps[n - 1].querySelectorAll('input, select, textarea')].some(
        (el) => !el.disabled && !el.checkValidity(),
      );
      if (semServico || invalido) {
        if (n !== passo) mostrar(n);
        passoValido(n, true);
        return;
      }
    }

    const rotuloBtn = button.querySelector('span') ?? button;
    const originalText = rotuloBtn.textContent;
    button.disabled = true;
    rotuloBtn.textContent = 'Enviando solicitação…';
    say('Enviando dados para a engenheira responsável…', false);

    const data = payload(form);

    try {
      const token = await csrfToken();
      const res = await fetch(`${API}/api/leads`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ ...data, event_source_url: location.href }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error ?? 'falha');
      }

      // Mesmo event_id do evento que a API mandou pela Conversions API: a Meta
      // recebe os dois caminhos e conta um lead só.
      const { event_id: eventId } = await res.json().catch(() => ({}));
      if (eventId && typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {}, { eventID: eventId });
      }

      form.reset();
      updateBranch('');
      rotuloBtn.textContent = originalText;
      if (wizard) mostrar(1, { foco: false });
      say(
        'Solicitação enviada com sucesso! A engenheira Ayla Gotelip analisará as informações e entrará em contato em até 24 horas úteis.',
        false,
      );
    } catch (err) {
      rotuloBtn.textContent = originalText;
      const msg = err.message.startsWith('formulario:')
        ? 'Por favor, confira os campos obrigatórios do questionário e envie novamente.'
        : MESSAGES[err.message];
      say(msg ?? 'Não foi possível enviar a mensagem no momento. Por favor, tente pelo WhatsApp.', true);
    } finally {
      button.disabled = false;
    }
  });
}
