# Design System — Gotelip Engenharia

<!-- impeccable:design-schema 1 -->

## 1. Visão Geral e Referência Visual

O design do site institucional da **Gotelip Engenharia** foi estruturado com base estrita na arquitetura e no vocabulário de componentes do **Sienge** (`sienge.com.br`), adaptado para o setor de **Engenharia de Segurança Contra Incêndio & AVCB** e governado pela identidade visual corporativa da marca:

- **Cor Primária Corporativa:** `#11161b` (Cinza quase preto corporativo com nuance sutil azulada ciano / slate-cyan)
- **Cor de Ação / Destaque:** `#ffd000` (Dourado vibrante)
- **Referência Estrutural:** Sienge (`sienge.com.br`)
- **Compromisso de Marca:** Em conformidade com o `PRODUCT.md`, a arquitetura das seções, densidade de conteúdo e componentes seguem o padrão Sienge à risca, preservando 100% a honestidade técnica (sem falsas métricas ou dados fabricados) e excelência em performance (Core Web Vitals 100/100).

---

## 2. Paleta de Cores e Contraste (Tokens)

A paleta respeita o contraste absoluto **WCAG AA** em todos os estados. O dourado (`#ffd000`) tem contraste insuficiente contra o branco (1.6:1), de modo que seu uso é estritamente restrito a:
1. Botões de ação (`.btn--gold` com texto no tom primário `#11161b`);
2. Destaques sobre fundos escuros (`#11161b`);
3. Traços de ênfase, bordas ativas e ícones em recipientes escuros.

```scss
// Cores da Marca — Cinza quase preto azulado ciano (slate-cyan)
--brand-900:  #11161b; // Cinza quase preto azulado ciano (fundo de cabeçalho, hero escuro, rodapé)
--brand-800:  #171e25; // Variação para containers e cartões escuros
--brand-700:  #202a33; // Superfícies elevadas e borders ativas em campo escuro
--gold:       #ffd000; // Única cor de ação principal
--gold-600:   #e6bb00; // Estado hover para elementos em dourado

// Neutros e Superfícies
--ink:        #0f1419; // Corpo de texto principal (contraste 16.8:1 sobre fundo branco)
--muted:      #536471; // Texto secundário e legendas (contraste 5.8:1 sobre branco)
--paper:      #ffffff; // Fundo padrão de seções claras e cartões
--paper-2:    #f4f6f8; // Fundo alternado sutil frio para seções de suporte
--line:       #dce2e6; // Divisores e bordas em campo claro
--line-dark:  #24303b; // Divisores e bordas em campo escuro
--line-dark-2:#161f27; // Divisor sutil dentro do próprio campo escuro
--brand-950:  #0b0f12; // Superfície mais profunda que o campo: barra de topo e rodapé

// Texto sobre campo escuro — quatro níveis, todos medidos contra --brand-900 (#11161b).
// O mais discreto ainda dá 4.9:1 (acima do mínimo AA de 4.5:1). Nenhuma cor de texto vive fora destes tokens.
--on-dark:    #f0f4f8; // Corpo de texto (> 15:1)
--on-dark-2:  #d2dde5; // Introduções e leads (> 12:1)
--on-dark-3:  #9eb2c0; // Secundário e metadados (> 7.5:1)
--on-dark-4:  #718797; // Rodapé e notas discretas (4.9:1)
--danger-on-dark: #ffb4ab; // Erro de formulário em campo escuro
```

---

## 3. Tipografia e Ritmo Vertical

Tipografia corporativa séria, com caráter próprio. **Plus Jakarta Sans** e **Inter** foram substituídas em 08/09/2026: são as duas faces mais recorrentes em interfaces geradas por IA e não distinguiam a marca de nenhuma outra.

- **Fonte Display & Títulos:** `'Archivo', system-ui, -apple-system, sans-serif` — grotesca robusta e levemente condensada, com presença em tamanho grande e a solidez industrial que o setor pede.
- **Fonte de Corpo & Interface:** `'Public Sans', system-ui, -apple-system, sans-serif` — desenhada para o design system federal americano, ou seja, para formulários e documentos oficiais. Reforça o contexto regulatório do produto e é excepcionalmente legível em corpo pequeno.

Ambas são variáveis, servidas localmente em subset latino (`.woff2`), com `font-display: swap` e preload nas seis páginas. O par pesa **60 KB contra 76 KB** do anterior.

### Movimento

Todo deslocamento decorativo passa por quatro tokens, para que `prefers-reduced-motion` os zere num lugar só — componente novo que use os tokens já nasce em conformidade:

- `--lift: -2px` — elevação de cartão no hover
- `--nudge: 3px` — avanço de seta e de item inline
- `--press: 1px` — afundamento de botão no clique
- `--zoom: 1.03` — aproximação de imagem no hover

Sob `prefers-reduced-motion` os quatro vão a zero e as transições caem para 100 ms, mas **não são desligadas**: cor, borda e sombra continuam transicionando. Zerar tudo apagaria a própria mudança de estado, deixando hover e foco imperceptíveis.

| Token | Escala Fluida | Aplicação |
|---|---|---|
| `--step--1` | `clamp(0.82rem, 0.8rem + 0.1vw, 0.88rem)` | Legendas, metadados, badges, notas |
| `--step-0` | `clamp(0.95rem, 0.92rem + 0.15vw, 1.02rem)` | Corpo de texto padrão, botões |
| `--step-1` | `clamp(1.1rem, 1.05rem + 0.35vw, 1.25rem)` | Subtítulos, introduções de seção, leads |
| `--step-2` | `clamp(1.35rem, 1.25rem + 0.6vw, 1.7rem)` | Títulos de cartões de destaque e modais |
| `--step-3` | `clamp(1.65rem, 1.45rem + 1.1vw, 2.25rem)` | Títulos de seções (`h2`) |
| `--step-4` | `clamp(2.0rem, 1.7rem + 1.8vw, 2.85rem)` | Título principal do Hero (`h1`) |

### Espaçamento (Escala Modular de 4)
- `--s-1`: `0.25rem` (4px)
- `--s-2`: `0.5rem` (8px)
- `--s-3`: `0.75rem` (12px)
- `--s-4`: `1rem` (16px)
- `--s-5`: `1.5rem` (24px)
- `--s-6`: `2rem` (32px)
- `--s-7`: `3rem` (48px)
- `--s-8`: `4rem` (64px)
- `--s-9`: `6rem` (96px)

### Elevação e Bordas
- `--radius-sm`: `2px` (badges e acentos)
- `--radius`: `4px` (botões padrão, inputs)
- `--radius-md`: `6px` (cards de solução, cartões de jornada)
- `--radius-lg`: `10px` (hero frame, modais)
- `--radius-pill`: `9999px` (pills e badges redondas)
- `--shadow`: `0 1px 3px rgb(36 27 25 / 6%), 0 3px 8px -2px rgb(36 27 25 / 8%)`
- `--shadow-card`: `0 2px 6px -1px rgb(36 27 25 / 7%)`
- `--shadow-hover`: `0 4px 12px -2px rgb(36 27 25 / 14%), 0 2px 4px -1px rgb(36 27 25 / 6%)`

---

## 4. Arquitetura de Componentes (Mapeamento Sienge)

A estrutura visual da Home e das páginas internas espelha os blocos funcionais característicos do portal Sienge, refinada para eliminar padrões genéricos de interface gerada por IA:

### 1. Barra de Comunicados / Plantão (`.top-bar`)
- **Posicionamento:** Fixa no topo absoluto acima do cabeçalho principal.
- **Conteúdo:** Alerta de plantão para notificações do CBMMG, com link direto de WhatsApp.
- **Visual:** Fundo `--brand-950`, badge em dourado e tipografia compacta com seta de ação.

### 2. Cabeçalho com Mega-Menu Categorizado (`.head`, `.nav`, `.mega`)
- **Posicionamento:** Sticky (`top: 0`), fundo `#11161b` com linha de divisão inferior.
- **Navegação:** Links estruturados com chevron indicador de expansão.
- **Mega-Menu:** Dropdown no hover/focus:
  - Coluna esquerda: Lista de soluções com ícone e descrição explicativa;
  - Coluna direita (`.mega__aside`): Card de conversão rápida para clientes notificados.
- **CTA do Menu:** Botão compacto `.btn--gold` "Solicitar orçamento".

### 3. Hero Corporativo em Duas Colunas (`.hero`, `.hero__grid`)
- **Coluna de Conteúdo:**
  - Título H1 direto com autoridade editorial, focado no destravamento de alvarás e conformidade legal (sem kickers repetitivos acima do título).
  - Parágrafo de apoio traduzindo termos técnicos.
  - Ações primárias: Botão de WhatsApp e botão secundário de formulário.
  - Trust Strip (`.hero__trust`): Três itens com ícone de verificação destacando conformidade, responsabilidade única e atendimento local.
- **Coluna Visual (`.hero-profile`):**
  - Retrato técnico da engenheira em moldura arquitetural limpa (`.slot-frame`).
  - Barra inferior integrada de credenciamento técnico (`.hero-profile__bar`), com avatar "AG", nome "Ayla Gotelip", cargo "Engenheira Responsável · CREA-MG" e tag "ART Registrada", eliminando recipientes aninhados.

### 4. Faixa de Indicadores (`.stats`)

Fatos verificáveis, nunca métricas. O `PRODUCT.md` proíbe fabricar prova social, e um número sem denominador — o antigo *"100%"* — lê como estatística inventada mesmo sendo honesto, custando a credibilidade que deveria comprar. Removido em 08/09/2026.

Conteúdo atual, todo verificável:
1. *ART* — responsabilidade técnica registrada no CREA em cada serviço;
2. *GV e região* — atendimento presencial no Leste de Minas Gerais;
3. *Hora marcada* — visitas técnicas com agendamento prévio;
4. *Completo* — projetos, laudos periciais, brigada e regularização.

**Layout em flex, não em grid.** Os divisores são irmãos dos itens e a contagem de indicadores é editável pelo painel: o CSS não pode depender de haver exatamente quatro. Abaixo de 920px os itens empilham e os divisores verticais somem, porque perdem a função.

### 5. Jornada do Cliente em 3 Etapas (`.journey`)
- **Conceito:** Inspirado na seção de metodologia/plataforma do Sienge.
- **Componente:** 3 colunas de cards (`.journey__col`):
  - Etapa 01: Diagnóstico e Projeto (PPCI)
  - Etapa 02: Execução e Adequações Técnicas
  - Etapa 03: Protocolo, Vistoria e AVCB
- **Visual:** Indicador numérico, badge de estágio, resumo e lista com checks.

### 6. Grade de Produtos e Soluções (`.cards`, `.card`)
- **Grid de 4 colunas:** Cada solução técnica tratada como produto:
  - Projeto Técnico de Incêndio (PPCI)
  - Regularização e AVCB
  - Laudos e Vistorias Técnicas
  - Execução e Manutenção
- **Visual:** Ícone corporativo escuro em bloco 50x50, tag "Norma CBMMG", descrição e link com seta direcional interativa.

### 7. Seção de Autoridade & Diferencial (`.why`)
- **Estrutura:** Layout dividido 50/50 com moldura técnica e corpo institucional.
- **Conteúdo:** Explicação da "Responsabilidade Técnica Única" — resolvendo a dor de clientes que sofrem com atritos entre projetistas e instaladores.
- **Bullets:** Barras verticais douradas com destaque para economia de tempo e segurança jurídica.

### 8. Galeria de Trabalhos Recentes (`.proof`)
- Cards com proporção limpa para apresentação de plantas, memoriais e execuções técnicas aprovadas.

### 9. Seção de FAQ Interativo (`.faq`)
- Componentes nativos `<details>` e `<summary>` com microanimações e zero JS dependente.
- Marcação semântica com suporte completo ao esquema `FAQPage` do Schema.org para SEO avançado.

### 10. Faixa de Conversão Pre-Footer (`.cta--band`)
- Banner horizontal com chamada urgente para regularização de notificações, selos de confiança ("Resposta ágil", "Sem compromisso", "Hora marcada") e botões diretos de contato.

### 11. Rodapé Estruturado em 4 Colunas (`.foot`)
- **Coluna 1 (Marca):** Logotipo vetorial oficial, missão técnica resumida, horário de funcionamento e CNPJ oficial.
- **Coluna 2 (Soluções):** Links diretos para os quatro serviços essenciais.
- **Coluna 3 (Institucional):** Navegação geral, Sobre, FAQ e Conteúdo.
- **Coluna 4 (Contato & Localização):** Telefone/WhatsApp em destaque, e-mail e endereço físico completo em Governador Valadares/MG.
- **Barra Inferior:** Direitos autorais e menção à conformidade técnica CBMMG.

---

## 4.1. Campo Escuro (`--field-dark`)

`.hero`, `.why` e `.phead` usam o token `--field-dark`, que combina um brilho dourado difuso no canto superior direito com uma queda vertical de `--brand-800` para `--brand-900`, dando profundidade sem imagem de fundo e sem custo de rede. Alterar o tratamento dos três componentes é uma edição de token, não três edições de componente.

## 4.2. Aplicação da Regra do Dourado

A restrição da seção 2 é imposta no CSS, não apenas documentada:

- `.section__tag--gold` é `--brand-900` por padrão. A cor dourada só é aplicada por `:is(.hero, .why, .phead, .cta, .foot, .modal) .section__tag--gold`, isto é, exclusivamente em campo escuro.
- `.card__link:hover` usa o dourado como sublinhado (traço de ênfase), nunca como cor de texto sobre branco.
- O anel de foco é duplo: contorno dourado (visível em campo escuro) sobre um anel `--brand-900` colado ao elemento (visível em campo claro). O dourado sozinho tem 1.6:1 contra o branco e ficaria abaixo do mínimo de 3:1 exigido para indicadores de interface.
- **O dourado não é usado como aba lateral ou superior de cartão.** Barras coloridas grossas em uma das bordas (`border-left: 3px solid`, `border-top: 4px solid`) são decoração sem função e o padrão visual mais reconhecível de interface genérica. Em campo claro, todo cartão do sistema — `.card`, `.journey__col`, `.extra-card`, `.post` — usa a mesma linguagem: borda `--line` em repouso, `--brand-900` no hover, mais `--shadow-hover`. O dourado entra pelo conteúdo do cartão (bloco de ícone `--brand-900` com ícone dourado, marcadores de lista, badge de estágio), nunca pela moldura.

## 5. Páginas Internas e Consistência

### Página de Serviço (`/servicos/<slug>`)

Cada um dos quatro serviços é uma página própria, gerada no build a partir de `content/servicos.json`. Antes eram quatro seções ancoradas dentro de `/servicos`; a separação dá a cada serviço título, descrição, canônica e JSON-LD `Service` próprios — quatro portas de entrada de busca em vez de uma.

- **`/servicos/`** vira hub: quatro `.svc-card` em `.svc-grid`, mais os complementares e a faixa de CTA. Nada mais de conteúdo longo no índice;
- **`.phead--svc`** — campo escuro em duas colunas: link de retorno, badge, título, lead e as duas ações (orçamento e WhatsApp) à esquerda; imagem do serviço à direita, marcada como prioritária por ser o LCP da página;
- **`.svc-body`** — três colunas: itens inclusos, quando você precisa, e um `aside` com a nota técnica mais o botão de orçamento;
- **Navegação cruzada** — os outros três serviços ao pé da página, reforçando o argumento de cobertura ponta a ponta do `PRODUCT.md`;
- **`.svc-grid` usa `auto-fit`**, então serve tanto o hub (quatro cartões) quanto a navegação cruzada (três) sem uma regra para cada.

O modal de orçamento (`<dialog>` nativo) migrou do índice para a página do serviço, onde o botão que o abre passa o nome do serviço e pré-preenche a demanda.

### Artigo do Blog (`/blog/<slug>`)

Uma rota estática por artigo, gerada no build a partir de `content/blog.json` (`vite.config.js`). Componentes próprios:

- **`.phead--article`** — mesmo campo escuro das demais internas, com link de retorno, badge de categoria, título, resumo e uma linha de metadados (data, tempo de leitura, responsável técnica);
- **`.prose`** — corpo do artigo em medida de leitura curta (68ch), `--step-1` com entrelinha 1.75. Cada `h2` recebe um traço dourado curto de 32px no lugar de régua cheia. Listas não ordenadas usam o quadrado dourado da marca como marcador;
- **`.callout`** — bloco de destaque em campo escuro dentro do corpo do texto;
- **`.post`** — cartão de artigo, usado tanto no índice quanto na leitura relacionada. O primeiro do índice recebe `.post--featured` e ocupa a linha inteira. O cartão inteiro é clicável via `::after` sobre o link do título, mantendo um único alvo no leitor de tela;
- **JSON-LD `Article`** por rota, com `og:type: article` e canônica própria.

O build valida essa cadeia em `npm run check`: se o casamento de rota por especificidade regredir, a página do artigo passa a renderizar o índice do blog silenciosamente, com HTML válido.

Todas as páginas internas (`/sobre`, `/servicos`, `/servicos/<slug>`, `/projetos`, `/blog`, `/blog/<slug>`, `/contato`) compartilham:
1. **Cabeçalho com Eyebrow Tag:** `.phead` com badge identificador (`.badge--gold`) correspondente à categoria;
2. **Mesma grade e tokens de espaçamento:** `--wrap: 1180px`, margens laterais consistentes;
3. **Página de serviço (`.svc-head` + `.svc-body`):** itens inclusos, critérios de necessidade e botão de solicitação, um serviço por rota;
4. **Formulários Acessíveis (.form):** Inputs com labels claras, campos obrigatórios validados nativamente e feedback de status imediato;
5. **Faixa CTA Pre-Footer e Rodapé Idênticos:** Garantem transição suave e consistência em qualquer ponto de entrada do lead.

### Modal de Detalhes de Projetos (`.modal--project`)

O modal de projetos (`#modal-projeto`) utiliza a tag `<dialog>` nativa com foco gerenciado, backdrop desfocado e fechamento por tecla Escape ou clique externo:

- **Estética Limpa e Branca:** Fundo claro (`--paper` / `#ffffff`), superfícies de apoio sutis (`--paper-2` / `#f6f4f2`), bordas refinadas em `--line` e tipografia corporativa de alto contraste (`--ink` / `#1a1412` e `--brand-900`);
- **Backdrop Difuso:** Fundo com desfoque de vidro fosco (`backdrop-filter: blur(6px)`) e opacidade equilibrada para contraste e imersão;
- **Cabeçalho Refinado:** Badge com ponto dourado (`.modal__category`), título em `Archivo` (`--step-2`), e botão de fechamento circular com micro-interações de elevação e foco acessível;
- **Mídia & Metadados:** Slot de imagem com proporção controlada; barra de metadados com pin de localização georreferenciado;
- **Escopo Técnico e Entregas:** Lista modular com ícones de verificação dourados sobre base escura (`.modal__check-icon`), destacando itens contratuais com clareza técnica;
- **Normas Técnicas:** Callout técnico em tom suave com borda refinada para referências regulamentares (CBMMG/ABNT/CREA);
- **Rodapé de Conversão:** Botão secundário neutro de fechamento e botão primário `.btn--gold` com link direto parametrizado para o WhatsApp da engenheira.

