/**
 * Baixa para o disco local as imagens que o painel enviou.
 *
 * O site é construído na máquina de quem publica, mas as fotos do CMS vivem no
 * servidor. Sem elas aqui, `imgSize` não consegue ler as dimensões e o HTML sai
 * sem `width`/`height` — o CLS que o build inteiro existe para evitar.
 *
 * Uso: CMS_URL=https://seudominio.com node build/pull-uploads.mjs
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.CMS_URL ?? process.env.VITE_API_URL ?? 'http://localhost:8080';
const PAGES = ['home', 'sobre', 'servicos', 'projetos', 'blog', 'contato'];
const DEST = resolve(import.meta.dirname, '../../backend/public/uploads');

/** Todo caminho `/uploads/...` que aparecer no conteúdo, em qualquer profundidade. */
function collect(value, found = new Set()) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\/uploads\/[\w.-]+\.webp/g)) found.add(m[0]);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collect(v, found);
  }
  return found;
}

const paths = new Set();
for (const page of PAGES) {
  try {
    const res = await fetch(`${API}/api/pages/${page}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) continue;
    collect((await res.json()).blocks, paths);
  } catch {
    // CMS indisponível: continua sem baixar uploads desta página
  }
}

mkdirSync(DEST, { recursive: true });

let baixadas = 0;
for (const path of paths) {
  const file = resolve(DEST, path.replace('/uploads/', ''));
  if (existsSync(file)) continue;

  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    console.warn(`[uploads] ${path}: HTTP ${res.status}`);
    continue;
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  baixadas++;
}

console.log(`[uploads] ${paths.size} referenciadas, ${baixadas} baixadas agora.`);
