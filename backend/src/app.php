<?php
declare(strict_types=1);

/**
 * Infra compartilhada: env e MySQL (PDO).
 * Singleton preguicoso - conecta so quando usado.
 */

function env(string $key, ?string $default = null): ?string
{
    static $loaded = false;
    if (!$loaded) {
        $dir = dirname(__DIR__);
        if (is_file($dir . '/.env')) {
            Dotenv\Dotenv::createImmutable($dir)->safeLoad();
        }
        $loaded = true;
    }
    $v = $_ENV[$key] ?? getenv($key);
    return ($v === false || $v === null || $v === '') ? $default : (string) $v;
}

final class Db
{
    public function __construct(private PDO $pdo) {}

    public function fetch(string $sql, array $params = []): ?array
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function all(string $sql, array $params = []): array
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function run(string $sql, array $params = []): void
    {
        $this->pdo->prepare($sql)->execute($params);
    }
}

function db(): Db
{
    static $db = null;
    if ($db === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            env('DB_HOST', '127.0.0.1'),
            env('DB_PORT', '3306'),
            env('DB_NAME', 'gotelip')
        );
        $pdo = new PDO($dsn, env('DB_USER', 'root'), env('DB_PASS', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $db = new Db($pdo);
    }
    return $db;
}
