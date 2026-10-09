<?php
declare(strict_types=1);

/** Check minimo, sem framework: roda com `php tests/smoke.php`. Precisa do DB para as checagens de sessao. */

// `zend.assertions` so pode ser ligado no arranque do processo. Com o valor de
// producao (-1) toda assercao abaixo e removida na compilacao e o teste passa
// sem testar nada: reexecuta a si mesmo com o flag ligado.
if (ini_get('zend.assertions') !== '1') {
    passthru(
        escapeshellarg(PHP_BINARY) . ' -d zend.assertions=1 -d assert.exception=1 '
        . escapeshellarg(__FILE__),
        $code
    );
    exit($code);
}

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/app.php';
require __DIR__ . '/../src/http.php';
require __DIR__ . '/../src/security.php';

$_ENV['JWT_SECRET'] = 'test-secret-test-secret-test-secret-32';

// UUIDv4 bem formado
assert((bool) preg_match(
    '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
    uuid4()
), 'uuid4 formato');

// RFC 8725: token com alg=none e rejeitado antes de qualquer consulta
$none = rtrim(strtr(base64_encode('{"alg":"none","typ":"JWT"}'), '+/', '-_'), '=') . '.'
      . rtrim(strtr(base64_encode('{"sub":"x","exp":' . (time() + 60) . '}'), '+/', '-_'), '=') . '.';
assert(jwt_verify($none) === null, 'jwt alg=none rejeitado');

// token malformado tambem
assert(jwt_verify('nao.e.jwt') === null, 'jwt malformado rejeitado');

// Auditoria: IP truncado nunca identifica o host exato
$_SERVER['REMOTE_ADDR'] = '203.0.113.47';
assert(ip_sanitized() === '203.0.113.0', 'ipv4 truncado em /24');
$_SERVER['REMOTE_ADDR'] = '2001:db8:85a3:8d3:1319:8a2e:370:7348';
assert(ip_sanitized() === '2001:db8:85a3::', 'ipv6 truncado em /48');
$_SERVER['REMOTE_ADDR'] = 'lixo';
assert(ip_sanitized() === '0.0.0.0', 'ip invalido nao vaza');

// request_id estavel dentro da requisicao
assert(request_id() === request_id(), 'request_id estavel');

// Validacao de slug das coleccoes (routes.php nao e carregado aqui: so a funcao)
require __DIR__ . '/../src/validation.php';

assert(blocks_slug_errors(['posts' => [['slug' => 'a'], ['slug' => 'b']]]) === [], 'slugs validos passam');
assert(count(blocks_slug_errors(['posts' => [['slug' => '']]])) === 1, 'slug vazio barrado');
assert(count(blocks_slug_errors(['posts' => [['slug' => 'Com Espaco']]])) === 1, 'slug com maiuscula/espaco barrado');
assert(count(blocks_slug_errors(['posts' => [['slug' => 'a'], ['slug' => 'a']]])) === 1, 'slug repetido barrado');
assert(blocks_slug_errors(['lead' => 'texto', 'contact' => ['phone' => 'x']]) === [], 'bloco sem slug ignorado');
assert(blocks_slug_errors(['planned' => ['texto', 'outro']]) === [], 'lista de strings ignorada');

// Conversions API: normalizacao de telefone e hash
require __DIR__ . '/../src/capi.php';

assert(phone_digits('(33) 99999-9999') === '5533999999999', 'celular com DDD ganha o 55');
assert(phone_digits('3333334444') === '553333334444', 'fixo com DDD ganha o 55');
assert(phone_digits('+55 33 99999-9999') === '5533999999999', 'numero ja com pais nao duplica o 55');
assert(phone_digits('') === '55', 'vazio nao quebra');

assert(capi_hash('') === '', 'vazio nunca vira hash de string vazia');
assert(capi_hash('  ALGUEM@Exemplo.COM ') === capi_hash('alguem@exemplo.com'), 'email normalizado antes do hash');
assert(strlen(capi_hash('x')) === 64, 'sha256 em hexadecimal');

// Questionarios por servico: schema unico, compartilhado com o build do site
/** Opcao valida vinda do proprio schema: rotulo digitado a mao aqui diverge dele. */
$opcao = function (string $campo, int $i): string {
    foreach (forms_schema()['edificacoes']['fields'] as $f) {
        if ($f['id'] === $campo) {
            return $f['options'][$i];
        }
    }
    throw new RuntimeException("campo inexistente no schema: {$campo}");
};

$base = [
    'email' => 'a@b.com', 'cliente' => 'X', 'telefone' => '33998887766',
    'endereco' => 'R', 'cidade' => 'Governador Valadares / MG', 'atividade' => 'Y', 'area_m2' => '10', 'altura_m' => '3',
    'tipo_estrutura' => 'Mista', 'cnpj_cpf' => '1',
    'data_construcao' => $opcao('data_construcao', 0),
    'liquido_combustivel' => 'Sim', 'subsolo_outro_uso' => 'Sim', 'glp_acima_190kg' => 'Sim',
    'uso_autonomo' => 'Sim', 'lotacao_acima_100' => 'Sim',
    'atividade_risco_iii' => $opcao('atividade_risco_iii', 16),
];

assert(form_answers_check('edificacoes', $base)[1] === [], 'questionario completo passa');

assert(forms_schema() !== [], 'schema de formularios carregado');
assert(isset(
    forms_schema()['edificacoes'],
    forms_schema()['inss'],
    forms_schema()['eventos'],
    forms_schema()['brigada'],
), 'os quatro questionarios existem');

/** Preenche um questionario so com o que ele exige, usando o proprio schema. */
$minimo = function (string $key): array {
    $out = [];
    foreach (forms_schema()[$key]['fields'] as $f) {
        if (empty($f['required'])) {
            continue;
        }
        $out[$f['id']] = match ($f['type']) {
            'email'  => 'a@b.com',
            'tel'    => '33998887766',
            'number' => '10',
            'radio'  => $f['options'][0],
            default  => 'x',
        };
    }
    return $out;
};

// Todo questionario tem de passar quando preenchido com o minimo que ele mesmo declara,
// senao ha campo obrigatorio que nenhum visitante consegue satisfazer.
foreach (['edificacoes', 'inss', 'eventos', 'brigada'] as $key) {
    [, $err] = form_answers_check($key, $minimo($key));
    assert($err === [], "questionario {$key} rejeita o proprio minimo: " . implode(',', $err));
}

/* O lead exige nome, telefone e demanda (routes.php). Um questionario cujo `map`
   nao alcance nome e telefone entrega 422 `campos_obrigatorios` ao visitante que
   preencheu tudo certo — falha invisivel ate alguem tentar enviar. */
foreach (['edificacoes', 'inss', 'eventos', 'brigada'] as $key) {
    $form = forms_schema()[$key];
    $ids = array_column($form['fields'], 'id', 'id');
    foreach (['name_company', 'phone', 'city'] as $coluna) {
        $campo = $form['map'][$coluna] ?? null;
        assert($campo !== null, "{$key}: map nao preenche {$coluna}");
        assert(isset($ids[$campo]), "{$key}: map aponta para campo inexistente {$campo}");
        assert(!empty($form['fields'][array_search($campo, array_column($form['fields'], 'id'), true)]['required']),
            "{$key}: o campo {$campo} alimenta {$coluna} do lead e precisa ser obrigatorio");
    }
}

// Brigada: o Google Forms original escrevia "Contreto".
$brigada = array_column(forms_schema()['brigada']['fields'], null, 'id');
assert(in_array('Concreto', $brigada['tipo_estrutura']['options'], true), 'typo Contreto corrigido');

// Um schema pode servir mais de uma pagina: edificacoes atende projetos e consultoria.
assert(forms_schema()['eventos']['service'] === 'eventos', 'eventos tem pagina de servico');
assert(forms_schema()['edificacoes']['service'] === ['projetos', 'consultoria'], 'edificacoes atende as duas paginas');

[, $err] = form_answers_check('nao-existe', []);
assert(count($err) === 1, 'formulario desconhecido barrado');

[, $err] = form_answers_check('edificacoes', array_diff_key($base, ['cliente' => null]));
assert(in_array('obrigatorio:cliente', $err, true), 'campo obrigatorio ausente barrado');

[, $err] = form_answers_check('edificacoes', ['email' => 'nao-e-email'] + $base);
assert(in_array('email_invalido:email', $err, true), 'email do questionario validado');

[, $err] = form_answers_check('edificacoes', ['area_m2' => 'texto'] + $base);
assert(in_array('numero_invalido:area_m2', $err, true), 'numero do questionario validado');

[, $err] = form_answers_check('edificacoes', ['data_construcao' => 'opcao inventada'] + $base);
assert(in_array('opcao_invalida:data_construcao', $err, true), 'opcao fora da lista barrada');

// `other: true` libera texto livre; sem a flag, a opcao fora da lista e barrada
[$ok, $err] = form_answers_check('edificacoes', ['tipo_estrutura' => 'Taipa'] + $base);
assert($err === [] && $ok['tipo_estrutura'] === 'Taipa', 'radio com other aceita texto livre');

[$ok, $err] = form_answers_check('edificacoes', ['campo_injetado' => 'x'] + $base);
assert($err === [] && !isset($ok['campo_injetado']), 'campo fora do schema e descartado');

// CSRF double-submit: a rota devolve 419 quando csrf_check() falha (routes.php:19).
$_COOKIE['csrf'] = str_repeat('a', 64);
unset($_SERVER['HTTP_X_CSRF_TOKEN']);
assert(csrf_check() === false, 'sem header X-CSRF-Token nao passa');

$_SERVER['HTTP_X_CSRF_TOKEN'] = str_repeat('b', 64);
assert(csrf_check() === false, 'header divergente do cookie nao passa');

$_SERVER['HTTP_X_CSRF_TOKEN'] = $_COOKIE['csrf'];
assert(csrf_check() === true, 'header igual ao cookie passa');

$_COOKIE['csrf'] = '';
assert(csrf_check() === false, 'cookie vazio nao passa nem com header vazio igual');

// Upload: o formato vem do conteudo do arquivo, nunca da extensao. Um .php
// renomeado para .jpg cai em image_probe() === null -> 422 formato_nao_suportado.
$tmp = sys_get_temp_dir() . '/smoke-' . uuid4();

file_put_contents("{$tmp}.jpg", '<?php system($_GET["c"]); ?>');
assert(image_probe("{$tmp}.jpg") === null, 'php renomeado para .jpg e recusado');

file_put_contents("{$tmp}.txt", '');
assert(image_probe("{$tmp}.txt") === null, 'arquivo vazio e recusado');
assert(image_probe("{$tmp}-inexistente") === null, 'arquivo ausente nao quebra');

// GIF e imagem de verdade, mas nao esta na lista dos tres formatos suportados.
file_put_contents("{$tmp}.gif", base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'));
assert(image_probe("{$tmp}.gif") === null, 'formato fora da lista e recusado');

if (function_exists('imagepng')) {
    $png = imagecreatetruecolor(7, 3);
    imagepng($png, "{$tmp}.png");
    imagedestroy($png);
    assert(image_probe("{$tmp}.png") === ['imagecreatefrompng', 7, 3], 'png real passa com as dimensoes');

    // O nome mente, o conteudo nao: png com extensao .jpg continua sendo lido como png.
    copy("{$tmp}.png", "{$tmp}-mentiroso.jpg");
    assert(image_probe("{$tmp}-mentiroso.jpg")[0] === 'imagecreatefrompng', 'leitor vem do conteudo, nao da extensao');
}

array_map('unlink', glob("{$tmp}*") ?: []);

// --- galeria: uma variante por largura, e nunca ampliada -------------------
if (function_exists('imagewebp')) {
    $dir = sys_get_temp_dir() . '/gotelip-galeria-' . getmypid();
    mkdir($dir);
    $_ENV['UPLOAD_DIR'] = $dir;

    $origem = imagecreatetruecolor(1000, 500);
    $nome = image_variants($origem, [1200, 600]);
    imagedestroy($origem);

    assert(str_ends_with($nome, '-1200.webp'), 'a canonica e a primeira largura pedida');
    // 1200 e maior que a origem: a variante sai no tamanho original, sem esticar.
    assert(getimagesize("{$dir}/{$nome}")[0] === 1000, 'largura maior que a origem nao amplia');
    assert(getimagesize("{$dir}/" . str_replace('-1200', '-600', $nome))[0] === 600, 'variante menor e reduzida');

    array_map('unlink', glob("{$dir}/*") ?: []);
    rmdir($dir);
    unset($_ENV['UPLOAD_DIR']);
}

echo "smoke ok\n";
