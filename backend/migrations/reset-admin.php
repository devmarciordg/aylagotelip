<?php
declare(strict_types=1);

/**
 * Gera uma senha nova para um admin e mostra o login uma única vez.
 * Cria o usuário se ele não existir. Derruba as sessões abertas dele.
 *
 * Uso (no servidor, dentro de gotelip-api/):
 *   php migrations/reset-admin.php email@dominio.com
 */

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/app.php';
require __DIR__ . '/../src/security.php';

$email = strtolower(trim($argv[1] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "uso: php migrations/reset-admin.php email@dominio.com\n");
    exit(1);
}

// 18 bytes em base64url = 24 caracteres, sem símbolos que confundem ao digitar.
$pass = rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '=');
$hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

$user = db()->fetch('SELECT id FROM users WHERE email = ?', [$email]);
if ($user) {
    db()->run('UPDATE users SET password_hash = ? WHERE id = ?', [$hash, $user['id']]);
    db()->run('DELETE FROM sessions WHERE user_id = ?', [$user['id']]);
} else {
    db()->run(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, "admin")',
        [uuid4(), $email, $hash, 'Admin']
    );
}

echo "login: {$email}\nsenha: {$pass}\n";
