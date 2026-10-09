import { useRef, useState } from 'react';
import { api, API_BASE } from './api';
import { Campo, CampoLongo, Grupo } from './FormKit';
import { type Json } from './PageEditor';
import {
  ARROW,
  BUILDING,
  CHECK,
  IMAGE,
  Icon,
  LINK,
  NOTE,
  PIN,
  PLUS,
  SEAL,
  SHIELD,
  STAR,
  TAG,
  TRASH,
} from './icons';

/**
 * Editor de um projeto da vitrine.
 *
 * Um projeto não é uma pilha de dez campos de texto: é **uma foto com legenda**
 * na grade de `/projetos/`, que abre um modal com descrição, entregas e normas,
 * e que aparece na home quando marcado como destaque. O editor genérico não
 * sabe disso — desenhava os dez campos na ordem em que o MySQL devolve a chave
 * JSON, com o endereço da URL *antes* do título que o gera, o título em quinto
 * lugar e a foto como um caminho de texto sem imagem nenhuma à vista.
 *
 * Aqui a ordem é a de quem cadastra, os campos que formam o cartão estão juntos,
 * e o cartão montado fica ao lado deles.
 */

const texto = (v: Json | undefined) => (typeof v === 'string' ? v : '');

/** Caminho de imagem servido pela API (`/uploads/…`) ou pelo próprio site (`/img/…`). */
const urlDaFoto = (p: string) =>
  p.startsWith('/uploads/') ? API_BASE + p : p;

/**
 * Foto: o campo que mais importa nesta tela, porque é ele que a vitrine mostra.
 *
 * O editor genérico só desenhava a miniatura de `/uploads/`, então as fotos que
 * vieram com o site (`/img/projetos.webp`) não apareciam em lugar nenhum e a
 * única forma de saber qual imagem estava no cartão era abrir o site publicado.
 */
function Foto({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [quebrou, setQuebrou] = useState(false);

  function escolher() {
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
        setQuebrou(false);
        onChange(url);
      } catch (e) {
        // Erro inline, nunca alert(): o alert trava a aba e some com o contexto.
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
    <div className="pj-foto">
      <div className="pj-foto__quadro">
        {value && !quebrou ? (
          <img src={urlDaFoto(value)} alt="" onError={() => setQuebrou(true)} />
        ) : (
          <span className="pj-foto__vazio">
            <Icon d={IMAGE} size={22} />
            <span>{value ? 'Imagem não encontrada' : 'Sem foto'}</span>
          </span>
        )}
      </div>

      <div className="pj-foto__ctrl">
        <Campo
          icon={IMAGE}
          label="Foto do projeto"
          value={value}
          onChange={(v) => {
            setQuebrou(false);
            onChange(v);
          }}
          placeholder="/img/projetos.webp"
          hint="Envie um arquivo ou cole o caminho. O envio converte para WebP."
        />
        <button type="button" onClick={escolher} disabled={busy}>
          <Icon d={IMAGE} />
          <span>{busy ? 'Enviando…' : 'Enviar imagem'}</span>
        </button>
        {erro && (
          <small className="hint hint--error" role="alert">
            {erro}
          </small>
        )}
      </div>
    </div>
  );
}

/**
 * Entregas: uma lista de frases, editada como lista de frases.
 *
 * O editor genérico trata qualquer array igual, então cada entrega virava uma
 * linha fechada de acordeão: dois cliques e uma rolagem para corrigir uma
 * vírgula, com o texto cortado no meio enquanto fechada. São strings de uma
 * linha — a linha é o campo.
 */
function Entregas({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const ultimo = useRef<HTMLInputElement>(null);
  const [focar, setFocar] = useState(false);

  const trocar = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  const remover = (i: number) => onChange(value.filter((_, j) => j !== i));
  const mover = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="pj-lista">
      <ol className="pj-lista__itens">
        {value.map((item, i) => (
          <li key={i}>
            <span className="pj-lista__n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="ed-f__box">
              <Icon d={CHECK} />
              <input
                ref={focar && i === value.length - 1 ? ultimo : undefined}
                value={item}
                onChange={(e) => trocar(i, e.target.value)}
                placeholder="O que o cliente recebe nesta etapa"
                aria-label={`Entrega ${i + 1}`}
              />
            </span>
            <span className="pj-lista__acoes">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label={`Mover entrega ${i + 1} para cima`}
                title="Mover para cima"
              >
                <Icon d={ARROW} />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === value.length - 1}
                aria-label={`Mover entrega ${i + 1} para baixo`}
                title="Mover para baixo"
              >
                <Icon d={ARROW} rotate={180} />
              </button>
              <button
                type="button"
                onClick={() => remover(i)}
                aria-label={`Excluir entrega ${i + 1}`}
                title="Excluir"
              >
                <Icon d={TRASH} />
              </button>
            </span>
          </li>
        ))}
      </ol>

      {value.length === 0 && (
        <p className="hint">
          Sem entregas ainda. O modal do projeto esconde a seção inteira enquanto a lista estiver
          vazia.
        </p>
      )}

      <button
        type="button"
        className="pj-lista__add"
        onClick={() => {
          setFocar(true);
          onChange([...value, '']);
          requestAnimationFrame(() => ultimo.current?.focus());
        }}
      >
        <Icon d={PLUS} />
        <span>Adicionar entrega</span>
      </button>
    </div>
  );
}

/**
 * O cartão da vitrine, montado com os valores da tela.
 *
 * Cinco campos que só existem juntos e em outra página: a etiqueta fica *por
 * cima* da foto, a categoria acima do título, a linha de metadados abaixo. A
 * composição aqui é a mesma de site/build/pages.js (`projetos`, `.gallery`).
 */
function Cartao({ p }: { p: Record<string, string> }) {
  const [quebrou, setQuebrou] = useState(false);
  const foto = p.photo && !quebrou ? urlDaFoto(p.photo) : '';
  return (
    <div className="ed-preview" aria-label="Prévia do cartão na vitrine">
      <span className="ed-preview__tag">Como aparece na página de projetos</span>
      <div className="pj-card">
        <span className="pj-card__thumb">
          {foto ? (
            <img src={foto} alt="" onError={() => setQuebrou(true)} />
          ) : (
            <Icon d={IMAGE} size={22} />
          )}
          <span className="pj-card__badge">{p.badge || p.category || 'Ver detalhes'}</span>
        </span>
        <span className="pj-card__cap">
          {p.category && <span className="pj-card__cat">{p.category}</span>}
          <strong>{p.title || 'Título do projeto'}</strong>
          <span className="pj-card__meta">{p.meta}</span>
        </span>
      </div>
    </div>
  );
}

export function Projeto({ value, onChange }: { value: Json; onChange: (v: Json) => void }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, Json>;
  const p = Object.fromEntries(Object.keys(o).map((k) => [k, texto(o[k])])) as Record<
    string,
    string
  >;

  /** O endereço da URL sai do título, como no editor genérico (`derive`). */
  const set = (k: string, v: Json) => {
    const next = { ...o, [k]: v };
    if (k === 'title' && 'slug' in o && typeof v === 'string') {
      next.slug = v
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
    }
    onChange(next);
  };

  const entregas = Array.isArray(o.deliverables)
    ? (o.deliverables as Json[]).map((x) => texto(x))
    : [];

  return (
    <div className="ed pj">
      <Grupo
        icon={BUILDING}
        title="Identificação"
        note="O que a vitrine mostra antes do clique: foto, etiqueta, categoria, título e a linha de contexto."
      >
        <Foto value={p.photo ?? ''} onChange={(v) => set('photo', v)} />

        <Campo
          icon={BUILDING}
          label="Título"
          value={p.title ?? ''}
          onChange={(v) => set('title', v)}
          placeholder="Projetos técnicos (PPCI)"
        />

        {'slug' in o && (
          <div className="derived">
            <span className="derived__label">
              <span className="ed-derived__head">
                <Icon d={LINK} size={13} />
                Endereço na vitrine
              </span>
            </span>
            <p className={p.slug ? 'derived__value' : 'derived__value derived__value--vazio'}>
              {p.slug ? `/projetos/#${p.slug}` : 'Preencha o título para gerar o endereço.'}
            </p>
            <small className="hint">
              Gerado do título. Mudar o título muda este endereço — quem já compartilhou o link cai
              na vitrine sem o projeto aberto.
            </small>
          </div>
        )}

        <div className="ed-linha ed-linha--2">
          <Campo
            icon={TAG}
            label="Categoria"
            value={p.category ?? ''}
            onChange={(v) => set('category', v)}
            hint="A linha acima do título, no cartão e no modal."
            placeholder="Projeto Técnico · CBMMG"
          />
          <Campo
            icon={SEAL}
            label="Etiqueta"
            value={p.badge ?? ''}
            onChange={(v) => set('badge', v)}
            hint="O selo sobre a foto. Vazio, o cartão usa a categoria."
            placeholder="Aprovação Militar"
          />
        </div>

        <Campo
          icon={PIN}
          label="Linha de contexto"
          value={p.meta ?? ''}
          onChange={(v) => set('meta', v)}
          hint="Onde foi e o que resolveu, em letra pequena sob o título."
          placeholder="Governador Valadares, MG · Dimensionamento e aprovação no CBMMG"
        />

        {'featured' in o && (
          <label className="pj-destaque">
            <input
              type="checkbox"
              checked={o.featured === true}
              onChange={(e) => set('featured', e.target.checked)}
            />
            <span className="pj-destaque__mark">
              <Icon d={STAR} size={17} />
            </span>
            <span className="pj-destaque__txt">
              <strong>Mostrar em destaque na home</strong>
              <small>
                Só a foto entra, na faixa de trabalhos recentes da página inicial. O cartão completo
                continua em /projetos/.
              </small>
            </span>
          </label>
        )}

        <Cartao p={p} />
      </Grupo>

      <Grupo
        icon={NOTE}
        title="Descrição"
        note="O texto que abre o modal quando alguém clica no cartão. Um parágrafo: o que foi feito e para quem serve."
      >
        <CampoLongo
          label="Descrição do projeto"
          rows={5}
          value={p.description ?? ''}
          onChange={(v) => set('description', v)}
          placeholder="Elaboração do Projeto de Prevenção e Combate a Incêndio e Pânico (PPCI) para…"
        />
      </Grupo>

      {'deliverables' in o && (
        <Grupo
          icon={CHECK}
          title="Entregas"
          note="A lista de itens do modal, um por linha. É o que responde “o que eu recebo” antes de o cliente ligar."
        >
          <Entregas value={entregas} onChange={(v) => set('deliverables', v)} />
        </Grupo>
      )}

      {'standards' in o && (
        <Grupo
          icon={SHIELD}
          title="Normas aplicadas"
          note="As Instruções Técnicas e NBRs que sustentam o serviço. Fecham o modal e são o que separa engenharia de promessa."
        >
          <CampoLongo
            label="Normas e instruções técnicas"
            rows={3}
            value={p.standards ?? ''}
            onChange={(v) => set('standards', v)}
            placeholder="Instruções Técnicas IT 01, IT 08 e IT 16 do CBMMG; NBR 13714 e NBR 9077."
          />
        </Grupo>
      )}
    </div>
  );
}
