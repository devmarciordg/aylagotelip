\# claude.md — Diretrizes de Engenharia e Regras de Negócio: Gotelip Engenharia



\## 1. Visão Geral do Projeto \& Escopo

\- \*\*Tipo:\*\* Site Institucional Multi-page Híbrido + CRM/Painel Administrativo.

\- \*\*Objetivo Comercial:\*\* Captação de leads B2B/B2C (Engenharia de Incêndio) eliminando a dependência de formulários externos e centralizando a gestão de prospecção.

\- \*\*Estrutura Pública (SSR / SSG):\*\* 

&#x20; - `/` (Home com Hero de alta conversão, Prova Social, Grid de Soluções e Destaques de Projetos).

&#x20; - `/sobre` (Autoridade técnica da engenheira, Missão/Visão/Valores).

&#x20; - `/servicos` (Detalhamento técnico das 4 soluções e modais nativos de conversão).

&#x20; - `/projetos` (Vitrine completa de obras e regularizações).

&#x20; - `/blog` (Hub de atração orgânica SEO).

&#x20; - `/contato` (FAQ e dados corporativos).

\- \*\*Painel Administrativo:\*\* Gestão de Páginas (Textos dinâmicos), Projetos (CRUD + Flag Destaque), Blog (WYSIWYG Quill.js), Injeção de Pixels e CRM (Kanban de Leads).



\## 2. Stack Tecnológica \& Dependências

\- \*\*Frontend Público:\*\* Vite + JavaScript Vanilla modular + Sass (Arquitetura BEM). Foco em leveza extrema.

\- \*\*Frontend Administrativo (Painel/CRM):\*\* Vite + React + TypeScript + CSS Modules (Reutilizando a lógica do Kanban RDAL fornecido).

\- \*\*Backend \& Persistência:\*\* PHP 8.2+ (API RESTful), MySQL (Tabelas relacionais com UUIDv4), Redis (Rate Limiting e Cache de Sessão).

\- \*\*Política de Dependências Externas:\*\* Tolerância zero para inchaço de bundle. Quill.js homologado exclusivamente para o painel de administração, com bloqueio severo de payloads Base64 (imagens devem fazer upload assíncrono convertidas para WebP).



\## 3. Diretrizes de Performance \& Core Web Vitals

\- \*\*Metas:\*\* 100/100 (Lighthouse) em Desktop e Mobile.

\- \*\*Gestão de Imagens:\*\* 100% WebP/AVIF. Uso obrigatório dos atributos `width` e `height` para aniquilar o CLS (Cumulative Layout Shift). Imagens da primeira dobra (Above the Fold) recebem `loading="eager"` e `fetchpriority="high"`. Demais com `loading="lazy"`.

\- \*\*Scripts e Tracking:\*\* Pixels (Meta, GA4) devem ser injetados dinamicamente via painel e só devem ser disparados com delay de 3 segundos ou na primeira interação do usuário (scroll/pointerdown), preservando o FCP/LCP.

\- \*\*SEO Técnico:\*\* Uso de marcação JSON-LD rigorosa (Schema.org) para EngineeringService, rotas com metadados únicos e URLs canônicas.



\## 4. Design System \& Design Tokens

\- \*\*Identidade Frontend:\*\* Cores primárias corporativas (ex: `--primary: #241b19`, `--secondary: #ffd000`), garantindo contraste WCAG AA absoluto.

\- \*\*Tipografia:\*\* Helvetica/Nunito geridas localmente com `font-display: swap` e preload estratégico dos arquivos `.woff2`.

\- \*\*Identidade CRM (Interno):\*\* UI isolada com tema dark-mode focado em produtividade.



\## 5. Arquitetura de Segurança em Profundidade (6 Pilares)

\- \*\*Sessão BFF (Backend-for-Frontend):\*\* É terminantemente proibido o armazenamento de JWT em `localStorage`. O token reside no Redis; o cliente recebe apenas um cookie opaco, configurado com `HttpOnly`, `Secure` e `SameSite=Strict`.

\- \*\*Validação JWT RFC 8725:\*\* Rejeição rigorosa do algoritmo `none`. Verificação obrigatória das claims `exp` (expiração curta) e `jti` (anti-replay interceptado no Redis).

\- \*\*Mitigação OWASP API:\*\* Zero IDs auto-incrementais no banco de dados (uso mandatório de UUIDv4). Uso de DTOs para validação de entrada de leads (mitigando Mass Assignment/BOPLA) e validação severa de Ownership nos endpoints (BFLA).

\- \*\*Hardening de Rede:\*\* Respostas da API devem conter `Content-Security-Policy` estrita, `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY`. Apenas TLS 1.2+ permitido (Cifras fracas descartadas).

\- \*\*Rate Limiting:\*\* Algoritmo \*Sliding Window Counter\* operado via scripts atômicos Lua no Redis. Segregação de cotas entre rotas de captação (formulários) e rotas administrativas (prevenção de força bruta).

\- \*\*Auditoria:\*\* Logs estruturados em JSON (sem PII), registrando UUIDs de requisição, IP sanitizado, endpoint e status code.



\## 6. Motor do CRM e Captação

\- \*\*Campos de Entrada (Frontend -> API):\*\* Nome/Empresa, Canal (Site), Empreendimento, Demanda, Cidade e Observações. Protegidos por \*Double Submit Token\* anti-CSRF.

\- \*\*Gestão (API -> Painel):\*\* O CRM consome a tabela gerando o Kanban com estágios (Novo, Qualificação, Diagnóstico, Proposta, Follow-Up, Ganho, Perdido), permitindo à operação editar Prazo, Próxima Ação e Valor Estimado de forma fluida.



\## 7. Checklist de Validação \& Definition of Done (DoD)

\- \[ ] Pontuação 100 no Lighthouse / Core Web Vitals.

\- \[ ] JWT invisível ao JavaScript do lado do cliente (implementação BFF validada).

\- \[ ] Rate Limiting comprovado contra requisições massivas.

\- \[ ] CRUD de páginas institucionais reflete no frontend com SSR/SSG.

\- \[ ] Nenhuma biblioteca pesada ou desnecessária no bundle do frontend público.

