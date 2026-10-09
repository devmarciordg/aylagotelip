<?php
declare(strict_types=1);

/**
 * BFF: o JWT vive na tabela `sessions`. O cliente so recebe um cookie opaco `sid`
 * (HttpOnly + Secure + SameSite=Strict). JavaScript nunca ve o token.
 *
 * Era Redis ate a hospedagem ser definida. Plano compartilhado nao da Redis para a
 * aplicacao, entao o armazenamento e o MySQL - o contrato para o cliente e o mesmo.
 */

function sid_cookie_options(int $ttl): array
{
    return [
        'expires'  => $ttl > 0 ? time() + $ttl : 1,
        'path'     => '/',
        'secure'   => env('COOKIE_SECURE', 'false') === 'true',
        'httponly' => true,
        'samesite' => 'Strict',
    ];
}

function session_login(array $user): void
{
    [$jwt, $jti, $ttl] = jwt_issue(['sub' => $user['id'], 'role' => $user['role']]);
    $sid = bin2hex(random_bytes(32));

    // Login e raro: e o momento barato para recolher o que expirou.
    db()->run('DELETE FROM sessions WHERE expires_at < NOW()');
    db()->run(
        'INSERT INTO sessions (id, user_id, jti, jwt, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))',
        [$sid, $user['id'], $jti, $jwt, $ttl]
    );
    setcookie('sid', $sid, sid_cookie_options($ttl));
}

function session_user(): ?array
{
    $sid = $_COOKIE['sid'] ?? '';
    if ($sid === '') {
        return null;
    }
    $row = db()->fetch('SELECT user_id, jwt FROM sessions WHERE id = ? AND expires_at > NOW()', [$sid]);
    if ($row === null || jwt_verify($row['jwt']) === null) {
        return null;
    }
    return db()->fetch('SELECT id, email, name, role FROM users WHERE id = ?', [$row['user_id']]);
}

function session_logout(): void
{
    $sid = $_COOKIE['sid'] ?? '';
    if ($sid !== '') {
        // Apagar a linha ja invalida o jti: `jwt_verify` exige a sessao viva.
        db()->run('DELETE FROM sessions WHERE id = ?', [$sid]);
    }
    setcookie('sid', '', sid_cookie_options(0));
}

function require_auth(): array
{
    $user = session_user();
    if ($user === null) {
        Http::fail('unauthorized', 401);
        exit;
    }
    return $user;
}
