import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { api, type Page } from './api';
import { Field, blank, itemLabel, normalizarDerivados, type Json } from './PageEditor';
import { INTERNAL_LINKS } from './labels';
import { ARROW, CHEVRON, Icon, PLUS, SEARCH, TRASH } from './icons';
import { PageHead } from './PageHead';

/** Itens por página. Oito cabem na altura útil da coluna sem rolagem em telas de trabalho. */
const POR_PAGINA = 8;

const texto = (v: Json | undefined) => (typeof v === 'string' ? v : '');

/** Os três dados que identificam uma linha fechada, quando o item os tiver. */
function linhaMeta(item: Json): string[] {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
  const o = item as Record<string, Json>;
  return [texto(o.dateLabel) || texto(o.date), texto(o.tag) || texto(o.category) || texto(o.badge)]
    .filter(Boolean)
    .map((s) => s.trim());
}

/** Busca em qualquer profundidade: quem procura digita o que lembra, não o nome do campo. */
function casa(item: Json, termo: string): boolean {
  if (typeof item === 'string') return item.toLowerCase().includes(termo);
  if (typeof item === 'number' || typeof item === 'boolean') return String(item).includes(termo);
  if (Array.isArray(item)) return item.some((v) => casa(v, termo));
  if (item && typeof item === 'object') return Object.values(item).some((v) => casa(v, termo));
  return false;
}

/**
 * Gerencia **uma** lista de conteúdo de uma página: artigos, projetos ou FAQ.
 *
 * A lista e o item aberto ficam lado a lado porque a tarefa real é comparar e
 * corrigir — ver o que já existe enquanto se edita um. O acordeão anterior
 * mostrava um item por vez e empurrava o resto da lista para fora da tela a
 * cada abertura, então achar "o artigo depois daquele de junho" custava fechar,
 * rolar e reabrir.
 */
export function Collection({
  slug,
  block,
  heading,
  icon,
  hint,
  singular,
  routeBase,
  editor: Editor,
}: {
  slug: string;
  block: string;
  heading: string;
  icon: string;
  hint: string;
  /** Nome de um item, no singular, para os botões e os estados vazios. */
  singular: string;
  /** Prefixo da rota publicada, quando cada item vira uma página do site. */
  routeBase?: string;
  /**
   * Editor desenhado para esta coleção. Sem ele o item cai no editor genérico,
   * que serve qualquer JSON e por isso não sabe a ordem nem o peso dos campos.
   */
  editor?: ComponentType<{ value: Json; onChange: (v: Json) => void; index: number; total: number }>;
}) {
  const [page, setPage] = useState<Page | null>(null);
  const [status, setStatus] = useState('');
  const [sujo, setSujo] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(0);
  const [aExcluir, setAExcluir] = useState<number | null>(null);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(null);
    setStatus('');
    setSujo(false);
    setSel(null);
    setBusca('');
    setPagina(0);
    api<Page>(`/api/pages/${slug}`)
      .then(setPage)
      .catch(() => setStatus('Não foi possível carregar o conteúdo.'));
  }, [slug]);

  // Os campos calculados são alinhados na carga, sem marcar alteração: a tela
  // passa a mostrar a verdade na hora, e o banco só a recebe no próximo salvar.
  const itens = useMemo(
    () => normalizarDerivados((page?.blocks[block] ?? []) as Json) as Json[],
    [page, block],
  );

  // Os índices sobrevivem ao filtro e à paginação: o item aberto continua sendo
  // o mesmo objeto da lista original, mesmo quando some do resultado da busca.
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const todos = itens.map((_, i) => i);
    return termo === '' ? todos : todos.filter((i) => casa(itens[i], termo));
  }, [itens, busca]);

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * POR_PAGINA;
  const naPagina = visiveis.slice(inicio, inicio + POR_PAGINA);

  if (!page) return <p className="state">{status || 'Carregando…'}</p>;

  function mexeu(next: Json[]) {
    setPage({ ...page!, blocks: { ...page!.blocks, [block]: next } });
    setSujo(true);
    setStatus('');
  }

  function abrir(i: number) {
    setSel(i);
    setAExcluir(null);
    // No estreito a lista some e o editor toma a tela: o foco precisa ir junto,
    // senão o teclado continua na lista que saiu de vista.
    requestAnimationFrame(() => painel.current?.focus());
  }

  function criar() {
    if (itens.length === 0) return;
    mexeu([...itens, blank(itens[0])]);
    setBusca('');
    setPagina(Math.floor(itens.length / POR_PAGINA));
    abrir(itens.length);
  }

  function excluir(i: number) {
    mexeu(itens.filter((_, j) => j !== i));
    setSel(null);
    setAExcluir(null);
  }

  function mover(i: number, d: number) {
    const next = [...itens];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    mexeu(next);
    setSel(i + d);
  }

  async function salvar() {
    setStatus('Salvando…');
    try {
      await api(`/api/admin/pages/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({ title: page!.title, blocks: page!.blocks, meta: page!.meta }),
      });
      setStatus('Publicado no site.');
      setSujo(false);
    } catch (e) {
      setStatus(`Não foi possível salvar: ${(e as Error).message}`);
    }
  }

  const item = sel !== null ? itens[sel] : null;
  const rota =
    routeBase && item && typeof item === 'object' && !Array.isArray(item)
      ? texto((item as Record<string, Json>).slug)
      : '';

  return (
    <div className="coll" data-aberto={sel !== null || undefined}>
      <PageHead
        icon={icon}
        title={heading}
        status={status || (sujo ? 'Alterações não salvas' : '')}
        actions={
          <button className="primary" onClick={salvar} disabled={!sujo}>
            Salvar e publicar
          </button>
        }
      />

      <datalist id="rotas-do-site">
        {INTERNAL_LINKS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="coll__grid">
        <aside className="coll__list" aria-label={`Lista de ${heading.toLowerCase()}`}>
          <div className="coll__tools">
            <span className="busca">
              <Icon d={SEARCH} />
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(0);
                }}
                placeholder={`Buscar ${singular.toLowerCase()}…`}
                aria-label={`Buscar ${singular.toLowerCase()}`}
              />
            </span>
            <button
              className="primary coll__novo"
              onClick={criar}
              disabled={itens.length === 0}
              title={itens.length === 0 ? 'A lista precisa de um item de referência' : undefined}
            >
              <Icon d={PLUS} />
              <span>Novo</span>
            </button>
          </div>

          {itens.length === 0 ? (
            <p className="coll__vazio">
              A lista está vazia. O formato de um {singular.toLowerCase()} vem do conteúdo original
              do site — rode <code>npm run sync</code> para recriá-lo antes de adicionar.
            </p>
          ) : visiveis.length === 0 ? (
            <p className="coll__vazio">
              Nada encontrado para <strong>“{busca}”</strong>.{' '}
              <button className="linkish" onClick={() => setBusca('')}>
                Limpar busca
              </button>
            </p>
          ) : (
            <ul className="coll__rows">
              {naPagina.map((i) => {
                const meta = linhaMeta(itens[i]);
                return (
                  <li key={i}>
                    <button
                      onClick={() => abrir(i)}
                      aria-current={sel === i || undefined}
                      className="coll__row"
                    >
                      <span className="coll__row-n">{i + 1}</span>
                      <span className="coll__row-txt">
                        <strong>{itemLabel(itens[i], i)}</strong>
                        {meta.length > 0 && <small>{meta.join(' · ')}</small>}
                      </span>
                      <Icon d={CHEVRON} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {visiveis.length > POR_PAGINA && (
            <nav className="pager" aria-label="Páginas da lista">
              <button
                onClick={() => setPagina(paginaAtual - 1)}
                disabled={paginaAtual === 0}
                aria-label="Página anterior"
              >
                <Icon d={CHEVRON} rotate={180} />
              </button>
              <span className="pager__n">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, visiveis.length)} de {visiveis.length}
              </span>
              <button
                onClick={() => setPagina(paginaAtual + 1)}
                disabled={paginaAtual >= totalPaginas - 1}
                aria-label="Próxima página"
              >
                <Icon d={CHEVRON} />
              </button>
            </nav>
          )}
        </aside>

        <section className="coll__pane" ref={painel} tabIndex={-1} aria-label={singular}>
          {item === null ? (
            <div className="coll__intro">
              <p>{hint}</p>
              <p className="coll__intro-dica">
                Escolha um {singular.toLowerCase()} na lista para editar, ou crie um novo. Nada vai
                ao ar antes de <strong>Salvar e publicar</strong>.
              </p>
            </div>
          ) : (
            <>
              <header className="coll__pane-head">
                <button className="coll__voltar" onClick={() => setSel(null)}>
                  <Icon d={CHEVRON} rotate={180} />
                  <span>Lista</span>
                </button>
                <div className="coll__pane-title">
                  <h2>{itemLabel(item, sel!)}</h2>
                  {routeBase && (
                    <p className="coll__rota">
                      {rota ? (
                        <>
                          Endereço no site: <code>{routeBase + rota}/</code>
                        </>
                      ) : (
                        'Sem endereço ainda — ele é gerado do título.'
                      )}
                    </p>
                  )}
                </div>
                <div className="coll__pane-acoes">
                  <button
                    onClick={() => mover(sel!, -1)}
                    disabled={sel === 0}
                    aria-label="Mover para cima na lista"
                    title="Mover para cima"
                  >
                    <Icon d={ARROW} />
                  </button>
                  <button
                    onClick={() => mover(sel!, 1)}
                    disabled={sel === itens.length - 1}
                    aria-label="Mover para baixo na lista"
                    title="Mover para baixo"
                  >
                    <Icon d={ARROW} rotate={180} />
                  </button>
                  <button
                    className="danger"
                    onClick={() => setAExcluir(sel)}
                    aria-label={`Excluir ${itemLabel(item, sel!)}`}
                  >
                    <Icon d={TRASH} />
                    <span>Excluir</span>
                  </button>
                </div>
              </header>

              {aExcluir === sel && sel !== null && (
                <div className="confirm">
                  <p role="alert">
                    Excluir <strong>{itemLabel(item, sel!)}</strong>?
                    {routeBase && rota
                      ? ` O endereço ${routeBase}${rota}/ deixa de existir e quem tiver o link vai receber erro 404.`
                      : ' O item sai do site na próxima publicação.'}
                  </p>
                  <div className="confirm__actions">
                    <button className="danger" onClick={() => excluir(sel!)}>
                      Excluir mesmo assim
                    </button>
                    <button onClick={() => setAExcluir(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              <div className="coll__form">
                {Editor ? (
                  <Editor
                    value={item}
                    index={sel!}
                    total={itens.length}
                    onChange={(v) => mexeu(itens.map((x, j) => (j === sel ? v : x)))}
                  />
                ) : (
                  <Field
                    name=""
                    value={item}
                    onChange={(v) => mexeu(itens.map((x, j) => (j === sel ? v : x)))}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
