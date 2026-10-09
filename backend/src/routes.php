<?php
declare(strict_types=1);

/** Definicao de rotas da API. Publico = captacao; /admin = BFF autenticado. */

/**
 * As etapas do funil vivem na tabela `lead_stages`, nao numa constante.
 *
 * Enquanto eram constante, mudar o funil era editar este arquivo e o api.ts do
 * painel e publicar os dois. Agora a operacao cria e renomeia pela tela de
 * configuracao -- menos `novo`, `ganho` e `perdido`, que a coluna `locked`
 * protege porque sao a entrada e os dois fechamentos do funil.
 *
 * Consulta por requisicao: a lista tem uma dezena de linhas e e lida algumas
 * vezes por requisicao, entao a estatica basta e nao ha cache para invalidar.
 */
function stages_all(): array
{
    static $cache = null;
    if ($cache === null) {
        $cache = db()->all('SELECT id, slug, label, color, position, locked FROM lead_stages ORDER BY position, label');
        foreach ($cache as &$s) {
            $s['position'] = (int) $s['position'];
            $s['locked'] = (bool) $s['locked'];
        }
    }
    return $cache;
}

/** Os slugs validos para `leads.stage`. */
function stage_slugs(): array
{
    return array_column(stages_all(), 'slug');
}

/** A etapa pelo id, ou null. */
function stage_by_id(string $id): ?array
{
    foreach (stages_all() as $s) {
        if ($s['id'] === $id) {
            return $s;
        }
    }
    return null;
}

/**
 * Slug a partir do rotulo: ascii, minusculo, `_` entre palavras.
 *
 * O slug e o que fica gravado em `leads.stage`, entao ele nasce do rotulo uma
 * vez e nunca mais muda -- renomear "Diagnostico" para "Vistoria" nao pode
 * mover lead nenhum de coluna.
 */
function stage_slugify(string $label): string
{
    // O TRANSLIT do iconv nao apaga o acento: ele o cospe como caractere solto
    // antes da letra (`e` vira `'e`). Sem remover essas marcas, "Vistoria
    // tecnica" com acento viraria o slug `vistoria_t_ecnica`.
    $ascii = str_replace(
        ["'", '"', '`', '^', '~', ':'],
        '',
        (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $label)
    );
    return trim((string) preg_replace('/[^a-z0-9]+/', '_', mb_strtolower($ascii)), '_');
}

Http::route('GET', '/api/health', fn () => Http::json(['ok' => true]));

/* CSRF token para os formularios publicos (double-submit) */
Http::route('GET', '/api/csrf', fn () => Http::json(['token' => csrf_issue()]));

/* ---------- Captacao publica de leads ---------- */
Http::route('POST', '/api/leads', function () {
    if (!rate_limit('form', client_ip(), 5, 60)) {
        Http::fail('rate_limited', 429);
        return;
    }
    if (!csrf_check()) {
        Http::fail('csrf', 419);
        return;
    }

    $in = Http::body();

    // Questionario por servico: as respostas vem em `answers` e sao validadas
    // contra o schema, que tambem alimenta os campos fixos do lead pelo `map`.
    $formKey = trim((string) ($in['form'] ?? ''));
    $answers = is_array($in['answers'] ?? null) ? $in['answers'] : [];
    if ($formKey !== '' && isset(forms_schema()[$formKey])) {
        [$answers, $formErrors] = form_answers_check($formKey, (array) ($in['answers'] ?? []));
        if ($formErrors !== []) {
            Http::fail('formulario: ' . implode(' | ', $formErrors), 422);
            return;
        }
        $map = forms_schema()[$formKey]['map'] ?? [];
        foreach ($map as $coluna => $campo) {
            $in[$coluna] = $answers[$campo] ?? ($in[$coluna] ?? '');
        }
        // A demanda de um questionario e o proprio servico: quem preencheu ja disse
        // o que quer ao escolher o formulario.
        $in['demand'] = $in['demand'] ?? '';
        if (trim((string) $in['demand']) === '') {
            $in['demand'] = forms_schema()[$formKey]['title'] ?? $formKey;
        }
    }

    // DTO whitelist - nada fora destes campos entra (anti Mass Assignment / BOPLA)
    $lead = [
        'name_company' => trim((string) ($in['name_company'] ?? '')),
        'email'        => trim((string) ($in['email'] ?? '')),
        'phone'        => trim((string) ($in['phone'] ?? '')),
        'enterprise'   => trim((string) ($in['enterprise'] ?? '')),
        'demand'       => trim((string) ($in['demand'] ?? '')),
        'city'         => trim((string) ($in['city'] ?? '')),
        'notes'        => trim((string) ($in['notes'] ?? '')),
    ];
    if ($lead['name_company'] === '' || $lead['demand'] === '' || $lead['phone'] === '') {
        Http::fail('campos_obrigatorios', 422);
        return;
    }
    if ($lead['email'] !== '' && !filter_var($lead['email'], FILTER_VALIDATE_EMAIL)) {
        Http::fail('email_invalido', 422);
        return;
    }
    // 10 a 13 digitos cobre fixo com DDD ate celular com codigo do pais
    if (preg_match('/^\d{10,13}$/', phone_digits($lead['phone'])) !== 1) {
        Http::fail('telefone_invalido', 422);
        return;
    }
    foreach ($lead as $k => $v) {
        if (mb_strlen($v) > 2000) {
            Http::fail("campo_muito_longo:{$k}", 422);
            return;
        }
    }

    $id = uuid4();
    db()->run(
        'INSERT INTO leads (id, name_company, email, phone, channel, form, enterprise, demand, city, notes, answers, stage)
         VALUES (?, ?, ?, ?, "site", ?, ?, ?, ?, ?, ?, "novo")',
        [$id, $lead['name_company'], $lead['email'], $lead['phone'], $formKey,
         $lead['enterprise'], $lead['demand'], $lead['city'], $lead['notes'],
         $answers === [] ? null : json_encode($answers, JSON_UNESCAPED_UNICODE)]
    );

    // O evento sai com o mesmo event_id que o navegador usa no fbq('track','Lead'),
    // e a Meta descarta a copia repetida.
    $eventId = uuid4();
    capi_send_lead($eventId, $lead, (string) ($in['event_source_url'] ?? ''));

    Http::json(['id' => $id, 'event_id' => $eventId], 201);
});

/* ---------- Auth (BFF) ---------- */
Http::route('POST', '/api/auth/login', function () {
    if (!rate_limit('admin', client_ip(), 10, 60)) {
        Http::fail('rate_limited', 429);
        return;
    }
    $in = Http::body();
    $email = trim((string) ($in['email'] ?? ''));
    $password = (string) ($in['password'] ?? '');

    $user = db()->fetch('SELECT id, email, name, role, password_hash FROM users WHERE email = ?', [$email]);
    // hash dummy para tempo constante quando o usuario nao existe
    $hash = $user['password_hash'] ?? '$2y$12$aaaaaaaaaaaaaaaaaaaaaeErrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr2';
    if (!password_verify($password, $hash) || $user === null) {
        Http::fail('credenciais_invalidas', 401);
        return;
    }
    session_login($user);
    Http::json(['user' => ['id' => $user['id'], 'email' => $user['email'], 'name' => $user['name'], 'role' => $user['role']]]);
});

Http::route('POST', '/api/auth/logout', function () {
    session_logout();
    Http::json(['ok' => true]);
});

Http::route('GET', '/api/auth/me', function () {
    $user = session_user();
    $user === null ? Http::fail('unauthorized', 401) : Http::json(['user' => $user]);
});

/* ---------- CRM: Kanban de leads ---------- */
Http::route('GET', '/api/admin/leads', function () {
    require_auth();
    $leads = db()->all(
        'SELECT id, name_company, email, phone, channel, form, enterprise, demand, city, notes,
                answers, stage, deadline, next_action, estimated_value, created_at, updated_at
         FROM leads ORDER BY updated_at DESC'
    );
    // `answers` volta do banco como texto. Sem decodificar aqui, o painel recebe
    // uma string onde espera o objeto e lista o questionario caractere a caractere.
    foreach ($leads as &$lead) {
        $lead['answers'] = $lead['answers'] === null ? null : json_decode((string) $lead['answers'], true);
    }
    unset($lead);
    Http::json(['leads' => $leads]);
});

/** Campos base do lead que a operacao edita ou informa no painel. */
const LEAD_FIELDS = ['name_company', 'email', 'phone', 'channel', 'enterprise', 'demand', 'city', 'notes'];

/** Normaliza e valida os campos base. Devolve [dados, erro|null]. */
function lead_fields_check(array $in, bool $exigirObrigatorios): array
{
    $out = [];
    foreach (LEAD_FIELDS as $campo) {
        if (!array_key_exists($campo, $in)) {
            continue;
        }
        $valor = trim((string) $in[$campo]);
        if (mb_strlen($valor) > 2000) {
            return [[], "campo_muito_longo:{$campo}"];
        }
        $out[$campo] = $valor;
    }
    if ($exigirObrigatorios && (($out['name_company'] ?? '') === '' || ($out['demand'] ?? '') === '')) {
        return [[], 'campos_obrigatorios'];
    }
    if (isset($out['name_company']) && $out['name_company'] === '') {
        return [[], 'campos_obrigatorios'];
    }
    if (($out['email'] ?? '') !== '' && !filter_var($out['email'], FILTER_VALIDATE_EMAIL)) {
        return [[], 'email_invalido'];
    }
    // No painel o telefone e opcional: nem todo lead de indicacao chega com numero.
    if (($out['phone'] ?? '') !== '' && preg_match('/^\d{10,13}$/', phone_digits($out['phone'])) !== 1) {
        return [[], 'telefone_invalido'];
    }
    return [$out, null];
}

/* Lead cadastrado a mao pela operacao (WhatsApp, indicacao, evento). */
Http::route('POST', '/api/admin/leads', function () {
    require_auth();
    $in = Http::body();

    [$lead, $erro] = lead_fields_check($in, true);
    if ($erro !== null) {
        Http::fail($erro, 422);
        return;
    }

    $stage = (string) ($in['stage'] ?? 'novo');
    if (!in_array($stage, stage_slugs(), true)) {
        Http::fail('stage_invalido', 422);
        return;
    }

    $id = uuid4();
    db()->run(
        'INSERT INTO leads (id, name_company, email, phone, channel, enterprise, demand, city, notes, stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$id, $lead['name_company'], $lead['email'] ?? '', $lead['phone'] ?? '',
         ($lead['channel'] ?? '') === '' ? 'painel' : $lead['channel'],
         $lead['enterprise'] ?? '', $lead['demand'], $lead['city'] ?? '', $lead['notes'] ?? '', $stage]
    );

    Http::json(['id' => $id], 201);
});

Http::route('PATCH', '/api/admin/leads/{id}', function (array $args) {
    require_auth();
    $in = Http::body();
    $fields = [];
    $params = [];

    if (isset($in['stage'])) {
        if (!in_array($in['stage'], stage_slugs(), true)) {
            Http::fail('stage_invalido', 422);
            return;
        }
        $fields[] = 'stage = ?';
        $params[] = $in['stage'];
    }
    foreach (['deadline', 'next_action', 'estimated_value'] as $col) {
        if (array_key_exists($col, $in)) {
            $fields[] = "{$col} = ?";
            $params[] = $in[$col] === '' ? null : $in[$col];
        }
    }

    // Campos base tambem sao editaveis pelo painel (corrigir nome, cidade, canal).
    [$base, $erro] = lead_fields_check($in, false);
    if ($erro !== null) {
        Http::fail($erro, 422);
        return;
    }
    foreach ($base as $col => $valor) {
        $fields[] = "{$col} = ?";
        $params[] = $valor;
    }
    if ($fields === []) {
        Http::fail('nada_para_atualizar', 422);
        return;
    }
    $params[] = $args['id'];
    db()->run('UPDATE leads SET ' . implode(', ', $fields) . ' WHERE id = ?', $params);
    Http::json(['ok' => true]);
});

/* ---------- Upload de imagens -> WebP ---------- */

/**
 * Le a imagem enviada em `file`, confiando no conteudo e nunca no nome ou no
 * mime que o cliente manda.
 *
 * Encerra a requisicao no primeiro problema, como `require_auth()`: `Http::fail`
 * so escreve a resposta, e o `exit` e o que garante que o chamador nunca receba
 * um GdImage invalido. A auditoria nao se perde -- ela roda no shutdown.
 */
function upload_image(): GdImage
{
    $file = $_FILES['file'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        Http::fail('arquivo_ausente', 422);
        exit;
    }
    if ($file['size'] > 8 * 1024 * 1024) {
        Http::fail('arquivo_muito_grande', 413);
        exit;
    }

    $probe = image_probe($file['tmp_name']);
    if ($probe === null) {
        Http::fail('formato_nao_suportado', 422);
        exit;
    }

    $img = @$probe[0]($file['tmp_name']);
    if ($img === false) {
        Http::fail('imagem_invalida', 422);
        exit;
    }

    return $img;
}

/** Editor do painel (Quill) e campos de foto avulsos: uma imagem, tamanho original. */
Http::route('POST', '/api/admin/uploads', function () {
    require_auth();
    $img = upload_image();
    $nome = image_variants($img, [imagesx($img)]);
    $w = imagesx($img);
    $h = imagesy($img);
    imagedestroy($img);

    Http::json(['url' => "/uploads/{$nome}", 'width' => $w, 'height' => $h], 201);
});

/**
 * Galeria: a mesma imagem gravada nas larguras que aquela posicao do site usa.
 *
 * O slot decide os tamanhos (GALLERY_SLOTS); o painel so diz onde a foto vai.
 */
Http::route('POST', '/api/admin/gallery/{slot}', function (array $args) {
    require_auth();
    $larguras = GALLERY_SLOTS[$args['slot']] ?? null;
    if ($larguras === null) {
        Http::fail('slot_invalido', 422);
        return;
    }

    $img = upload_image();
    $nome = image_variants($img, $larguras);
    imagedestroy($img);

    Http::json(['url' => "/uploads/{$nome}"], 201);
});

/**
 * Biblioteca: tudo que ja foi enviado, para reaproveitar sem subir de novo.
 *
 * So as variantes canonicas aparecem -- `<id>-600.webp` e o recorte pequeno de
 * `<id>-1200.webp`, escolher o pequeno na lista poria a miniatura na hero.
 */
Http::route('GET', '/api/admin/gallery', function () {
    require_auth();
    $dir = uploads_dir();
    $em_uso = uploads_em_uso();
    $canonicas = [];
    foreach (scandir($dir) ?: [] as $nome) {
        if (!str_ends_with($nome, '.webp')) {
            continue;
        }
        $id = upload_id($nome);
        $tamanho = @getimagesize("{$dir}/{$nome}");
        if (($canonicas[$id]['largura'] ?? -1) >= ($tamanho[0] ?? 0)) {
            continue;
        }
        $canonicas[$id] = [
            'url'     => "/uploads/{$nome}",
            'largura' => $tamanho[0] ?? 0,
            'altura'  => $tamanho[1] ?? 0,
            'at'      => filemtime("{$dir}/{$nome}"),
        ];
    }

    // Em uso e por variante; a tela pergunta pelo grupo, entao basta uma.
    foreach ($canonicas as $id => $foto) {
        $canonicas[$id]['em_uso'] = false;
        foreach (upload_variantes($id) as $variante) {
            $canonicas[$id]['em_uso'] = $canonicas[$id]['em_uso'] || isset($em_uso[$variante]);
        }
    }

    usort($canonicas, fn ($a, $z) => $z['at'] <=> $a['at']);
    Http::json(['images' => array_values($canonicas)]);
});

/**
 * Apaga uma foto da biblioteca, com todas as variantes de largura.
 *
 * Recusa enquanto alguma pagina ainda apontar para ela: o arquivo some do disco
 * na hora e a pagina publicada ficaria com um buraco que so aparece no site, sem
 * erro nenhum no painel. Trocar a foto na posicao primeiro, apagar depois.
 */
Http::route('DELETE', '/api/admin/gallery/{nome}', function (array $args) {
    require_auth();
    $nome = basename($args['nome']);
    if (preg_match('/^[\w.-]+\.webp$/', $nome) !== 1) {
        Http::fail('nome_invalido', 422);
        return;
    }

    $variantes = upload_variantes(upload_id($nome));
    if ($variantes === []) {
        Http::fail('imagem_nao_encontrada', 404);
        return;
    }

    $em_uso = uploads_em_uso();
    foreach ($variantes as $variante) {
        if (isset($em_uso[$variante])) {
            Http::fail('imagem_em_uso', 409);
            return;
        }
    }

    $dir = uploads_dir();
    foreach ($variantes as $variante) {
        @unlink("{$dir}/{$variante}");
    }

    Http::json(['ok' => true]);
});

/* ---------- Pixels de tracking ---------- */

const PIXEL_PROVIDERS = ['meta', 'ga4'];

/** Publico: o build do site le isto e injeta os IDs no HTML. */
Http::route('GET', '/api/pixels', function () {
    Http::json(['pixels' => db()->all(
        'SELECT provider, pixel_id FROM pixels WHERE enabled = 1 ORDER BY provider'
    )]);
});

Http::route('PUT', '/api/admin/pixels/{provider}', function (array $args) {
    require_auth();
    if (!in_array($args['provider'], PIXEL_PROVIDERS, true)) {
        Http::fail('provider_invalido', 422);
        return;
    }

    $in = Http::body();
    $id = trim((string) ($in['pixel_id'] ?? ''));
    // Vai para dentro de uma tag <script> no site: so o alfabeto que os dois
    // provedores usam de fato, nada que possa fechar a tag ou virar codigo.
    if ($id !== '' && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id) !== 1) {
        Http::fail('pixel_id_invalido', 422);
        return;
    }

    // Token da Conversions API: campo vazio mantem o que ja esta gravado, porque o
    // painel nunca recebe o valor de volta e nao teria como reenviar.
    $token = trim((string) ($in['capi_token'] ?? ''));
    if ($token !== '' && preg_match('/^[A-Za-z0-9_-]{20,255}$/', $token) !== 1) {
        Http::fail('capi_token_invalido', 422);
        return;
    }

    db()->run(
        'INSERT INTO pixels (id, provider, pixel_id, capi_token, enabled) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            pixel_id = VALUES(pixel_id),
            capi_token = IF(VALUES(capi_token) = "", capi_token, VALUES(capi_token)),
            enabled = VALUES(enabled)',
        [uuid4(), $args['provider'], $id, $token, !empty($in['enabled']) && $id !== '' ? 1 : 0]
    );
    Http::json(['ok' => true]);
});

Http::route('DELETE', '/api/admin/pixels/{provider}/token', function (array $args) {
    require_auth();
    db()->run("UPDATE pixels SET capi_token = '' WHERE provider = ?", [$args['provider']]);
    Http::json(['ok' => true]);
});

Http::route('GET', '/api/admin/pixels', function () {
    require_auth();
    $rows = db()->all('SELECT provider, pixel_id, capi_token, enabled FROM pixels ORDER BY provider');
    foreach ($rows as &$row) {
        // O token nunca volta ao cliente: so o suficiente para conferir qual esta la.
        $row['capi_token'] = $row['capi_token'] === ''
            ? ''
            : '****' . substr($row['capi_token'], -4);
    }
    Http::json(['pixels' => $rows]);
});

/* ---------- CRUD dinamico de paginas institucionais ---------- */
Http::route('GET', '/api/pages/{slug}', function (array $args) {
    $page = db()->fetch('SELECT slug, title, blocks, meta, updated_at FROM pages WHERE slug = ?', [$args['slug']]);
    if ($page === null) {
        Http::fail('not_found', 404);
        return;
    }
    // PDO devolve colunas JSON como string - decodifica para o front nao ter de fazer parse duplo
    $page['blocks'] = json_decode((string) $page['blocks'], true) ?? [];
    $page['meta'] = json_decode((string) $page['meta'], true) ?? [];
    Http::json($page);
});

Http::route('PUT', '/api/admin/pages/{slug}', function (array $args) {
    require_auth();
    $in = Http::body();

    $errors = blocks_slug_errors(is_array($in['blocks'] ?? null) ? $in['blocks'] : []);
    if ($errors !== []) {
        Http::fail('slug: ' . implode(' | ', $errors), 422);
        return;
    }

    $title = trim((string) ($in['title'] ?? ''));
    $blocks = json_encode($in['blocks'] ?? [], JSON_UNESCAPED_UNICODE);
    $meta = json_encode($in['meta'] ?? [], JSON_UNESCAPED_UNICODE);

    db()->run(
        'INSERT INTO pages (id, slug, title, blocks, meta) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), blocks = VALUES(blocks), meta = VALUES(meta)',
        [uuid4(), $args['slug'], $title, $blocks, $meta]
    );
    Http::json(['ok' => true]);
});

/* ---------- Etapas do funil ----------
   A leitura serve qualquer sessao autenticada porque o Kanban inteiro depende
   dela; a escrita respeita `locked`. */
Http::route('GET', '/api/admin/stages', function () {
    require_auth();
    Http::json(['stages' => stages_all()]);
});

Http::route('POST', '/api/admin/stages', function () {
    require_auth();
    $in = Http::body();

    $label = trim((string) ($in['label'] ?? ''));
    if ($label === '' || mb_strlen($label) > 60) {
        Http::fail('label_invalido', 422);
        return;
    }
    $slug = stage_slugify($label);
    if ($slug === '') {
        Http::fail('label_sem_letras', 422);
        return;
    }
    if (in_array($slug, stage_slugs(), true)) {
        Http::fail('etapa_ja_existe', 409);
        return;
    }

    $color = (string) ($in['color'] ?? '#7f8c8d');
    if (preg_match('/^#[0-9a-fA-F]{6}$/', $color) !== 1) {
        Http::fail('cor_invalida', 422);
        return;
    }

    // Nasce antes de `ganho` (posicao 90): etapa nova e sempre meio de funil.
    $fim = db()->fetch('SELECT COALESCE(MAX(position), 10) + 10 AS p FROM lead_stages WHERE locked = 0');
    $id = uuid4();
    db()->run(
        'INSERT INTO lead_stages (id, slug, label, color, position, locked) VALUES (?, ?, ?, ?, ?, 0)',
        [$id, $slug, $label, $color, min((int) $fim['p'], 89)]
    );
    Http::json(['id' => $id, 'slug' => $slug], 201);
});

Http::route('PATCH', '/api/admin/stages/{id}', function (array $args) {
    require_auth();
    $stage = stage_by_id($args['id']);
    if ($stage === null) {
        Http::fail('not_found', 404);
        return;
    }
    // `novo`, `ganho` e `perdido` sao estrutura, nao configuracao: quem recebe o
    // lead captado e quem fecha o funil por cima e por baixo.
    if ($stage['locked']) {
        Http::fail('etapa_protegida', 403);
        return;
    }

    $in = Http::body();
    $fields = [];
    $params = [];

    if (array_key_exists('label', $in)) {
        $label = trim((string) $in['label']);
        if ($label === '' || mb_strlen($label) > 60) {
            Http::fail('label_invalido', 422);
            return;
        }
        // O slug nao acompanha o rotulo: ele e o valor gravado em `leads.stage`,
        // e mexer nele moveria de coluna todo lead que ja esta nesta etapa.
        $fields[] = 'label = ?';
        $params[] = $label;
    }
    if (array_key_exists('color', $in)) {
        if (preg_match('/^#[0-9a-fA-F]{6}$/', (string) $in['color']) !== 1) {
            Http::fail('cor_invalida', 422);
            return;
        }
        $fields[] = 'color = ?';
        $params[] = (string) $in['color'];
    }
    if (array_key_exists('position', $in)) {
        // Entre `novo` (10) e `ganho` (90): reordenar nao pode tirar a entrada do
        // comeco nem os fechamentos do fim.
        $fields[] = 'position = ?';
        $params[] = max(11, min(89, (int) $in['position']));
    }
    if ($fields === []) {
        Http::fail('nada_para_atualizar', 422);
        return;
    }

    $params[] = $args['id'];
    db()->run('UPDATE lead_stages SET ' . implode(', ', $fields) . ' WHERE id = ?', $params);
    Http::json(['ok' => true]);
});

/**
 * Excluir etapa: os leads dela precisam de destino.
 *
 * Apagar a linha deixaria `leads.stage` apontando para um slug que nao existe
 * mais -- os leads sumiriam do quadro sem sumir do banco, que e a pior das duas
 * perdas possiveis. Entao ou a coluna esta vazia, ou quem exclui diz para onde
 * os leads vao (`move_to`).
 */
Http::route('DELETE', '/api/admin/stages/{id}', function (array $args) {
    require_auth();
    $stage = stage_by_id($args['id']);
    if ($stage === null) {
        Http::fail('not_found', 404);
        return;
    }
    if ($stage['locked']) {
        Http::fail('etapa_protegida', 403);
        return;
    }

    $n = (int) db()->fetch('SELECT COUNT(*) AS n FROM leads WHERE stage = ?', [$stage['slug']])['n'];
    $destino = trim((string) ($_GET['move_to'] ?? ''));

    if ($n > 0) {
        if ($destino === '' || $destino === $stage['slug'] || !in_array($destino, stage_slugs(), true)) {
            Http::fail('etapa_com_leads:' . $n, 409);
            return;
        }
        db()->run('UPDATE leads SET stage = ? WHERE stage = ?', [$destino, $stage['slug']]);
    }

    db()->run('DELETE FROM lead_stages WHERE id = ?', [$args['id']]);
    Http::json(['ok' => true, 'movidos' => $n]);
});

/* ---------- Comentarios do lead ----------
   `leads.notes` e campo unico e sobrescrevivel: serve para o que o lead
   informou, nao para o que a operacao foi descobrindo. Aqui cada conversa,
   visita e exigencia do CBMMG vira uma linha com autor e data. */
Http::route('GET', '/api/admin/leads/{id}/comments', function (array $args) {
    require_auth();
    Http::json(['comments' => db()->all(
        'SELECT id, user_id, author_name, body, edited_at, created_at
         FROM lead_comments WHERE lead_id = ? ORDER BY created_at ASC',
        [$args['id']]
    )]);
});

/** Texto do comentario, normalizado. Devolve [texto, erro|null]. */
function comment_body_check(array $in): array
{
    $body = trim((string) ($in['body'] ?? ''));
    if ($body === '') {
        return ['', 'comentario_vazio'];
    }
    if (mb_strlen($body) > 4000) {
        return ['', 'comentario_muito_longo'];
    }
    return [$body, null];
}

Http::route('POST', '/api/admin/leads/{id}/comments', function (array $args) {
    $user = require_auth();

    if (db()->fetch('SELECT id FROM leads WHERE id = ?', [$args['id']]) === null) {
        Http::fail('not_found', 404);
        return;
    }
    [$body, $erro] = comment_body_check(Http::body());
    if ($erro !== null) {
        Http::fail($erro, 422);
        return;
    }

    $id = uuid4();
    db()->run(
        'INSERT INTO lead_comments (id, lead_id, user_id, author_name, body) VALUES (?, ?, ?, ?, ?)',
        [$id, $args['id'], $user['id'], $user['name'], $body]
    );
    Http::json(['id' => $id], 201);
});

/**
 * Editar e excluir sao do autor.
 *
 * Todo mundo aqui e `admin`, entao o papel nao separa ninguem -- o que separa e
 * a autoria (OWASP API5, BFLA). Um comentario alterado por outra pessoa deixa de
 * ser registro do que aquela pessoa disse, que e a unica coisa que ele e.
 */
function comment_owned(string $id, array $user): ?array
{
    $row = db()->fetch('SELECT id, lead_id, user_id FROM lead_comments WHERE id = ?', [$id]);
    if ($row === null) {
        Http::fail('not_found', 404);
        return null;
    }
    if ($row['user_id'] !== $user['id']) {
        Http::fail('comentario_de_outro_autor', 403);
        return null;
    }
    return $row;
}

Http::route('PATCH', '/api/admin/comments/{id}', function (array $args) {
    $user = require_auth();
    if (comment_owned($args['id'], $user) === null) {
        return;
    }
    [$body, $erro] = comment_body_check(Http::body());
    if ($erro !== null) {
        Http::fail($erro, 422);
        return;
    }
    // `edited_at` fica visivel no painel: editar em silencio apagaria a diferenca
    // entre o que foi dito na hora e o que foi reescrito depois.
    db()->run('UPDATE lead_comments SET body = ?, edited_at = NOW() WHERE id = ?', [$body, $args['id']]);
    Http::json(['ok' => true]);
});

Http::route('DELETE', '/api/admin/comments/{id}', function (array $args) {
    $user = require_auth();
    if (comment_owned($args['id'], $user) === null) {
        return;
    }
    db()->run('DELETE FROM lead_comments WHERE id = ?', [$args['id']]);
    Http::json(['ok' => true]);
});
