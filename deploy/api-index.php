<?php
declare(strict_types=1);

/**
 * Front controller de producao (public_html/api/index.php).
 *
 * O codigo da aplicacao fica FORA do public_html: sem isto, `.env`, `vendor/` e
 * `src/` ficariam acessiveis por URL. Ajuste APP_ROOT se o caminho na hospedagem
 * for outro.
 */

$root = dirname(__DIR__, 2) . '/gotelip-api';

require $root . '/vendor/autoload.php';
require $root . '/src/app.php';
require $root . '/src/http.php';
require $root . '/src/security.php';
require $root . '/src/validation.php';
require $root . '/src/capi.php';
require $root . '/src/session.php';

$startedAt = microtime(true);

register_shutdown_function(fn () => audit_log($startedAt, Http::lastError()));

security_headers();
cors();

require $root . '/src/routes.php';

Http::dispatch();
