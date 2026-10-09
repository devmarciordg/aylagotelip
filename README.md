# Gotelip Engenharia

Site institucional, painel administrativo e CRM de leads da Gotelip Engenharia,
especializada em projetos de prevenção e combate a incêndio.

| Pasta      | O que é                                                        |
|------------|----------------------------------------------------------------|
| `site/`    | Site público (Vite + JavaScript vanilla + Sass), gerado estático |
| `admin/`   | Painel e CRM Kanban (Vite + React + TypeScript)                 |
| `backend/` | API REST em PHP 8.2+ com MySQL                                   |
| `deploy/`  | Empacotamento e guia de publicação em hospedagem compartilhada  |

## Rodando localmente

Requer Docker e Node 20+.

```bash
cp backend/.env.example backend/.env   # preencha JWT_SECRET e SEED_ADMIN_PASS
npm run iniciar                        # API :8080 · site :5174 · painel :5173
```

## Segurança

- Nenhum segredo é versionado. Credenciais vivem só no `.env` do servidor, fora da raiz pública.
- O JWT nunca chega ao JavaScript do navegador: a sessão é um cookie `HttpOnly`,
  `Secure` e `SameSite=Strict`, e cada token precisa de um `jti` vivo no banco.
- Formulários usam CSRF Double Submit Token e rate limiting por janela deslizante.
- IDs são UUIDv4, e a API responde com CSP estrita, `nosniff` e `X-Frame-Options: DENY`.

Encontrou uma vulnerabilidade? Não abra issue pública: escreva para o mantenedor pelo perfil do GitHub.
