<?php
declare(strict_types=1);

/**
 * Meta Conversions API.
 *
 * O pixel do navegador some com bloqueador de anuncio, ITP e sem consentimento de
 * cookie. O evento servidor nao. Os dois disparam o mesmo `event_id` e a Meta
 * deduplica, entao o lead conta uma vez so.
 *
 * Nada de PII em claro sai daqui: e-mail e telefone vao normalizados e com hash
 * SHA-256, como a Meta exige.
 */

const CAPI_VERSION = 'v21.0';
const CAPI_TIMEOUT_SEC = 3;

/** So digitos: a Meta espera o telefone em E.164 sem `+`, mascara nenhuma. */
function phone_digits(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    // Numero brasileiro digitado sem o codigo do pais (10 ou 11 digitos) ganha o 55.
    return strlen($digits) <= 11 ? '55' . $digits : $digits;
}

/** Normaliza e aplica hash. String vazia entra como vazia - nunca como hash de "". */
function capi_hash(string $value): string
{
    $value = trim(mb_strtolower($value));
    return $value === '' ? '' : hash('sha256', $value);
}

/**
 * Envia um evento `Lead`. Falha nunca derruba a captacao: o lead ja esta gravado
 * quando isto roda, e um evento perdido custa menos que um formulario que quebra.
 *
 * ponytail: chamada sincrona com 3 s de teto. Se o volume crescer ou a Meta ficar
 * lenta, trocar por uma tabela de fila drenada por cron - a Meta aceita evento com
 * ate 7 dias de atraso.
 */
function capi_send_lead(string $eventId, array $lead, string $sourceUrl): void
{
    $pixel = db()->fetch(
        "SELECT pixel_id, capi_token FROM pixels WHERE provider = 'meta' AND enabled = 1 AND capi_token <> ''"
    );
    if ($pixel === null) {
        return;
    }

    $payload = [
        'data' => [[
            'event_name'       => 'Lead',
            'event_time'       => time(),
            'event_id'         => $eventId,
            'action_source'    => 'website',
            'event_source_url' => filter_var($sourceUrl, FILTER_VALIDATE_URL) ?: null,
            'user_data'        => array_filter([
                'em'                => capi_hash($lead['email'] ?? ''),
                'ph'               => capi_hash(phone_digits($lead['phone'] ?? '')),
                'ct'               => capi_hash($lead['city'] ?? ''),
                'country'          => capi_hash('br'),
                // fbp/fbc sao o que mais melhora a correspondencia num formulario
                // sem login. Vem dos cookies que o proprio pixel gravou.
                'fbp'              => $_COOKIE['_fbp'] ?? '',
                'fbc'              => $_COOKIE['_fbc'] ?? '',
                'client_ip_address' => client_ip(),
                'client_user_agent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
            ], fn ($v) => $v !== '' && $v !== null),
        ]],
    ];

    $url = sprintf(
        'https://graph.facebook.com/%s/%s/events?access_token=%s',
        CAPI_VERSION,
        rawurlencode($pixel['pixel_id']),
        rawurlencode($pixel['capi_token'])
    );

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => CAPI_TIMEOUT_SEC,
        CURLOPT_CONNECTTIMEOUT => CAPI_TIMEOUT_SEC,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($status !== 200) {
        // Sem corpo do evento no log: ele carrega os hashes e o IP do visitante.
        error_log(json_encode([
            'ts'    => gmdate('c'),
            'rid'   => request_id(),
            'capi'  => 'falha',
            'status' => $status,
            'erro'  => $err !== '' ? $err : substr((string) $body, 0, 200),
        ], JSON_UNESCAPED_SLASHES));
    }
}
