<?php
declare(strict_types=1);

/** Runner idempotente: aplica migrations/*.sql em ordem e semeia um admin. */

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/app.php';
require __DIR__ . '/../src/security.php';

db()->run('CREATE TABLE IF NOT EXISTS schema_migrations (
    name       VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB');

foreach (glob(__DIR__ . '/*.sql') ?: [] as $file) {
    $name = basename($file);
    if (db()->fetch('SELECT name FROM schema_migrations WHERE name = ?', [$name])) {
        continue;
    }
    // ponytail: split ingenuo por ";" - ok porque o schema nao usa ";" em literais/triggers.
    $statements = array_filter(array_map('trim', explode(';', (string) file_get_contents($file))));
    foreach ($statements as $sql) {
        db()->run($sql);
    }
    db()->run('INSERT INTO schema_migrations (name) VALUES (?)', [$name]);
    echo "aplicada: {$name}\n";
}

$email = env('SEED_ADMIN_EMAIL', 'admin@gotelip.local');
$pass = env('SEED_ADMIN_PASS');
if (db()->fetch('SELECT id FROM users WHERE email = ?', [$email])) {
    // admin ja existe
} elseif ($pass === null || strlen($pass) < 12) {
    // Sem senha forte no ambiente nao ha admin. Nunca ha default: senha padrao
    // em codigo versionado e credencial publica.
    fwrite(STDERR, "aviso: SEED_ADMIN_PASS ausente ou com menos de 12 caracteres - admin nao semeado\n");
} else {
    db()->run(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, "admin")',
        [uuid4(), $email, password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]), 'Admin']
    );
    echo "admin semeado: {$email}\n";
}

echo "ok\n";
