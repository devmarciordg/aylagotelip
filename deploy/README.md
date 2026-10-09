# Publicação na Hostinger (hospedagem compartilhada / hPanel)

A hospedagem compartilhada não oferece Docker nem Redis, e não há acesso root.
Por isso a aplicação usa **apenas PHP + MySQL**: sessão, anti-replay de `jti` e
rate limiting ficam em tabelas, não em Redis. O contrato de segurança não mudou —
o JWT continua invisível ao JavaScript do cliente.

## Árvore no servidor

```
/home/uXXXX/domains/seudominio.com/
├── gotelip-api/          ← FORA do public_html. Nada aqui é acessível por URL.
│   ├── .env              ← criado no servidor, uma vez. Nunca versionado.
│   ├── src/
│   ├── vendor/
│   └── migrations/
└── public_html/          ← raiz pública
    ├── .htaccess         ← HTTPS, CSP, cache
    ├── index.html        ← site
    ├── sobre/  servicos/  projetos/  blog/  contato/
    ├── assets/  img/  fonts/
    ├── painel/           ← painel administrativo (React)
    ├── uploads/          ← fotos enviadas pelo painel
    └── api/
        ├── .htaccess     ← front controller
        └── index.php
```

O motivo de `gotelip-api/` ficar fora do `public_html`: dentro dele, `.env`,
`vendor/` e `src/` seriam baixáveis por URL — o `.env` carrega a senha do banco,
o `JWT_SECRET` e o token da Conversions API.

## Primeira publicação

### 1. Pré-requisitos no hPanel

- **PHP 8.2 ou superior** (hPanel → Avançado → Configuração PHP).
  Extensões necessárias: `pdo_mysql`, `gd`, `curl`, `mbstring`.
  `gd` faz a conversão para WebP; `curl` envia os eventos da Conversions API.
- **Banco MySQL** criado (hPanel → Bancos de Dados). Anote host, nome, usuário e senha.
- **SSL ativo** no domínio (hPanel → Segurança → SSL). O `.htaccess` força HTTPS.

### 2. Montar o pacote na sua máquina

```bash
VITE_API_URL=https://seudominio.com node deploy/build-release.mjs
```

`VITE_API_URL` aqui diz de onde o **build** lê o conteúdo do CMS. No bundle que vai
para o navegador a API entra sempre como caminho relativo (`/api/...`), porque site,
painel e API ficam no mesmo domínio.

Gera `deploy/release/` com `public_html/` e `gotelip-api/` prontos.

> Na **primeira** publicação o site ainda não existe: use
> `VITE_API_URL=http://localhost:8080` com o ambiente local no ar, ou deixe o
> build cair no conteúdo de seed (`site/content/*.json`) — ele avisa
> `[cms:home] seed local` e segue. Da segunda em diante, aponte para o domínio
> publicado para trazer o que foi editado no painel.

### 3. Enviar os arquivos

Pelo Gerenciador de Arquivos do hPanel ou por FTP:

- conteúdo de `deploy/release/public_html/` → `public_html/`
- pasta `deploy/release/gotelip-api/` → um nível **acima** do `public_html/`

Confira que `.htaccess` e `api/.htaccess` subiram (arquivos ocultos: ative
"mostrar arquivos ocultos" no gerenciador).

### 4. Criar o `.env` no servidor

Copie `gotelip-api/.env.example` para `gotelip-api/.env` e preencha:

```ini
APP_ENV=production
CORS_ORIGINS=https://seudominio.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=uXXXX_gotelip
DB_USER=uXXXX_gotelip
DB_PASS=<senha do banco>

# 32+ bytes, unico deste ambiente
JWT_SECRET=<gere com: php -r "echo bin2hex(random_bytes(32)), PHP_EOL;">
SESSION_TTL=900

UPLOAD_DIR=/home/uXXXX/domains/seudominio.com/public_html/uploads

# Obrigatorio em HTTPS: ativa Secure nos cookies e o HSTS
COOKIE_SECURE=true

SEED_ADMIN_EMAIL=ayla@seudominio.com
SEED_ADMIN_PASS=<senha forte, minimo 12 caracteres>
```

`SEED_ADMIN_PASS` só é usado uma vez, para criar o usuário. Depois disso pode ser
apagado do arquivo.

### 5. Rodar as migrações

Com SSH (hPanel → Avançado → Acesso SSH):

```bash
cd ~/domains/seudominio.com/gotelip-api
php migrations/migrate.php
```

Sem SSH: importe os arquivos `migrations/*.sql` **em ordem numérica** pelo
phpMyAdmin e crie o usuário admin manualmente com a senha já em hash:

```bash
php -r "echo password_hash('sua-senha', PASSWORD_BCRYPT, ['cost' => 12]), PHP_EOL;"
```

```sql
INSERT INTO users (id, email, password_hash, name, role)
VALUES (UUID(), 'ayla@seudominio.com', '<hash gerado acima>', 'Ayla', 'admin');
```

### 6. Conferir

```
https://seudominio.com/               site
https://seudominio.com/api/health     {"ok":true}
https://seudominio.com/painel/        login do painel
```

Depois: envie um lead de teste pelo formulário e confirme que ele aparece no
Kanban.

## Publicações seguintes

```bash
VITE_API_URL=https://seudominio.com node deploy/build-release.mjs
```

Envie só o que mudou. **Não sobrescreva** `public_html/uploads/` — é onde ficam
as fotos enviadas pelo painel.

Nenhuma migração nova? Nada mais a fazer. Havendo, repita o passo 5.

## Conversions API da Meta

1. No Gerenciador de Eventos da Meta, gere um token de acesso para o pixel.
2. Painel → Pixels → Meta: preencha o ID do pixel e cole o token. Marque "Ativo".
3. Publique o site de novo (o ID do pixel entra no HTML em tempo de build).

A partir daí cada lead dispara o evento nos dois caminhos — navegador e servidor —
com o mesmo `event_id`, e a Meta descarta a cópia repetida. O token nunca volta
para o painel: só os 4 últimos caracteres, para conferência.

## Manutenção

- **Sessões e rate limit** se limpam sozinhos (no login e a cada verificação de
  limite). Não precisa de cron.
- **Backup**: hPanel → Backups. Vale exportar o banco antes de cada publicação com
  migração nova.
- **Logs**: as linhas de auditoria em JSON vão para o log de erros do PHP
  (hPanel → Avançado → Logs de erro do PHP). Sem PII: só UUID da requisição,
  método, rota, status, IP truncado e duração.

## Limites conhecidos deste plano

- Sem Redis: a contagem do rate limit usa `GET_LOCK` do MySQL. Suficiente para o
  volume de um site institucional; num pico muito alto o lock vira o gargalo.
- Sem processo em segundo plano: o evento da Conversions API sai junto com o
  envio do formulário, com teto de 3 segundos. Se a Meta demorar, quem enviou
  espera. Um lead nunca se perde por isso — ele é gravado antes do envio.
- O build acontece na sua máquina, não no servidor. Foto nova enviada pelo painel
  só aparece no site depois de uma nova publicação.
