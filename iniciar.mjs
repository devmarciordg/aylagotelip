// Sobe a API (docker, detached) e os dois servidores de dev do front.
// API: http://localhost:8080 · site: 5174 · painel: 5173
import { spawn } from 'node:child_process';

const run = (cmd, cwd) => spawn(cmd, { cwd, stdio: 'inherit', shell: true });

run('docker compose up -d').on('exit', (code) => {
  if (code) process.exit(code);
  run('npm run dev', 'site');
  run('npm run dev', 'admin');
});
