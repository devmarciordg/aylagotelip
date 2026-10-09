# Backend — Gotelip Engenharia

API RESTful PHP 8.2 + BFF. MySQL (UUIDv4) para dados, sessão e rate limit.

## Subir

```bash
cp backend/.env.example backend/.env      # ajuste JWT_SECRET
docker compose up -d
docker compose exec php composer install
docker compose exec php php migrations/migrate.php
```

API em `http://localhost:8080`.

O admin só é semeado se `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASS` (mínimo 12 caracteres)
estiverem no `.env`. Sem eles o runner avisa e não cria usuário — não existe senha padrão.

## Rotas

| Método | Rota | Auth | Nota |
|---|---|---|---|
| GET | `/api/health` | — | |
| GET | `/api/csrf` | — | emite cookie+token double-submit |
| POST | `/api/leads` | CSRF + rate limit 5/min | DTO whitelist, captação pública |
| POST | `/api/auth/login` | rate limit 10/min | cria sessão BFF (cookie `sid` opaco) |
| POST | `/api/auth/logout` | cookie | apaga a sessão e invalida o `jti` |
| GET | `/api/auth/me` | sessão | |
| GET | `/api/admin/leads` | sessão | Kanban |
| PATCH | `/api/admin/leads/{id}` | sessão | whitelist: stage, deadline, next_action, estimated_value |
| GET | `/api/pages/{slug}` | — | conteúdo dinâmico |
| PUT | `/api/admin/pages/{slug}` | sessão | upsert (blocks/meta JSON) |
| POST | `/api/admin/uploads` | sessão | multipart → WebP; devolve `url`, `width`, `height` |

## Segurança implementada

- **BFF**: JWT só na tabela `sessions`, cliente recebe cookie opaco `HttpOnly+Secure+SameSite=Strict`. Nada em `localStorage`.
- **JWT RFC 8725**: `alg` fixo em `HS256` verificado no header (rejeita `none`/confusion), `exp` curto, `jti` casado com uma sessão viva (anti-replay).
- **Rate limit**: sliding window na tabela `rate_hits`, contagem e inserção sob `GET_LOCK` por chave, buckets separados (`form` vs `admin`).
- **CSRF**: double-submit cookie/header nas rotas de escrita pública.
- **OWASP API**: PKs UUIDv4 (zero auto-increment), DTO whitelist nos leads (anti Mass Assignment), `require_auth` nos endpoints admin.
- **Headers**: CSP estrita, `nosniff`, `X-Frame-Options: DENY`, HSTS quando `COOKIE_SECURE=true`.

## Testes

```bash
php tests/smoke.php
```

## Painel admin

```bash
cd admin && npm install && npm run dev   # http://localhost:5173
```

Funciona porque `localhost:5173` e `localhost:8080` são *same-site* (o `SameSite` ignora a porta),
então o cookie `sid` trafega; a origem está na allowlist de `CORS_ORIGINS`.

## Pendente (próximas fases)

- **Design do painel** (tema dark em CSS Modules) — hoje só há CSS estrutural.
- Endpoints + telas de `projects`, `posts`, `pixels` (tabelas já migradas).
- Frontend público Vanilla/Sass + SSG.
