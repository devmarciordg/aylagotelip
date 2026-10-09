import { useState } from 'react';
import { api, API_BASE } from './api';
import { Editor } from './Editor';
import { ICON_NAMES, fieldHint, fieldLabel } from './labels';
import { ARROW, CHEVRON, Icon, PLUS, TRASH } from './icons';

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/**
 * Novo item de um array: a mesma forma do primeiro, com os valores zerados.
 * A forma importa — o build do site descarta blocos cuja forma difira do seed
 * (site/vite.config.js), e o descarte é silencioso no HTML publicado.
 */
export function blank(v: Json, key = ''): Json {
  // Lista guarda um item em branco: sem ele o painel perde a forma e o botão
  // "Adicionar" nasce travado (ArrayField só sabe clonar value[0]).
  if (Array.isArray(v)) return v.length ? [blank(v[0])] : [];
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x, k)]));
  }
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  // Data de publicação nasce com hoje: em branco, o artigo cai no fim do índice
  // (que ordena por data) e some do arquivo cronológico sem avisar.
  if (key === 'date') return hoje();
  if (key === 'dateLabel') return dataPorExtenso(hoje());
  return '';
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** `2026-09-08` → `8 de setembro de 2026`. Fatiar a string em vez de `new Date()`
 *  evita o deslocamento de fuso, que jogaria a publicação para o dia anterior. */
export function dataPorExtenso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
}

export const hoje = () => new Date().toLocaleDateString('sv-SE');

/** Tags que não separam palavras: `<b>pa</b>lavra` é uma palavra, não duas. */
const INLINE = /<\/?(?:a|b|i|u|s|em|strong|span|code|small|mark|sub|sup|abbr|cite|q|br)\b[^>]*>/gi;

/**
 * Tempo de leitura a partir do corpo em HTML.
 *
 * 200 palavras por minuto é a média de leitura em português para texto corrido.
 * Cada imagem soma tempo de olhar: 12s na primeira, caindo até um piso de 3s
 * (heurística do Medium) — num post de obra as fotos são metade do conteúdo.
 * Arredonda para cima e nunca devolve zero: "0 min de leitura" seria pior que
 * não mostrar nada.
 */
export function tempoDeLeitura(html: string): string {
  const limpo = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(INLINE, '');
  const imagens = (limpo.match(/<img\b/gi) || []).length;
  const palavras = limpo
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (palavras === 0 && imagens === 0) return '';
  let segundos = (palavras / 200) * 60;
  for (let i = 0; i < imagens; i++) segundos += Math.max(3, 12 - i);
  return `${Math.max(1, Math.ceil(segundos / 60))} min de leitura`;
}

/** As categorias de uma linha separada por vírgula, como o site as renderiza. */
export const categorias = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

/** Legenda com a dica do campo, quando o nome sozinho não basta. */
function FieldLabel({ name }: { name: string }) {
  const hint = fieldHint(name);
  return (
    <span className="field-head">
      {fieldLabel(name)}
      {hint && <small className="hint">{hint}</small>}
    </span>
  );
}

/** Ícone: lista fechada. Texto livre fora da lista cai no ícone padrão sem avisar. */
function IconField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <FieldLabel name="icon" />
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!ICON_NAMES.includes(value as (typeof ICON_NAMES)[number]) && (
          <option value={value}>{value || '— nenhum —'}</option>
        )}
        {ICON_NAMES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Campo calculado pelo painel: mostrado, nunca digitado.
 *
 * Endereço, data por extenso e tempo de leitura saem do título, da data e do
 * corpo. Deixá-los editáveis criava duas versões da mesma informação — um
 * artigo com título "Custos do AVCB" e endereço `/blog/notificacao/` era
 * exatamente o tipo de deriva que o site publicava sem reclamar.
 */
function DerivedField({ name, value, vazio }: { name: string; value: string; vazio: string }) {
  return (
    <div className="derived">
      <span className="derived__label">{fieldLabel(name)}</span>
      <p className={value ? 'derived__value' : 'derived__value derived__value--vazio'}>
        {value || vazio}
      </p>
      <small className="hint">{fieldHint(name)}</small>
    </div>
  );
}

/** Data: o seletor nativo do navegador já traz calendário, teclado e leitor de tela. */
function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="date-field">
      <FieldLabel name="date" />
      <span className="row">
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
        {value !== hoje() && (
          <button type="button" onClick={() => onChange(hoje())}>
            Hoje
          </button>
        )}
      </span>
    </label>
  );
}

/** Categorias: uma linha separada por vírgula, com as etiquetas resultantes à vista. */
function TagField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tags = categorias(value);
  return (
    <label>
      <FieldLabel name="tag" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Regularização, Custos"
      />
      {tags.length > 0 && (
        <span className="chips" aria-label={`${tags.length} categoria(s) no site`}>
          {tags.map((t) => (
            <span className="chip" key={t}>
              #{t}
            </span>
          ))}
        </span>
      )}
    </label>
  );
}

/** Campo de imagem: aceita caminho digitado ou upload, que a API devolve em WebP. */
function ImageField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  function pick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const body = new FormData();
      body.append('file', file);
      setBusy(true);
      setErro('');
      try {
        const { url } = await api<{ url: string }>('/api/admin/uploads', { method: 'POST', body });
        onChange(url);
      } catch (e) {
        // Erro inline, nunca alert(): o alert trava a aba e some com o contexto do campo.
        setErro(
          (e as Error).message === 'arquivo_muito_grande'
            ? 'Imagem acima de 8 MB. Reduza o arquivo e envie de novo.'
            : 'Não foi possível enviar a imagem. Tente novamente.',
        );
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }

  return (
    <label>
      <FieldLabel name={name} />
      <span className="row">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/uploads/arquivo.webp"
        />
        <button type="button" onClick={pick} disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar imagem'}
        </button>
      </span>
      {erro && (
        <small className="hint hint--error" role="alert">
          {erro}
        </small>
      )}
      {value.startsWith('/uploads/') && <img className="thumb" src={API_BASE + value} alt="" />}
    </label>
  );
}

/** Título da linha fechada do acordeão: o primeiro campo do item que sirva de nome. */
export function itemLabel(v: Json, i: number): string {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const k of ['title', 'label', 'q', 'slug', 'stage', 'value']) {
      const s = v[k];
      if (typeof s === 'string' && s !== '') return s;
    }
  }
  if (typeof v === 'string' && v !== '') return v.slice(0, 60);
  return `Item ${i + 1}`;
}

function ArrayField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Json[];
  onChange: (v: Json[]) => void;
}) {
  // ponytail: um item aberto por vez. Também evita montar N editores Quill de uma vez.
  const [open, setOpen] = useState<number | null>(null);

  const replace = (i: number, v: Json) => onChange(value.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    setOpen(null);
  };
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    setOpen(i + d);
  };
  const add = () => {
    onChange([...value, blank(value[0])]);
    setOpen(value.length);
  };

  return (
    <fieldset className="block">
      <legend>
        {fieldLabel(name)} <span className="count">{value.length}</span>
      </legend>
      {fieldHint(name) && <p className="hint">{fieldHint(name)}</p>}

      {value.map((item, i) => (
        <div className="item" key={i}>
          <div className="item-bar">
            <button
              type="button"
              className="item-open"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
            >
              <Icon d={CHEVRON} rotate={open === i ? 90 : 0} />
              <span>{itemLabel(item, i)}</span>
            </button>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Mover ${itemLabel(item, i)} para cima`}
              title="Mover para cima"
            >
              <Icon d={ARROW} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === value.length - 1}
              aria-label={`Mover ${itemLabel(item, i)} para baixo`}
              title="Mover para baixo"
            >
              <Icon d={ARROW} rotate={180} />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Excluir ${itemLabel(item, i)}`}
              title="Excluir"
            >
              <Icon d={TRASH} />
            </button>
          </div>
          {open === i && (
            // Item primitivo herda o nome do array: e o que faz `proofSlots`
            // (lista de strings de imagem) ganhar o botao de upload.
            <Field
              name={item !== null && typeof item === 'object' ? '' : name}
              value={item}
              onChange={(v) => replace(i, v)}
            />
          )}
        </div>
      ))}

      <button type="button" className="add" onClick={add} disabled={value.length === 0}>
        <Icon d={PLUS} />
        Adicionar item
      </button>
      {value.length === 0 && (
        <p className="hint">
          Lista vazia. O formato do item vem do conteúdo original do site — rode{' '}
          <code>npm run sync</code> para recriá-lo.
        </p>
      )}
    </fieldset>
  );
}

/**
 * Recalcula o que depende do campo alterado.
 *
 * Um único lugar decide: o endereço vem do título, a data por extenso vem da
 * data e o tempo de leitura vem do corpo. Espalhar isso pelos campos deixaria
 * cada um livre para discordar do outro.
 */
function derive(o: { [k: string]: Json }, k: string, v: Json): { [k: string]: Json } {
  const next = { ...o, [k]: v };
  if (typeof v !== 'string') return next;
  if (k === 'title' && 'slug' in o) next.slug = slugify(v);
  if (k === 'date' && 'dateLabel' in o) next.dateLabel = dataPorExtenso(v);
  if (k === 'body' && 'readTime' in o) next.readTime = tempoDeLeitura(v);
  return next;
}

/**
 * Alinha os campos calculados ao que os gera, na carga da lista.
 *
 * Só `dateLabel` e `readTime`: ambos são formato puro do que está ao lado, então
 * recalcular não inventa nada. **`slug` fica de fora de propósito** — derivá-lo
 * do título na carga reescreveria o endereço de artigos já publicados e cada
 * link compartilhado viraria 404. O endereço só muda quando alguém muda o
 * título, que é uma ação deliberada.
 */
export function normalizarDerivados(v: Json): Json {
  if (Array.isArray(v)) return v.map(normalizarDerivados);
  if (!v || typeof v !== 'object') return v;
  const o: { [k: string]: Json } = {};
  for (const [k, x] of Object.entries(v)) o[k] = normalizarDerivados(x);
  if ('dateLabel' in o && typeof o.date === 'string') o.dateLabel = dataPorExtenso(o.date);
  if ('readTime' in o && typeof o.body === 'string') o.readTime = tempoDeLeitura(o.body);
  return o;
}

export function Field({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Json;
  onChange: (v: Json) => void;
}) {
  if (Array.isArray(value)) return <ArrayField name={name} value={value} onChange={onChange} />;

  if (value && typeof value === 'object') {
    const obj = value;
    const derivado = (k: string) =>
      (k === 'slug' && 'title' in obj) ||
      (k === 'dateLabel' && 'date' in obj) ||
      (k === 'readTime' && 'body' in obj);

    return (
      <fieldset className="block">
        {name !== '' && <legend>{fieldLabel(name)}</legend>}
        {name !== '' && fieldHint(name) && <p className="hint">{fieldHint(name)}</p>}
        {Object.entries(obj).map(([k, v]) =>
          derivado(k) ? (
            <DerivedField
              key={k}
              name={k}
              value={typeof v === 'string' ? v : ''}
              vazio={
                k === 'slug'
                  ? 'Preencha o título para gerar o endereço.'
                  : k === 'readTime'
                    ? 'Escreva o corpo do artigo para calcular.'
                    : 'Escolha a data de publicação.'
              }
            />
          ) : (
            <Field key={k} name={k} value={v} onChange={(nv) => onChange(derive(obj, k, nv))} />
          ),
        )}
      </fieldset>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <label className="inline">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {fieldLabel(name)}
      </label>
    );
  }

  if (typeof value === 'number') {
    return (
      <label>
        <FieldLabel name={name} />
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </label>
    );
  }

  const s = value ?? '';
  if (name === 'icon') return <IconField value={s} onChange={onChange} />;
  if (name === 'date') return <DateField value={s} onChange={onChange} />;
  if (name === 'tag') return <TagField value={s} onChange={onChange} />;
  if (name === 'href') {
    return (
      <label>
        <FieldLabel name={name} />
        <input list="rotas-do-site" value={s} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  // Quill só onde o conteúdo é HTML. `body` entra pelo nome: um post novo nasce
  // com a string vazia e ainda assim precisa do editor rico.
  if (s.includes('<') || name === 'body') {
    return (
      <label>
        <FieldLabel name={name} />
        <Editor value={s} onChange={onChange} />
      </label>
    );
  }
  if (/photo|image|cover|slot/i.test(name)) {
    return <ImageField name={name} value={s} onChange={onChange} />;
  }
  if (s.length > 120 || s.includes('\n')) {
    return (
      <label>
        <FieldLabel name={name} />
        <textarea rows={3} value={s} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  return (
    <label>
      <FieldLabel name={name} />
      <input value={s} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
