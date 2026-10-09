/**
 * Tradução dos nomes de campo do JSON para a língua de quem edita.
 *
 * O modelo de conteúdo é livre: cada página tem os blocos que o seed criou
 * (site/content/*.json). Quem abre o painel não é quem escreveu esse JSON, então
 * `whyBullets` e `phoneDigits` não podem chegar crus na tela. Chave sem tradução
 * cai no fallback legível — nunca some, nunca quebra.
 */

type Entry = { label: string; hint?: string };

/** Rótulo por nome de campo. Vale em qualquer profundidade: `title` de bloco e `title` de item são a mesma coisa. */
const FIELDS: Record<string, Entry> = {
  // --- página ---
  title: { label: 'Título' },
  lead: { label: 'Texto de abertura' },
  text: { label: 'Texto' },
  note: { label: 'Observação' },
  intro: { label: 'Introdução' },
  formIntro: { label: 'Texto acima do formulário' },

  // --- hero ---
  hero: { label: 'Abertura (topo da página)' },
  subtitle: { label: 'Subtítulo' },
  ctaPrimary: { label: 'Botão principal' },
  ctaSecondary: { label: 'Botão secundário' },
  imageSlot: { label: 'Imagem da abertura' },
  trust: { label: 'Selos de confiança', hint: 'As três frases curtas abaixo dos botões do topo.' },

  // --- indicadores ---
  stats: { label: 'Faixa de indicadores', hint: 'Fatos verificáveis, não métricas inventadas.' },
  value: { label: 'Destaque' },
  label: { label: 'Descrição' },

  // --- jornada ---
  journey: { label: 'Etapas' },
  journeyTitle: { label: 'Título da seção' },
  journeyIntro: { label: 'Introdução da seção' },
  stage: { label: 'Número da etapa' },
  items: { label: 'Itens da lista' },

  // --- serviços ---
  services: { label: 'Serviços' },
  servicesTitle: { label: 'Título da seção' },
  servicesIntro: { label: 'Introdução da seção' },
  slug: { label: 'Endereço na URL', hint: 'Gerado do título. Mudar o título muda este endereço — o link antigo passa a dar erro 404 no Google e em quem já compartilhou.' },
  icon: { label: 'Ícone' },
  href: { label: 'Link', hint: 'Comece a digitar para ver as páginas do site, ou cole um endereço externo.' },
  image: { label: 'Imagem' },
  includes: { label: 'O que está incluso' },
  when: { label: 'Quando o cliente precisa' },
  meta: { label: 'Linha de metadados', hint: 'Aparece em letra pequena junto ao título.' },

  // --- autoridade ---
  whyTitle: { label: 'Título da seção' },
  whyText: { label: 'Texto da seção' },
  whyBullets: { label: 'Pontos de destaque' },
  whyImageSlot: { label: 'Imagem da seção' },

  // --- provas / projetos ---
  proofTitle: { label: 'Título da seção' },
  proofIntro: { label: 'Introdução da seção' },
  slots: { label: 'Projetos' },
  photo: { label: 'Foto do projeto' },
  category: { label: 'Categoria' },
  badge: { label: 'Etiqueta' },
  description: { label: 'Descrição' },
  deliverables: { label: 'Entregas' },
  standards: { label: 'Normas aplicadas' },
  featured: { label: 'Mostrar em destaque na home' },

  // --- FAQ ---
  faq: { label: 'Perguntas frequentes' },
  faqTitle: { label: 'Título da seção' },
  q: { label: 'Pergunta' },
  a: { label: 'Resposta' },

  // --- chamada final ---
  cta: { label: 'Chamada final' },
  ctaTitle: { label: 'Título da chamada' },
  ctaText: { label: 'Texto da chamada' },

  // --- complementares ---
  extras: { label: 'Serviços complementares' },
  extrasTitle: { label: 'Título da seção' },
  extrasIntro: { label: 'Introdução da seção' },

  // --- sobre ---
  portraitSlot: { label: 'Retrato da engenheira' },
  bio: { label: 'Parágrafos da biografia' },
  bioTitle: { label: 'Título da biografia' },
  registros: { label: 'Registros profissionais' },
  commitment: { label: 'Compromisso técnico' },
  paragraphs: { label: 'Parágrafos' },
  mvv: { label: 'Missão, visão e valores' },
  mvvTitle: { label: 'Título da seção' },
  accreditations: { label: 'Credenciamentos' },

  // --- blog ---
  posts: { label: 'Artigos' },
  excerpt: { label: 'Resumo' },
  date: { label: 'Data de publicação', hint: 'Um artigo novo nasce com a data de hoje. O índice do blog ordena por ela.' },
  dateLabel: { label: 'Data por extenso', hint: 'Gerada da data de publicação. É o que o leitor vê.' },
  readTime: { label: 'Tempo de leitura', hint: 'Calculado do corpo do artigo: 200 palavras por minuto mais o tempo de olhar cada imagem.' },
  tag: { label: 'Categorias', hint: 'Uma ou mais, separadas por vírgula. Cada uma vira uma etiqueta própria no site e filtra o índice do blog sozinha.' },
  body: { label: 'Corpo do artigo' },
  emptyTitle: { label: 'Título quando não há artigo' },
  emptyText: { label: 'Texto quando não há artigo' },
  planned: { label: 'Pautas planejadas' },

  // --- contato ---
  contact: { label: 'Dados da empresa', hint: 'Valem para o site inteiro: rodapé, página de contato e dados estruturados do Google.' },
  footerText: { label: 'Descrição no rodapé', hint: 'O parágrafo abaixo do logo, em todas as páginas.' },
  phone: { label: 'Telefone exibido' },
  phoneDigits: { label: 'Telefone só em números', hint: 'Com 55 e DDD, sem espaços. É o que monta o link do WhatsApp.' },
  email: { label: 'E-mail' },
  address: { label: 'Endereço' },
  city: { label: 'Cidade' },
  state: { label: 'Estado' },
  zip: { label: 'CEP' },
  cnpj: { label: 'CNPJ' },
  hours: { label: 'Horário de atendimento' },
  crea: { label: 'CREA', hint: 'Sai no rodapé exatamente como for escrito aqui. Vazio some da linha.' },
};

/** camelCase → texto com espaços, para chave que ainda não foi traduzida. */
const humanize = (k: string) =>
  k
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

export const fieldLabel = (k: string) => FIELDS[k]?.label ?? humanize(k);
export const fieldHint = (k: string) => FIELDS[k]?.hint;

/**
 * Ícones aceitos pelo site. Espelha `ICONS` em site/build/render.js — nome fora
 * desta lista cai no ícone padrão sem erro nenhum, então o painel oferece um
 * select e nunca texto livre.
 */
export const ICON_NAMES = [
  'blueprint',
  'stamp',
  'clipboard',
  'wrench',
  'target',
  'eye',
  'scale',
  'phone',
  'mail',
  'pin',
  'clock',
  'check',
  'arrowRight',
  'shield',
  'building',
] as const;

/** Rotas internas sugeridas nos campos de link. Não é uma trava: aceita URL externa. */
export const INTERNAL_LINKS = [
  '/',
  '/sobre/',
  '/servicos/',
  '/servicos/projetos/',
  '/servicos/consultoria/',
  '/servicos/brigada/',
  '/servicos/inss/',
  '/servicos/eventos/',
  '/projetos/',
  '/blog/',
  '/contato/',
  '/contato/#orcamento',
  '/orcamento/',
] as const;
