import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';

/**
 * As fotos que vieram com o conteudo do site sao `/img/...`, e em producao o
 * mesmo dominio serve o painel e o site. No dev o painel roda sozinho, entao
 * sem isto a previa da foto do projeto sai quebrada em todos os seis projetos
 * semeados. Só o nome do arquivo é usado, então `..` nao sai da pasta.
 */
const imagensDoSite = {
  name: 'imagens-do-site',
  configureServer(server: { middlewares: { use: (p: string, h: unknown) => void } }) {
    const dir = resolve(import.meta.dirname, '../site/public/img');
    server.middlewares.use('/img', (req: { url?: string }, res: NodeJS.WritableStream & { statusCode: number }, next: () => void) => {
      const file = resolve(dir, basename((req.url ?? '').split('?')[0]));
      if (!existsSync(file)) return next();
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  // O painel e publicado em `public_html/painel/`, nao na raiz. Sem isto o HTML
  // sai apontando para `/assets/...` e o bundle da 404 em producao.
  base: './',
  plugins: [react(), imagensDoSite],
  // As imagens do conteudo sao gravadas como `/uploads/...` (relativo), que em
  // producao o mesmo dominio serve. No dev quem responde e a API, entao o
  // servidor do painel encaminha -- sem isto a previa do editor sai quebrada.
  server: {
    port: 5173,
    proxy: { '/uploads': process.env.VITE_API_URL || 'http://localhost:8080' },
  },
});
