<?php
declare(strict_types=1);

/** Router minimo + helpers de request/response JSON. */

final class Http
{
    /** @var array<int, array{method:string, regex:string, params:string[], handler:callable}> */
    private static array $routes = [];

    /** Origem da ultima excecao, para a linha de auditoria. */
    private static ?string $error = null;

    public static function lastError(): ?string
    {
        return self::$error;
    }

    public static function route(string $method, string $pattern, callable $handler): void
    {
        $params = [];
        $regex = preg_replace_callback('#\{(\w+)\}#', function ($m) use (&$params) {
            $params[] = $m[1];
            return '([^/]+)';
        }, $pattern);
        self::$routes[] = [
            'method'  => $method,
            'regex'   => '#^' . $regex . '$#',
            'params'  => $params,
            'handler' => $handler,
        ];
    }

    public static function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';

        if ($method === 'OPTIONS') {
            http_response_code(204);
            return;
        }

        foreach (self::$routes as $r) {
            if ($r['method'] !== $method || !preg_match($r['regex'], $path, $m)) {
                continue;
            }
            $args = array_combine($r['params'], array_slice($m, 1)) ?: [];
            try {
                ($r['handler'])($args);
            } catch (Throwable $e) {
                // Classe e origem, nunca a mensagem: ela pode carregar valor de entrada (PII).
                self::$error = $e::class . ' @ ' . basename($e->getFile()) . ':' . $e->getLine();
                self::json(['error' => 'internal_error'], 500);
            }
            return;
        }
        self::json(['error' => 'not_found'], 404);
    }

    public static function body(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    public static function header(string $name): string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return (string) ($_SERVER[$key] ?? '');
    }

    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function fail(string $message, int $status): void
    {
        self::json(['error' => $message], $status);
    }
}

function cors(): void
{
    $allowed = array_filter(array_map('trim', explode(',', env('CORS_ORIGINS', ''))));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    }
}
