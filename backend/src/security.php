<?php
declare(strict_types=1);

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/** Pilares de seguranca: headers, UUIDv4, CSRF double-submit, JWT RFC 8725, rate limit sliding window. */

function security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    header('Cross-Origin-Resource-Policy: same-origin');
    header('X-Request-Id: ' . request_id());
    if (env('COOKIE_SECURE', 'false') === 'true') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
    header_remove('X-Powered-By');
}

function uuid4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function base64url_decode(string $s): string
{
    return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)) ?: '';
}

/* ---------- CSRF: double-submit cookie ---------- */

function csrf_cookie_options(): array
{
    return [
        'expires'  => 0,
        'path'     => '/',
        'secure'   => env('COOKIE_SECURE', 'false') === 'true',
        'httponly' => false, // o front precisa ler para reenviar no header
        'samesite' => 'Strict',
    ];
}

function csrf_issue(): string
{
    $token = bin2hex(random_bytes(32));
    setcookie('csrf', $token, csrf_cookie_options());
    return $token;
}

function csrf_check(): bool
{
    $cookie = $_COOKIE['csrf'] ?? '';
    $sent = Http::header('X-CSRF-Token') ?: (string) (Http::body()['_csrf'] ?? '');
    return $cookie !== '' && $sent !== '' && hash_equals($cookie, $sent);
}

/* ---------- JWT (RFC 8725) ---------- */

function jwt_issue(array $claims): array
{
    $now = time();
    $jti = uuid4();
    $ttl = (int) env('SESSION_TTL', '900');
    $payload = $claims + ['iat' => $now, 'exp' => $now + $ttl, 'jti' => $jti];
    $jwt = JWT::encode($payload, (string) env('JWT_SECRET'), 'HS256');
    return [$jwt, $jti, $ttl];
}

/** Retorna claims validas ou null. Rejeita alg != HS256 (mata "none" e alg-confusion) e jti fora do allowlist. */
function jwt_verify(string $jwt): ?array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }
    $head = json_decode(base64url_decode($parts[0]), true);
    if (!is_array($head) || ($head['alg'] ?? null) !== 'HS256') {
        return null;
    }
    try {
        $payload = (array) JWT::decode($jwt, new Key((string) env('JWT_SECRET'), 'HS256'));
    } catch (Throwable) {
        return null;
    }
    // Anti-replay: o jti tem de corresponder a uma sessao viva. Logout apaga a
    // linha, e um token capturado antes para de valer na hora.
    if (empty($payload['jti'])) {
        return null;
    }
    $alive = db()->fetch('SELECT 1 FROM sessions WHERE jti = ? AND expires_at > NOW()', [$payload['jti']]);
    return $alive === null ? null : $payload;
}

/* ---------- Rate limit: sliding window counter no MySQL ---------- */

/**
 * Uma linha por requisicao contada, dentro de um lock nomeado por chave.
 *
 * O lock e o que mantem contar-e-inserir atomico: sem ele duas requisicoes
 * simultaneas leem o mesmo total e passam as duas, que e exatamente o furo que um
 * ataque de forca bruta explora.
 */
function rate_limit(string $bucket, string $id, int $limit, int $windowSec): bool
{
    $key = "rl:{$bucket}:" . substr(hash('sha256', $id), 0, 40);
    $ident = substr($id, 0, 64);

    // Lock indisponivel: nega. Preferir o falso negativo ao balde furado.
    if ((int) (db()->fetch('SELECT GET_LOCK(?, 2) AS ok', [$key])['ok'] ?? 0) !== 1) {
        return false;
    }

    try {
        // Limpeza global: a tabela so guarda a janela corrente de qualquer balde.
        db()->run('DELETE FROM rate_hits WHERE hit_at < DATE_SUB(NOW(3), INTERVAL 1 HOUR)');

        $used = (int) db()->fetch(
            'SELECT COUNT(*) AS c FROM rate_hits
             WHERE bucket = ? AND ident = ? AND hit_at >= DATE_SUB(NOW(3), INTERVAL ? SECOND)',
            [$bucket, $ident, $windowSec]
        )['c'];

        if ($used >= $limit) {
            return false;
        }

        db()->run(
            'INSERT INTO rate_hits (id, bucket, ident, hit_at) VALUES (?, ?, ?, NOW(3))',
            [uuid4(), $bucket, $ident]
        );
        return true;
    } finally {
        db()->run('SELECT RELEASE_LOCK(?)', [$key]);
    }
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/* ---------- Auditoria: log estruturado em JSON, sem PII ---------- */

/** UUID da requisicao. Vai no log e no header X-Request-Id, para correlacionar. */
function request_id(): string
{
    static $id = null;
    return $id ??= uuid4();
}

/** IP truncado: /24 em IPv4, /48 em IPv6. Serve para rate limit e abuso, nao identifica pessoa. */
function ip_sanitized(): string
{
    $ip = client_ip();
    if (str_contains($ip, ':')) {
        return implode(':', array_slice(explode(':', $ip), 0, 3)) . '::';
    }
    $p = explode('.', $ip);
    return count($p) === 4 ? "{$p[0]}.{$p[1]}.{$p[2]}.0" : '0.0.0.0';
}

/** Uma linha JSON por requisicao no stderr. Nunca corpo, email, cookie ou IP completo. */
function audit_log(float $startedAt, ?string $error = null): void
{
    $entry = [
        'ts'     => gmdate('c'),
        'rid'    => request_id(),
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'path'   => parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH),
        'status' => http_response_code() ?: 0,
        'ip'     => ip_sanitized(),
        'ms'     => (int) round((microtime(true) - $startedAt) * 1000),
    ];
    if ($error !== null) {
        $entry['error'] = $error;
    }
    error_log(json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}
