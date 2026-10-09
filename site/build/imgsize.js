/**
 * Dimensões intrínsecas de um WebP local, lidas do cabeçalho no build.
 *
 * Serve para emitir `width`/`height` em toda imagem de conteúdo. Sem esses
 * atributos o navegador não reserva espaço antes do download e a página salta
 * quando a imagem chega — é a origem de CLS que o CLAUDE.md manda aniquilar.
 *
 * Ler do arquivo em vez de manter uma tabela evita deriva quando a imagem é
 * trocada pelo painel.
 */
import { readFileSync } from 'node:fs';

const cache = new Map();

/** @returns {{width:number,height:number}|null} */
function parse(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  switch (buf.toString('ascii', 12, 16)) {
    // Lossy: dimensões em 14 bits logo após o start code do quadro-chave.
    case 'VP8 ':
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };

    // Lossless: 14 bits cada, empacotados a partir do bit 0 de um u32.
    case 'VP8L': {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }

    // Estendido (animação, alfa, metadados): 24 bits cada, menos um.
    case 'VP8X':
      return {
        width: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
        height: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
      };

    default:
      return null;
  }
}

/**
 * @param {string} src caminho absoluto do site, ex. `/img/ayla-pose.webp`
 * @returns {{width:number,height:number}|null} null para URL remota, formato
 *   desconhecido ou arquivo ausente — nesse caso o chamador omite os atributos
 *   em vez de chutar uma proporção errada, que causaria o salto que queremos evitar.
 */
export function imgSize(src) {
  if (cache.has(src)) return cache.get(src);

  // `/uploads/` sai do painel e vive no backend, não em site/public. Sem este
  // caso, toda foto enviada pelo CMS ia para o HTML sem width/height — o CLS
  // que o resto deste arquivo existe para evitar.
  // ponytail: leitura do disco, assume site e API no mesmo host. Se o build
  // migrar para outra máquina, trocar por um Range request dos 30 primeiros bytes.
  const base = src.startsWith('/uploads/') ? '../../backend/public' : '../public';

  let size = null;
  if (src.startsWith('/') && /\.webp$/i.test(src)) {
    try {
      size = parse(readFileSync(new URL(`${base}${src}`, import.meta.url)));
    } catch {
      size = null;
    }
  }

  cache.set(src, size);
  return size;
}
