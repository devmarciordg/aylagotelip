<?php
declare(strict_types=1);

/** Front controller unico. */

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/app.php';
require __DIR__ . '/../src/http.php';
require __DIR__ . '/../src/security.php';
require __DIR__ . '/../src/validation.php';
require __DIR__ . '/../src/capi.php';
require __DIR__ . '/../src/session.php';

$startedAt = microtime(true);

// No shutdown, nao depois do dispatch: require_auth() encerra com exit e um 401
// nunca chegaria a linha seguinte - a auditoria perderia justo as rotas negadas.
register_shutdown_function(fn () => audit_log($startedAt, Http::lastError()));

security_headers();
cors();

require __DIR__ . '/../src/routes.php';

Http::dispatch();
