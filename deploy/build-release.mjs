/**
 * Monta `deploy/release/` com a árvore exata que sobe para a Hostinger.
 *
 * Uso:
 *   VITE_API_URL=https://seudominio.com node deploy/build-release.mjs
 *
 * O `VITE_API_URL` aponta para o site publicado porque o build lê o conteúdo do
 * CMS de lá. No HTML gerado a API é sempre relativa (`/api/...`), já que tudo
 * fica no mesmo domínio.
 *
 * Para forçar build com seed local (sem buscar do CMS remoto):
 *   CMS_URL=none VITE_API_URL=https://seudominio.com node deploy/build-release.mjs
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const saida = resolve(raiz, 'deploy/release');
const run = (cmd, cwd, env = {}) =>
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

const CMS = process.env.VITE_API_URL;
if (!CMS) {
  throw new Error('Defina VITE_API_URL com a URL do site publicado (ex.: https://seudominio.com).');
}
// CMS_URL separa de onde o BUILD lê conteúdo (DB/API) de onde o BUNDLE aponta em runtime.
// "none" ou qualquer URL inválida força fallback para os seeds locais em content/*.json.
const CMS_CONTENT = process.env.CMS_URL ?? CMS;

rmSync(saida, { recursive: true, force: true });
mkdirSync(saida, { recursive: true });

// 1. As fotos do painel precisam existir localmente antes do build, senão o HTML
//    sai sem width/height.
run('node build/pull-uploads.mjs', resolve(raiz, 'site'), { CMS_URL: CMS_CONTENT });

// 2. Site: conteúdo vem do CMS remoto; a API no HTML é relativa.
// npm install e nao npm ci: no Windows o ci apaga node_modules e esbarra em
// arquivo em uso. O package-lock continua mandando na resolucao.
run('npm install --no-audit --no-fund', resolve(raiz, 'site'));
run('npm run build', resolve(raiz, 'site'), { CMS_URL: CMS_CONTENT, VITE_API_URL: '' });
run('npm run check', resolve(raiz, 'site'));

// 3. Painel: mesma regra para a API.
run('npm install --no-audit --no-fund', resolve(raiz, 'admin'));
run('npm run build', resolve(raiz, 'admin'), { VITE_API_URL: '' });

// 4. Backend sem dependências de desenvolvimento.
run('composer install --no-dev --optimize-autoloader', resolve(raiz, 'backend'));

// ---------- Árvore de publicação ----------
const publico = resolve(saida, 'public_html');
const app = resolve(saida, 'gotelip-api');

cpSync(resolve(raiz, 'site/dist'), publico, { recursive: true });
cpSync(resolve(raiz, 'admin/dist'), resolve(publico, 'painel'), { recursive: true });
mkdirSync(resolve(publico, 'uploads'), { recursive: true });
mkdirSync(resolve(publico, 'api'), { recursive: true });

cpSync(resolve(raiz, 'deploy/api-index.php'), resolve(publico, 'api/index.php'));
cpSync(resolve(raiz, 'deploy/htaccess-api'), resolve(publico, 'api/.htaccess'));
cpSync(resolve(raiz, 'deploy/htaccess-public_html'), resolve(publico, '.htaccess'));

// shared/ leva o schema dos questionarios, que a API le para validar os envios.
for (const dir of ['src', 'vendor', 'migrations', 'shared']) {
  cpSync(resolve(raiz, `backend/${dir}`), resolve(app, dir), { recursive: true });
}
cpSync(resolve(raiz, 'backend/.env.example'), resolve(app, '.env.example'));

// O `.env` real nunca entra no pacote: é criado uma vez no servidor.
writeFileSync(
  resolve(saida, 'LEIA-ME.txt'),
  readFileSync(resolve(raiz, 'deploy/README.md'), 'utf8'),
);

console.log(`\nPacote pronto em deploy/release/
  public_html/    -> raiz publica do dominio
  gotelip-api/    -> um nivel ACIMA do public_html
Siga deploy/README.md para a primeira publicacao.`);
