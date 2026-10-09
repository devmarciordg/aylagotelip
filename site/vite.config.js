import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import * as R from './build/render.js';
import * as P from './build/pages.js';

// CMS_URL é de onde o BUILD lê o conteúdo; VITE_API_URL é o que vai embutido no
// bundle do cliente. Em produção são diferentes: o build lê do domínio publicado,
// o navegador chama a API por caminho relativo no mesmo domínio.
const API = process.env.CMS_URL ?? process.env.VITE_API_URL ?? 'http://localhost:8080';
const SITE = 'https://gotelipengenharia.com';

const PAGES = {
  home: { file: 'index.html', route: '/', render: P.home },
  sobre: { file: 'sobre/index.html', route: '/sobre/', render: P.sobre },
  servicos: { file: 'servicos/index.html', route: '/servicos/', render: P.servicos },
  projetos: { file: 'projetos/index.html', route: '/projetos/', render: P.projetos },
  blog: { file: 'blog/index.html', route: '/blog/', render: P.blog },
  contato: { file: 'contato/index.html', route: '/contato/', render: P.contato },
  orcamento: { file: 'orcamento/index.html', route: '/orcamento/', render: P.orcamento },
};

/**
 * Gera uma rota estática por item de uma coleção do CMS.
 *
 * O Vite exige um arquivo de entrada real por página, então cada `/<base>/<slug>/`
 * ganha um stub copiado do stub do índice daquela seção. São artefatos de build:
 * ficam no .gitignore.
 *
 * O conteúdo vem de `loadContent`, a mesma fonte que alimenta o HTML. Ler o seed
 * local aqui faria as rotas nascerem de uma lista e o conteúdo de outra: um post
 * criado no painel apareceria no índice do blog sem ter página para onde apontar.
 */
async function collectionRoutes({ base, contentKey, itemsOf, render, kind }) {
  const stub = readFileSync(new URL(`./${base}/index.html`, import.meta.url), 'utf8');
  const content = await loadContent(contentKey);

  for (const item of itemsOf(content.blocks) ?? []) {
    const file = `${base}/${item.slug}/index.html`;
    mkdirSync(resolve(import.meta.dirname, base, item.slug), { recursive: true });
    writeFileSync(resolve(import.meta.dirname, file), stub);
    PAGES[`${kind}:${item.slug}`] = {
      file,
      route: `/${base}/${item.slug}/`,
      contentKey,
      item,
      kind,
      render: (b) => render(b, item.slug, item),
    };
  }
}

const CONTRACT = readFileSync(new URL('./build/contract.txt', import.meta.url), 'utf8');

const local = (key) =>
  JSON.parse(readFileSync(new URL(`./content/${key}.json`, import.meta.url), 'utf8'));

/** Uma busca por página, reaproveitada pelas rotas de coleção e pelo HTML. */
const contentCache = new Map();

/**
 * Página dona dos dados da empresa. Telefone, endereço, CNPJ e CREA alimentam o
 * rodapé de *todas* as páginas, então vivem num lugar só — antes estavam
 * copiados nos 7 JSONs e já haviam divergido (o CREA aparecia em 4 rodapés e
 * sumia nos outros 3). O painel edita este bloco na aba "Empresa".
 */
const CONTACT_OWNER = 'contato';

/** Conteúdo vem da API (fonte de verdade do painel); o JSON local é o fallback do build. */
function loadContent(key) {
  if (!contentCache.has(key)) contentCache.set(key, withContact(key));
  return contentCache.get(key);
}

async function withContact(key) {
  const content = await fetchContent(key);
  if (key === CONTACT_OWNER) return content;
  const { contact } = (await loadContent(CONTACT_OWNER)).blocks;
  return { ...content, blocks: { ...content.blocks, contact } };
}

async function fetchContent(key) {
  const seed = local(key);
  try {
    const res = await fetch(`${API}/api/pages/${key}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(String(res.status));
    const page = await res.json();
    if (!page.blocks || Object.keys(page.blocks).length === 0) throw new Error('vazio');

    // Só aceita um bloco da API se ele tiver a mesma forma do seed local.
    // Sem isso, uma gravação errada no painel derruba o build do site inteiro.
    const blocks = { ...seed.blocks };
    const shape = (v) => (Array.isArray(v) ? 'array' : typeof v);
    const rejected = [];
    for (const [k, v] of Object.entries(page.blocks)) {
      if (k in seed.blocks && shape(v) !== shape(seed.blocks[k])) {
        rejected.push(k);
        continue;
      }
      blocks[k] = v;
    }
    if (rejected.length) console.warn(`[cms:${key}] blocos ignorados por forma inválida: ${rejected.join(', ')}`);
    console.log(`[cms:${key}] da API`);
    return { ...seed, ...page, meta: { ...seed.meta, ...page.meta }, blocks };
  } catch (e) {
    console.log(`[cms:${key}] seed local (${e.message})`);
    return seed;
  }
}

/**
 * Pixels ativos, lidos uma vez no build. Vão para o HTML como dados, não como
 * script do provedor: `src/js/pixels.js` só carrega o provedor 3 s depois ou na
 * primeira interação, para não custar FCP/LCP.
 */
let pixelsPromise = null;
function loadPixels() {
  pixelsPromise ??= fetch(`${API}/api/pixels`, { signal: AbortSignal.timeout(2000) })
    .then((r) => (r.ok ? r.json() : { pixels: [] }))
    .then((d) => (Array.isArray(d.pixels) ? d.pixels : []))
    .catch(() => []);
  return pixelsPromise;
}

async function pixelTag() {
  const pixels = await loadPixels();
  if (pixels.length === 0) return '';
  // `</` escapado: um id não pode fechar a tag antes da hora. A API já valida o
  // formato do id; isto é a segunda barreira, no ponto de saída.
  const json = JSON.stringify(pixels).replace(/</g, '\\u003c');
  return `<script type="application/json" id="pixels">${json}</script>`;
}

/* Do caminho mais específico para o menos: `/blog/<slug>/index.html` precisa
   casar com o artigo, não com o índice do blog. Calculado sob demanda: as rotas de
   coleção só entram em PAGES depois do await da configuração. */
let bySpecificity = null;

/** Descobre qual página está sendo transformada a partir do caminho do arquivo. */
function pageKeyFor(ctx) {
  const p = (ctx.path ?? ctx.filename ?? '').replace(/\\/g, '/');
  bySpecificity ??= Object.entries(PAGES).sort((a, z) => z[1].file.length - a[1].file.length);
  return bySpecificity.find(([, cfg]) => p.endsWith(`/${cfg.file}`))?.[0] ?? 'home';
}

function cms() {
  return {
    name: 'gotelip-cms',
    async transformIndexHtml(html, ctx) {
      const key = pageKeyFor(ctx);
      const cfg = PAGES[key];
      const content = await loadContent(cfg.contentKey ?? key);
      const b = content.blocks;

      // Numa página de coleção os metadados são do próprio item, não do índice.
      const list = cfg.kind === 'servico' ? b.services : b.posts;
      const item = cfg.item && ((list ?? []).find((x) => x.slug === cfg.item.slug) ?? cfg.item);
      // A API pode devolver o item sem `meta` (gravação anterior ao campo). O seed
      // que gerou a rota é o fallback antes de cair no metadado do índice, senão
      // todas as páginas da coleção herdam o mesmo título.
      const meta = item?.meta ?? cfg.item?.meta ?? content.meta;
      const post = cfg.kind === 'post' ? item : null;
      const servico = cfg.kind === 'servico' ? item : null;

      const head = [
        `<title>${R.esc(meta.title)}</title>`,
        `<meta name="description" content="${R.esc(meta.description)}" />`,
        `<link rel="canonical" href="${SITE}${cfg.route}" />`,
        `<meta property="og:title" content="${R.esc(meta.title)}" />`,
        `<meta property="og:description" content="${R.esc(meta.description)}" />`,
        `<meta property="og:type" content="${post ? 'article' : 'website'}" />`,
        `<meta property="og:url" content="${SITE}${cfg.route}" />`,
        key === 'home' ? R.jsonLd(content.meta, b.contact, b.services) : '',
        key === 'sobre' ? P.faqJsonLd(b.faq) : '',
        post ? P.articleJsonLd(post, `${SITE}${cfg.route}`) : '',
        servico ? P.serviceJsonLd(servico, `${SITE}${cfg.route}`, b.contact) : '',
        await pixelTag(),
      ]
        .filter(Boolean)
        .join('\n    ');

      // A home não é dona de nada nessas três seções: os destaques são os projetos
      // marcados em /projetos, as fotos dos cartões são as dos serviços em
      // /servicos e as perguntas são a lista única que o painel edita (aba
      // "Perguntas frequentes", gravada em `sobre`). Duplicar qualquer uma delas
      // na home deixava a home fora do alcance do painel.
      const deps =
        key === 'home'
          ? {
              projetos: (await loadContent('projetos')).blocks,
              servicos: (await loadContent('servicos')).blocks,
              sobre: (await loadContent('sobre')).blocks,
            }
          : undefined;

      const parts = {
        head,
        contract: key === 'home' ? `<!--\n${CONTRACT.trim()}\n-->` : '',
        header: R.header(cfg.contentKey ?? key),
        main: cfg.render(b, deps),
        footer: R.footer(b.contact),
      };

      return html.replace(/<!--@(\w+)-->/g, (m, k) => parts[k] ?? m);
    },
  };
}

/* Cache-busting dos estáticos de public/: o Vite hasheia CSS/JS do bundle, mas
   copia public/ literalmente. Sem `?v=<hash>` uma troca de imagem, logo ou fonte
   fica presa no cache do navegador. O mesmo carimbo vai no HTML e no CSS emitido
   para o preload da fonte casar com o @font-face — senão a fonte baixa duas vezes. */
/**
 * Publica as fotos do painel junto com o site.
 *
 * `build/pull-uploads.mjs` baixa cada `/uploads/*.webp` referenciado para
 * `backend/public/uploads`, mas só para `imgSize` poder ler as dimensões do
 * cabeçalho. Sem esta cópia o arquivo nunca entra em `dist/`: o HTML sai com o
 * `src` certo e o navegador recebe 404 — a imagem some da página sem nenhum
 * erro no build. `npm run check` cobra esta cópia.
 */
function uploads() {
  const origem = resolve(import.meta.dirname, '../backend/public/uploads');
  return {
    name: 'gotelip-uploads',
    apply: 'build',
    closeBundle() {
      if (!existsSync(origem)) return;
      cpSync(origem, resolve(import.meta.dirname, 'dist/uploads'), { recursive: true });
    },
  };
}

function cacheBust() {
  const cache = new Map();
  const stamp = (url) => {
    if (!cache.has(url)) {
      const file = resolve(import.meta.dirname, 'public', url.slice(1));
      cache.set(
        url,
        existsSync(file)
          ? `${url}?v=${createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8)}`
          : url,
      );
    }
    return cache.get(url);
  };
  const bust = (code) => code.replace(/\/(?:img|fonts)\/[\w.-]+\.\w+|\/(?:logo|favicon)\.svg/g, stamp);

  return {
    name: 'gotelip-cache-bust',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: { order: 'post', handler: bust },
    generateBundle(_, bundle) {
      for (const f of Object.values(bundle)) {
        if (f.type === 'asset' && f.fileName.endsWith('.css')) f.source = bust(String(f.source));
      }
    },
  };
}

export default defineConfig(async () => {
  await collectionRoutes({ base: 'blog', contentKey: 'blog', itemsOf: (b) => b.posts, render: P.post, kind: 'post' });
  await collectionRoutes({ base: 'servicos', contentKey: 'servicos', itemsOf: (b) => b.services, render: P.servico, kind: 'servico' });

  return {
  // Site multi-página: sem isso o Vite assume SPA e devolve o index.html da raiz
  // para qualquer rota sem correspondência — todo link do menu caía na home.
  appType: 'mpa',
  plugins: [cms(), cacheBust(), uploads()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(PAGES).map(([key, cfg]) => [key, resolve(import.meta.dirname, cfg.file)]),
      ),
    },
  },
    // As fotos do painel são gravadas como `/uploads/...` e em produção o mesmo
    // domínio as serve. No dev quem responde é a API.
    server: {
      port: 5174,
      proxy: { '/uploads': API },
    },
  };
});
