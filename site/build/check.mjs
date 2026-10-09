/**
 * Verificação do build estático. Roda depois de `npm run build`.
 *
 * O que ela pega: o roteamento de `/blog/<slug>` casa por especificidade de
 * caminho (vite.config.js). Se essa ordem regredir, a página do artigo passa a
 * renderizar o índice do blog — sem erro, sem aviso, com HTML válido. Só uma
 * asserção sobre o conteúdo gerado detecta isso.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { matches, parseQuery, queryFromHash, splitMatch } from '../src/js/blog-filter.js';

const dist = (p) => new URL(`../dist/${p}`, import.meta.url);
const read = (p) => readFileSync(dist(p), 'utf8');

const posts = JSON.parse(readFileSync(new URL('../content/blog.json', import.meta.url), 'utf8')).blocks.posts;
assert.ok(posts.length, 'content/blog.json não tem nenhum artigo');

// Índice do blog: lista os artigos em vez do estado vazio.
const index = read('blog/index.html');
assert.ok(!index.includes('class="empty"'), 'índice do blog caiu no estado vazio mesmo havendo artigos');
for (const p of posts) {
  assert.ok(index.includes(`/blog/${p.slug}`), `índice do blog não linka para ${p.slug}`);
}

// Uma página por artigo, com o conteúdo do artigo — não o do índice.
for (const p of posts) {
  const file = `blog/${p.slug}/index.html`;
  assert.ok(existsSync(dist(file)), `rota ausente: /blog/${p.slug}`);

  const html = read(file);
  assert.ok(html.includes('class="prose"'), `${p.slug}: renderizou o índice do blog, não o artigo`);
  assert.ok(html.includes(`<title>${p.meta.title}`), `${p.slug}: título da página não é o do artigo`);
  assert.ok(html.includes('"@type":"Article"'), `${p.slug}: sem JSON-LD de Article`);
  assert.ok(html.includes(`/blog/${p.slug}/"`), `${p.slug}: canonical não aponta para a própria rota`);

  // O corpo do artigo chega inteiro: o último bloco de texto precisa estar lá.
  const tail = p.body.slice(-60);
  assert.ok(html.includes(tail), `${p.slug}: corpo do artigo truncado`);
}

// Todas as rotas institucionais continuam de pé.
const institucionais = ['index.html', 'sobre/index.html', 'servicos/index.html', 'projetos/index.html', 'contato/index.html', 'orcamento/index.html'];
for (const route of institucionais) {
  assert.ok(existsSync(dist(route)), `rota ausente: ${route}`);
}

// Projetos: cada projeto possui botão clicável para abrir o modal e estrutura dialog presente.
const projetosHtml = read('projetos/index.html');
const projetosData = JSON.parse(readFileSync(new URL('../content/projetos.json', import.meta.url), 'utf8')).blocks.slots;
assert.ok(projetosData.length > 0, 'content/projetos.json sem projetos');
assert.ok(projetosHtml.includes('id="modal-projeto"'), 'página de projetos sem modal dialog id="modal-projeto"');
assert.ok(projetosHtml.includes('id="projetos-data"'), 'página de projetos sem dados JSON id="projetos-data"');
for (const p of projetosData) {
  assert.ok(projetosHtml.includes(`data-project-open="${p.slug}"`), `projeto ${p.slug} sem botão de abertura do modal`);
}

// Uma página por serviço, com o conteúdo do serviço — não o do hub.
const servicos = JSON.parse(readFileSync(new URL('../content/servicos.json', import.meta.url), 'utf8')).blocks.services;
assert.ok(servicos.length, 'content/servicos.json não tem nenhum serviço');

const hub = read('servicos/index.html');
for (const s of servicos) {
  assert.ok(hub.includes(`/servicos/${s.slug}/`), `hub de serviços não linka para ${s.slug}`);

  const file = `servicos/${s.slug}/index.html`;
  assert.ok(existsSync(dist(file)), `rota ausente: /servicos/${s.slug}/`);

  const html = read(file);
  assert.ok(html.includes('svc-body'), `${s.slug}: renderizou o hub, não a página do serviço`);
  assert.ok(html.includes(`<title>${s.meta.title}`), `${s.slug}: título da página não é o do serviço`);
  assert.ok(html.includes('"@type":"Service"'), `${s.slug}: sem JSON-LD de Service`);
  assert.ok(html.includes(`/servicos/${s.slug}/"`), `${s.slug}: canonical não aponta para a própria rota`);

  // Todo item da lista de inclusos chega à página.
  for (const item of s.includes) {
    assert.ok(html.includes(item.slice(0, 40)), `${s.slug}: item ausente na página — "${item.slice(0, 40)}"`);
  }
}

/**
 * Integridade dos links internos.
 *
 * O build gera diretórios (`/sobre/index.html`), então um href `/sobre` sem barra
 * final depende de o servidor redirecionar. Não dependa: com o fallback SPA do
 * Vite, `/sobre` devolvia a home com status 200 — link quebrado indistinguível de
 * link bom. Aqui todo href interno precisa resolver para um arquivo real em dist.
 */
const paginas = [
  ...institucionais,
  'blog/index.html',
  ...posts.map((p) => `blog/${p.slug}/index.html`),
  ...servicos.map((s) => `servicos/${s.slug}/index.html`),
];
const quebrados = [];

for (const pagina of paginas) {
  const html = read(pagina);
  for (const [, href] of html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)) {
    if (/\.(css|js|svg|webp|png|jpe?g|woff2?|ico|xml|txt)$/i.test(href)) continue;
    const alvo = href.endsWith('/') ? `${href.slice(1)}index.html` : href.slice(1);
    if (!existsSync(dist(alvo))) quebrados.push(`${pagina} → ${href}`);
  }
}

assert.deepEqual(quebrados, [], `links internos que não resolvem para um arquivo:\n  ${quebrados.join('\n  ')}`);

// Filtro do índice: busca sem acento e recorte por hashtag digitada no campo.
{
  const p = posts[0];
  const entry = { text: `${p.title} ${p.excerpt}`, tag: p.tag };
  // `tag` pode trazer várias categorias; o recorte é sempre por uma delas.
  const uma = String(p.tag ?? '').split(',')[0].trim();
  const q = (v) => parseQuery(v);
  assert.ok(matches(entry, q('')), 'entrada some sem busca nem tag');
  assert.ok(matches(entry, q(p.title.slice(0, 12).toUpperCase())), 'busca deveria ignorar caixa');
  assert.ok(!matches(entry, q('zzzzz')), 'busca casou com termo inexistente');
  assert.ok(matches(entry, q(`#${uma}`)), 'recorte por hashtag escondeu o próprio artigo');
  assert.ok(matches(entry, q(`#${uma.slice(0, 3)}`)), 'hashtag parcial deveria recortar enquanto se digita');
  assert.ok(!matches(entry, q('#inexistente')), 'recorte por hashtag mostrou artigo de outra tag');
  const semAcento = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  assert.ok(matches(entry, q(semAcento(p.title.slice(0, 20)))), 'busca sem acento não casou');
  assert.deepEqual(parseQuery('  #Reg '), { tag: 'Reg', text: '' }, 'campo com # deveria virar filtro de hashtag');

  // Várias categorias na mesma linha: o recorte tem de achar qualquer uma, não
  // só a primeira. Sem isto o artigo some ao filtrar pela segunda categoria.
  const multi = { text: entry.text, tag: 'Regularização, Custos' };
  assert.ok(matches(multi, q('#Regularização')), 'primeira categoria não recortou');
  assert.ok(matches(multi, q('#Custos')), 'segunda categoria não recortou');
  assert.ok(matches(multi, q('#Cust')), 'segunda categoria parcial não recortou');
  assert.ok(!matches(multi, q('#Projeto')), 'recorte mostrou artigo sem a categoria pedida');
}

// Realce: recorta no ponto certo mesmo com acento no meio da palavra.
assert.deepEqual(splitMatch('Regularização de imóvel', 'regularizacao'), ['', 'Regularização', ' de imóvel']);
assert.equal(splitMatch('Regularização', 'zzz'), null, 'realçou termo que não existe no texto');
assert.equal(splitMatch('Regularização', ''), null, 'realçou com busca vazia');

// Os `href="#tag=..."` dos artigos so filtram se o hash virar o valor do campo.
assert.equal(queryFromHash('#tag=Regulariza%C3%A7%C3%A3o'), '#Regularização', 'hash de hashtag deveria preencher o campo');
assert.equal(queryFromHash('#tag=Custos'), '#Custos');
assert.equal(queryFromHash(''), '', 'sem hash o campo fica vazio');
assert.equal(queryFromHash('#outra-ancora'), '', 'ancora que nao e tag nao deveria filtrar');

// O índice traz a busca, as hashtags clicáveis e a nuvem de tags.
assert.ok(index.includes('class="archive__search"'), 'índice do blog sem campo de busca');
const categorias = (p) => String(p.tag ?? '').split(',').map((t) => t.trim()).filter(Boolean);
for (const p of posts) {
  for (const tag of categorias(p)) {
    assert.ok(index.includes(`#tag=${encodeURIComponent(tag)}`), `hashtag sem link de filtro: ${tag}`);
  }
}
assert.ok(index.includes('id="tagmenu"'), 'índice do blog sem o menu suspenso de hashtags');
assert.ok(index.includes('aria-controls="tagmenu"'), 'campo de busca não anuncia o menu de hashtags');
for (const tag of new Set(posts.flatMap(categorias))) {
  assert.ok(index.includes(`data-tag="${tag}"`), `hashtag ausente no menu: ${tag}`);
}
assert.ok(index.includes('class="archive__count"'), 'índice do blog sem contador de resultados');

/* O filtro esconde com `hidden`. Como `.entry` declara `display: grid`, sem uma
   regra explícita de `[hidden]` no CSS o item some do JS mas continua na tela. */
const css = readFileSync(new URL(`../dist/${index.match(/href="(\/assets\/[^"]+\.css)"/)[1]}`, import.meta.url), 'utf8');
assert.ok(/\[hidden\]\{display:none/.test(css), 'CSS sem regra [hidden]: o filtro do blog não esconderia nada');

/* Toda foto do painel referenciada no HTML precisa ter saído em `dist/uploads`.
   O HTML sai com o `src` certo mesmo quando o arquivo não é publicado — aí o
   navegador recebe 404 e a imagem some da página, sem erro nenhum no build. */
const htmls = (function walk(dir = '') {
  return readdirSync(dist(dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}${e.name}/`) : e.name.endsWith('.html') ? [`${dir}${e.name}`] : [],
  );
})();
const referenciadas = new Set();
for (const f of htmls) for (const m of read(f).matchAll(/\/uploads\/[\w.-]+/g)) referenciadas.add(m[0]);
for (const src of referenciadas) {
  assert.ok(existsSync(dist(src.slice(1))), `foto referenciada no HTML mas ausente de dist: ${src}`);
}

console.log(`✓ build verificado: ${posts.length} artigos + ${servicos.length} serviços + ${institucionais.length + 1} páginas institucionais, links internos íntegros, ${referenciadas.size} foto${referenciadas.size === 1 ? '' : 's'} publicada${referenciadas.size === 1 ? '' : 's'}`);
