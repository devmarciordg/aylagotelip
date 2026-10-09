<?php
declare(strict_types=1);

/** Regras de integridade do conteudo, compartilhadas por rotas e testes. */

/**
 * Schemas dos questionarios por servico.
 *
 * Mesmo arquivo que o build do site le para desenhar os campos. Um schema por
 * servico em dois lugares diverge sem ninguem perceber: o site mostraria um campo
 * que a API rejeita, ou aceitaria um que ninguem ve.
 */
function forms_schema(): array
{
    static $schema = null;
    if ($schema === null) {
        $file = dirname(__DIR__) . '/shared/forms.json';
        $raw = is_file($file) ? file_get_contents($file) : '';
        $schema = json_decode((string) $raw, true) ?: [];
        unset($schema['_leia_me']);
    }
    return $schema;
}

/**
 * Valida as respostas de um questionario contra o schema.
 *
 * Devolve as respostas limpas, so com os campos que o schema declara - a mesma
 * ideia do DTO dos leads, aplicada a um formulario de forma variavel.
 *
 * @return array{0: array<string,string>, 1: string[]} respostas limpas e erros
 */
function form_answers_check(string $formKey, array $answers): array
{
    $form = forms_schema()[$formKey] ?? null;
    if ($form === null) {
        return [[], ["formulario_desconhecido:{$formKey}"]];
    }

    $clean = [];
    $errors = [];

    foreach ($form['fields'] as $field) {
        $id = $field['id'];
        $value = trim((string) ($answers[$id] ?? ''));

        if ($value === '') {
            if (!empty($field['required'])) {
                $errors[] = "obrigatorio:{$id}";
            }
            continue;
        }
        if (mb_strlen($value) > 2000) {
            $errors[] = "muito_longo:{$id}";
            continue;
        }

        switch ($field['type']) {
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "email_invalido:{$id}";
                    continue 2;
                }
                break;
            case 'number':
                if (!is_numeric(str_replace(',', '.', $value))) {
                    $errors[] = "numero_invalido:{$id}";
                    continue 2;
                }
                break;
            case 'tel':
                if (preg_match('/^\d{10,13}$/', phone_digits($value)) !== 1) {
                    $errors[] = "telefone_invalido:{$id}";
                    continue 2;
                }
                break;
            case 'radio':
                // `other: true` permite texto livre; sem isso, so o que esta na lista.
                if (empty($field['other']) && !in_array($value, $field['options'] ?? [], true)) {
                    $errors[] = "opcao_invalida:{$id}";
                    continue 2;
                }
                break;
        }

        $clean[$id] = $value;
    }

    return [$clean, $errors];
}

/**
 * Todo item de coleccao com `slug` vira uma rota estatica no build do site.
 * Slug vazio, com caractere fora de [a-z0-9-] ou repetido gera `/blog//` ou duas
 * paginas no mesmo caminho - o build quebra depois, longe de quem digitou.
 *
 * @return string[] lista vazia quando esta tudo certo
 */
function blocks_slug_errors(array $blocks): array
{
    $errors = [];
    foreach ($blocks as $name => $value) {
        if (!is_array($value) || !array_is_list($value)) {
            continue;
        }
        $slugs = [];
        foreach ($value as $i => $item) {
            if (!is_array($item) || !array_key_exists('slug', $item)) {
                continue;
            }
            $slug = (string) $item['slug'];
            if (preg_match('/^[a-z0-9-]+$/', $slug) !== 1) {
                $errors[] = sprintf('%s[%d]: slug invalido "%s"', $name, $i + 1, $slug);
            }
            $slugs[] = $slug;
        }
        foreach (array_unique(array_diff_assoc($slugs, array_unique($slugs))) as $dup) {
            $errors[] = "{$name}: slug repetido \"{$dup}\"";
        }
    }
    return $errors;
}

/**
 * Formato aceito no upload, decidido pelo conteudo do arquivo — nunca pelo nome
 * ou pelo mime que o cliente manda. Devolve [funcao_leitora, largura, altura]
 * ou null quando o arquivo nao e uma imagem dos tres formatos suportados.
 */
function image_probe(string $path): ?array
{
    $info = @getimagesize($path);
    $reader = [
        IMAGETYPE_JPEG => 'imagecreatefromjpeg',
        IMAGETYPE_PNG  => 'imagecreatefrompng',
        IMAGETYPE_WEBP => 'imagecreatefromwebp',
    ][$info[2] ?? 0] ?? null;

    return $reader === null ? null : [$reader, $info[0], $info[1]];
}

/** Pasta onde as fotos do painel sao gravadas e servidas. */
function uploads_dir(): string
{
    return env('UPLOAD_DIR') ?? dirname(__DIR__) . '/public/uploads';
}

/**
 * Nomes de arquivo que alguma pagina referencia, como chaves.
 *
 * A unica coisa que aponta para `/uploads/` e a coluna `blocks` de `pages` --
 * `projects` e `posts` foram removidas na migracao 002 e leads nao guardam
 * imagem. Entao a varredura do JSON bruto de todas as paginas e a lista
 * completa do que esta em uso, em qualquer profundidade do bloco.
 *
 * @return array<string,true>
 */
function uploads_em_uso(): array
{
    $em_uso = [];
    foreach (db()->all('SELECT blocks FROM pages') as $row) {
        preg_match_all('#/uploads/([\w.-]+)#', (string) $row['blocks'], $m);
        foreach ($m[1] as $nome) {
            $em_uso[$nome] = true;
        }
    }
    return $em_uso;
}

/**
 * Apaga as fotos que nenhuma pagina referencia.
 *
 * O periodo de carencia nao e detalhe: o painel sobe a imagem no instante em
 * que ela e inserida no editor e so grava a pagina quando alguem clica em
 * salvar. Sem a carencia, a coleta disparada pelo proprio upload apagaria o
 * arquivo recem-enviado antes de ele chegar a ser referenciado.
 *
 * @return string[] nomes removidos
 */
function uploads_gc(int $carencia_segundos = 86400): array
{
    $dir = uploads_dir();
    if (!is_dir($dir)) {
        return [];
    }

    $em_uso = uploads_em_uso();

    $removidos = [];
    $agora = time();
    foreach (scandir($dir) ?: [] as $nome) {
        if (!str_ends_with($nome, '.webp') || isset($em_uso[$nome])) {
            continue;
        }
        $caminho = "{$dir}/{$nome}";
        if (!is_file($caminho) || $agora - (int) filemtime($caminho) < $carencia_segundos) {
            continue;
        }
        if (@unlink($caminho)) {
            $removidos[] = $nome;
        }
    }

    return $removidos;
}

/**
 * Larguras que cada posicao de imagem do site precisa, da maior para a menor.
 *
 * A pessoa que troca a foto no painel nao sabe (nem deveria) que a hero do
 * desktop cobre 1920px e a do celular 900, ou que o cartao da home mostra a
 * mesma foto de /servicos/ em 600. A tabela guarda isso: o upload gera uma
 * variante por largura e o site escolhe pela media query. Sem ela, ou a foto do
 * celular baixa 1920px, ou a do desktop sobe esticada.
 *
 * Os numeros saem das imagens que ja estavam no site (site/public/img).
 */
const GALLERY_SLOTS = [
    'hero-desktop'     => [1920],
    'hero-mobile'      => [900],
    'atendimento'      => [900],
    'sobre-retrato'    => [900],
    'sobre-escritorio' => [1200],
    'servico'          => [1200, 600],
];

/**
 * Grava a imagem em WebP numa variante por largura pedida.
 *
 * A menor nunca e ampliada: `imagescale` so entra quando a origem e maior que o
 * alvo, senao uma foto de 800px viraria um borrao de 1920.
 *
 * @param  int[]  $larguras da maior para a menor
 * @return string nome do arquivo da primeira largura (a canonica)
 */
function image_variants(GdImage $img, array $larguras): string
{
    $id = uuid4();
    $dir = uploads_dir();
    is_dir($dir) || mkdir($dir, 0775, true);
    imagepalettetotruecolor($img);

    foreach ($larguras as $w) {
        $saida = imagesx($img) > $w ? imagescale($img, $w) : $img;
        imagewebp($saida, "{$dir}/{$id}-{$w}.webp", 82);
        if ($saida !== $img) {
            imagedestroy($saida);
        }
    }

    return "{$id}-{$larguras[0]}.webp";
}

/**
 * Identidade de uma foto, sem a largura: `<uuid>-1200.webp` e `<uuid>-600.webp`
 * sao a mesma foto em dois recortes, e a biblioteca do painel lida com a foto,
 * nao com o recorte.
 */
function upload_id(string $nome): string
{
    return preg_replace('/(-\d+)?\.webp$/', '', $nome) ?? $nome;
}

/**
 * Os arquivos de uma foto no disco, uma entrada por largura gerada.
 *
 * @return string[] nomes de arquivo, vazio quando a foto nao existe
 */
function upload_variantes(string $id): array
{
    $dir = uploads_dir();
    return array_values(array_filter(
        scandir($dir) ?: [],
        fn ($nome) => str_ends_with($nome, '.webp') && upload_id($nome) === $id
    ));
}
