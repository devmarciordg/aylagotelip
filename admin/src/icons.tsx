/**
 * Ícones do painel: um só traço, um só peso, desenhados aqui.
 * Glifo Unicode e emoji não são sistema de ícones — não renderizam igual entre
 * sistemas e o leitor de tela lê o nome do caractere, não a ação.
 */
export function Icon({ d, rotate, size = 14 }: { d: string; rotate?: number; size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <path d={d} />
    </svg>
  );
}

export const CHEVRON = 'M6 3l5 5-5 5';
export const ARROW = 'M8 13V3M4 7l4-4 4 4';
export const TRASH = 'M3 4h10M6.5 4V2.5h3V4M5 4l.6 9h4.8L11 4';
export const PLUS = 'M8 3.5v9M3.5 8h9';

/** Meta Pixel: eventos disparando ao longo do tempo. */
export const PULSE = 'M1.5 8h3l2-4.5L9.5 12l2-4h3';
/** GA4: relatório de audiência. */
export const CHART = 'M2 13.5h12M4.5 11V7M8 11V3.5M11.5 11V9';
/** Token da Conversions API: segredo guardado no servidor. */
export const LOCK = 'M3.75 7h8.5v6h-8.5zM6 7V5a2 2 0 0 1 4 0v2';

export const CHECK = 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13M5.2 8.1l2 2 3.6-4.1';
export const PAUSE = 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13M6.6 6v4M9.4 6v4';
export const DOT = 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13';
export const INFO = 'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13M8 7.3v4M8 5.1v.1';
export const ALERT = 'M8 2.6 14.2 13H1.8zM8 6.5v3M8 11.2v.1';

/* --- navegação do painel: um glifo por seção, mesmo peso de traço --- */
/** CRM: as colunas do Kanban vistas de frente. */
export const BOARD = 'M2 3h3.2v10H2zM6.4 3h3.2v6.6H6.4zM10.8 3H14v8.4h-3.2';
/** Artigos: folha com dobra e linhas de texto. */
export const ARTICLE = 'M3.5 2h5.6L12.5 5v9h-9zM9.1 2v3h3.4M5.8 8.2h4.4M5.8 11h3.2';
/** Projetos: obra construída — o que a engenharia entregou. */
export const BUILDING = 'M2.4 14V5.6L8 2.2l5.6 3.4V14M6.2 14v-3.6h3.6V14M5.4 7.8h1.4M9.2 7.8h1.4';
/** FAQ: a dúvida do cliente antes de ligar. */
export const HELP =
  'M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13M6.2 6.3a1.85 1.85 0 0 1 3.6.6c0 1.25-1.8 1.7-1.8 2.9M8 11.7v.1';
/** Empresa: os dados institucionais que valem para o site inteiro. */
export const BRIEFCASE = 'M2.6 5.6h10.8v8.2H2.6zM5.6 5.6V3.4h4.8v2.2M2.6 9.2h10.8M7.2 9.2h1.6';
/** Sair da sessão. */
export const LOGOUT = 'M6.2 14H3V2h3.2M10.2 11.2 13.4 8l-3.2-3.2M13.4 8H6.4';
/** Quem está logado. */
export const USER = 'M8 8.4a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2.6 14.4a5.4 5.4 0 0 1 10.8 0';
/** Busca de leads. */
export const SEARCH = 'M7.2 12a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4M10.7 10.7 14 14';

/* --- CRM: um glifo por tipo de informação do lead -------------------------
   Na coluna do Kanban os campos chegam empilhados e sem rótulo. O ícone é o
   rótulo: diz que aquilo é um lugar, um prazo ou um valor antes de o texto ser
   lido. Nenhum deles decora — se o campo some, o ícone some junto. */
/** Empreendimento: a obra de que o lead trata. */
export const SITE_WORK = 'M2.4 14V5.6L8 2.2l5.6 3.4V14M6.2 14v-3.6h3.6V14M5.4 7.8h1.4M9.2 7.8h1.4';
/** Cidade / UF. */
export const PIN =
  'M8 14.4s4.4-4.2 4.4-7.3a4.4 4.4 0 1 0-8.8 0C3.6 10.2 8 14.4 8 14.4M8 6.3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3';
/** Valor estimado do contrato. */
export const COIN =
  'M8 2.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6M9.9 6.2a2 2 0 0 0-3.5 1.1c0 1.5 3.3 1 3.3 2.4a2 2 0 0 1-3.6-.1M8 4.7v6.6';
/** Canal de origem — a etiqueta por onde o lead entrou. */
export const TAG = 'M2.8 2.8h4.4l6 6-4.4 4.4-6-6zM5.2 5.2v.1';
/** Prazo combinado. */
export const CALENDAR = 'M2.6 4.2h10.8v9.2H2.6zM5.4 2.6v2.6M10.6 2.6v2.6M2.6 7.4h10.8';
/** Próxima ação pendente. */
export const FLAG = 'M4 14.2V2.6h8.4l-1.7 2.7 1.7 2.7H4';
/** Demanda contratada. */
export const TARGET =
  'M8 2.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6M8 5.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2';
/** Observações do diagnóstico. */
export const NOTE = 'M3.4 2.6h9.2v10.8H3.4zM5.8 5.8h4.4M5.8 8.4h4.4M5.8 11h2.8';
/** E-mail do lead. */
export const MAIL = 'M2.2 3.8h11.6v8.4H2.2zM2.6 4.2 8 8.6l5.4-4.4';
/** WhatsApp / telefone. */
export const PHONE =
  'M5.5 2.4 7 5.2 5.6 6.5a7.5 7.5 0 0 0 3.9 3.9l1.3-1.4 2.8 1.5v2.2a1 1 0 0 1-1.1 1C6.8 13.3 2.7 9.2 2.2 3.4a1 1 0 0 1 1.1-1z';
/** Pega de arraste do cartão. */
export const GRIP = 'M6 3.6v.1M10 3.6v.1M6 8v.1M10 8v.1M6 12.4v.1M10 12.4v.1';
/** Fechar painel ou modal. */
export const CLOSE = 'M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8';
/** Voltar ao passo anterior. */
export const ARROW_RIGHT = 'M2.8 8h10M9.2 4.4 12.8 8l-3.6 3.6';
/** Total de leads captados: o funil visto de lado. */
export const FUNNEL = 'M1.8 2.8h12.4L9.4 8.5v4.9l-2.8 1.4V8.5z';
/** Conversão: a curva subindo. */
export const TREND = 'M2 11.8 6 7.6l2.6 2.4 5.2-5.4M10.6 4.4h3.2v3.2';
/** Contrato ganho. */
export const TROPHY =
  'M5 2.6h6v3.4a3 3 0 0 1-6 0zM5 3.8H3.1v.9a2.1 2.1 0 0 0 1.9 2.1M11 3.8h1.9v.9a2.1 2.1 0 0 1-1.9 2.1M8 9v2.2M5.9 13.4h4.2';

/* --- dados da empresa: um glifo por tipo de registro ----------------------
   O formulário é uma pilha de campos de texto que se parecem todos, e o erro
   caro aqui é editar o campo errado: CNPJ e CREA são duas linhas de números,
   telefone exibido e telefone do link são dois telefones. O ícone separa antes
   da leitura do rótulo. Mesmo traço de 1.5 e mesma caixa de 16 dos demais. */
/** Horário de atendimento. */
export const CLOCK = 'M8 1.8a6.2 6.2 0 1 1 0 12.4A6.2 6.2 0 0 1 8 1.8M8 4.6V8l2.4 1.6';
/** Endereço: o mapa dobrado, não o alfinete — o alfinete é a cidade. */
export const MAP = 'M1.8 4.2 6 2.6l4 1.6 4.2-1.6v9.2L10 13.4l-4-1.6-4.2 1.6zM6 2.6v9.2M10 4.2v9.2';
/** CNPJ: o cadastro da pessoa jurídica. */
export const ID_CARD =
  'M1.8 3.6h12.4v8.8H1.8zM5.5 7.6a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6M3.4 10.8a2.3 2.3 0 0 1 4.2 0M9.8 6.4h2.8M9.8 9.2h2.8';
/** CREA: a responsabilidade técnica que cobre o serviço. */
export const SHIELD = 'M8 1.9 13.2 3.8v4.1c0 3-2.2 5.2-5.2 6.2-3-1-5.2-3.2-5.2-6.2V3.8zM5.7 7.9 7.4 9.6l3-3.3';
/** Rodapé do site: a faixa de baixo da página. */
export const PAGE_FOOT = 'M2.2 2.8h11.6v10.4H2.2zM2.2 9.8h11.6M4.4 11.9h3.4';
/** Link gerado pelo painel, não digitado. */
export const LINK = 'M6.6 9.4 9.4 6.6M7 4.4 8.6 2.8a2.6 2.6 0 0 1 3.7 3.7l-1.6 1.6M9 11.6l-1.6 1.6a2.6 2.6 0 0 1-3.7-3.7l1.6-1.6';

/* --- projetos: um glifo por papel do campo na vitrine --------------------- */
/** Foto do projeto: a moldura com o horizonte dentro. */
export const IMAGE = 'M2.2 3.4h11.6v9.2H2.2zM2.2 10.4 5.8 7l3 2.8 2.2-2 2.8 2.6M10.6 5.9v.1';
/** Etiqueta que fica por cima da foto na vitrine. */
export const SEAL =
  'M8 1.9 9.5 4l2.5.3-1.2 2.2 1.2 2.2-2.5.3L8 11.1 6.5 9 4 8.7l1.2-2.2L4 4.3 6.5 4zM5.9 11.3 4.5 14.5 8 13.2l3.5 1.3-1.4-3.2';
/** Destaque na home: o projeto promovido à primeira página. */
export const STAR = 'M8 2.2l1.85 3.75 4.15.6-3 2.93.71 4.13L8 11.66l-3.71 1.95.71-4.13-3-2.93 4.15-.6z';

/** Resposta: o balão de fala com a ponta, par do ponto de interrogação. */
export const SPEECH = 'M2.6 3.2h10.8v7.2H7.6L4.5 13.2v-2.8H2.6zM5.4 5.6h5.2M5.4 8h3.4';

/** Configuração das etapas: os cursores de uma mesa de mistura. */
export const TUNE = 'M4.4 2.6v3.2M4.4 9v4.4M11.6 2.6v4.4M11.6 10.2v3.2M2.6 7.4h3.6M9.8 9h3.6';
