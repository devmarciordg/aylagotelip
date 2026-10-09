import { readFileSync } from 'node:fs';

const API = process.env.CMS_URL ?? process.env.VITE_API_URL ?? 'http://localhost:8080';
const PAGES = ['home', 'sobre', 'servicos', 'projetos', 'blog', 'contato', 'orcamento'];

// Credencial nunca no código: vem do ambiente, igual à do painel.
const EMAIL = process.env.CMS_EMAIL;
const PASS = process.env.CMS_PASS;

async function run() {
  if (!EMAIL || !PASS) {
    throw new Error('Defina CMS_EMAIL e CMS_PASS no ambiente antes de sincronizar.');
  }

  console.log('Conectando à API em', API, '...');
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });

  if (!loginRes.ok) {
    throw new Error(`Falha no login: ${loginRes.status} ${await loginRes.text()}`);
  }

  const setCookies = loginRes.headers.getSetCookie?.() || [loginRes.headers.get('set-cookie') || ''];
  const cookieHeader = setCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');

  console.log('Login autenticado. Sincronizando conteúdo no banco MySQL...');

  for (const page of PAGES) {
    const data = JSON.parse(readFileSync(new URL(`../content/${page}.json`, import.meta.url), 'utf8'));
    const payload = {
      title: data.title ?? page,
      blocks: data.blocks ?? {},
      meta: data.meta ?? {},
    };

    const res = await fetch(`${API}/api/admin/pages/${page}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Erro ao sincronizar ${page}: ${res.status}`, await res.text());
    } else {
      console.log(`✓ Sincronizado: ${page}`);
    }
  }

  console.log('Todas as páginas atualizadas com sucesso no CMS!');
}

run().catch(console.error);
