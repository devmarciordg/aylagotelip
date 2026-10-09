import { useEffect, useRef, useState } from 'react';
import { api, type Comment, type User } from './api';
import { CLOSE, Icon, NOTE, TRASH } from './icons';

/**
 * Caderno do lead: o que a operação foi descobrindo, uma anotação por vez.
 *
 * Não é um fio de conversa — ninguém responde a ninguém aqui. São registros
 * datados de um trabalho, então a data carimba a linha, o autor assina em
 * seguida e o texto corre sem balão.
 *
 * `leads.notes` é campo único e sobrescrevível — serve para o que o lead
 * informou no formulário, e qualquer acréscimo apaga o anterior. A cada ligação,
 * visita e exigência do CBMMG a operação precisava escolher entre reescrever a
 * observação ou perder o registro. Aqui cada acréscimo é uma linha com autor e
 * data, e só quem escreveu edita ou apaga (a API recusa o resto com 403).
 */

/** `2026-09-13 02:17:05` → `hoje às 02:17`, `ontem às …`, `13/09 às …`. */
function quando(iso: string): string {
  // O MySQL do container roda em UTC e devolve o carimbo sem fuso. Lido como
  // local, uma anotação feita às 22h aparecia às 01h do dia seguinte — e como
  // o "dia seguinte" ainda não chegou, a conta de dias dava "há -1 dias".
  const d = new Date(`${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return iso;

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((dia(new Date()) - dia(d)) / 86400000);

  if (dias <= 0) return `hoje às ${hora}`;
  if (dias === 1) return `ontem às ${hora}`;
  if (dias < 7) return `há ${dias} dias, às ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}

/** Caixa de escrever: a mesma para a anotação nova e para a edição. */
function Caixa({
  valor,
  placeholder,
  rotuloEnviar,
  autoFoco,
  onEnviar,
  onCancelar,
}: {
  valor: string;
  placeholder: string;
  rotuloEnviar: string;
  autoFoco?: boolean;
  onEnviar: (texto: string) => void;
  onCancelar?: () => void;
}) {
  const [texto, setTexto] = useState(valor);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFoco) campo.current?.focus();
  }, [autoFoco]);

  // A altura acompanha o texto: uma caixa de três linhas fixas esconde o fim de
  // um relato longo e sobra em um "cliente não atendeu".
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [texto]);

  const vazio = texto.trim() === '';

  return (
    <div className="cmt-caixa">
      <textarea
        ref={campo}
        rows={2}
        value={texto}
        placeholder={placeholder}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl+Enter envia; Enter sozinho quebra linha, porque o relato de uma
          // visita técnica raramente cabe numa linha só.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !vazio) {
            e.preventDefault();
            onEnviar(texto.trim());
            setTexto('');
          }
          if (e.key === 'Escape' && onCancelar) onCancelar();
        }}
      />
      <div className="cmt-caixa__acoes">
        {onCancelar && (
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button
          type="button"
          className="primary"
          disabled={vazio}
          onClick={() => {
            onEnviar(texto.trim());
            setTexto('');
          }}
        >
          {rotuloEnviar}
        </button>
      </div>
    </div>
  );
}

export function Comentarios({ leadId, user }: { leadId: string; user: User }) {
  const [itens, setItens] = useState<Comment[] | null>(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);

  async function carregar() {
    const r = await api<{ comments: Comment[] }>(`/api/admin/leads/${leadId}/comments`);
    setItens(r.comments);
  }

  useEffect(() => {
    setItens(null);
    setEditando(null);
    setApagando(null);
    carregar().catch((e: Error) => setErro(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  /** Toda escrita recarrega: a lista é curta e o servidor é quem carimba a hora. */
  async function escrever(fn: () => Promise<unknown>) {
    setErro('');
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro(
        (e as Error).message === 'comentario_de_outro_autor'
          ? 'Só quem escreveu a anotação pode alterá-la.'
          : `Não foi possível salvar: ${(e as Error).message}`,
      );
    }
  }

  return (
    <section className="detail__bloco cmt">
      <h3>
        Anotações
        {itens && itens.length > 0 && <span className="count">{itens.length}</span>}
      </h3>

      {erro && (
        <p className="hint hint--error" role="alert">
          {erro}
        </p>
      )}

      {itens === null ? (
        <p className="hint">Carregando anotações…</p>
      ) : itens.length === 0 ? (
        <p className="cmt__vazio">
          <Icon d={NOTE} size={15} />
          <span>
            Nada registrado ainda. Anote o que foi conversado — o próximo retorno começa daqui.
          </span>
        </p>
      ) : (
        <ol className="cmt__lista">
          {itens.map((c) => {
            const meu = c.user_id === user.id;
            return (
              <li key={c.id} className={meu ? 'cmt__item cmt__item--meu' : 'cmt__item'}>
                <div className="cmt__corpo">
                  <p className="cmt__meta">
                    <span className="cmt__data">{quando(c.created_at)}</span>
                    <strong>{c.author_name || 'Autor removido'}</strong>
                    {c.edited_at && c.edited_at !== c.created_at && (
                      <span className="cmt__editado" title={`Editado ${quando(c.edited_at)}`}>
                        editado
                      </span>
                    )}
                    {/* Só o autor vê as ações: a API recusa o resto com 403, e um
                        botão que sempre falha é pior que botão nenhum. */}
                    {meu && editando !== c.id && apagando !== c.id && (
                      <span className="cmt__acoes">
                        <button type="button" onClick={() => setEditando(c.id)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => setApagando(c.id)}>
                          <Icon d={TRASH} size={13} />
                          <span>Excluir</span>
                        </button>
                      </span>
                    )}
                  </p>

                  {editando === c.id ? (
                    <Caixa
                      valor={c.body}
                      placeholder="Anotação"
                      rotuloEnviar="Salvar"
                      autoFoco
                      onCancelar={() => setEditando(null)}
                      onEnviar={(texto) => {
                        setEditando(null);
                        escrever(() =>
                          api(`/api/admin/comments/${c.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ body: texto }),
                          }),
                        );
                      }}
                    />
                  ) : (
                    <p className="cmt__texto">{c.body}</p>
                  )}

                  {/* Confirmação inline: a janela nativa trava a aba e apaga o
                      contexto do comentário que se está prestes a perder. */}
                  {apagando === c.id && (
                    <div className="cmt__confirm" role="alert">
                      <span>Excluir esta anotação? Não dá para desfazer.</span>
                      <span className="cmt__confirm-acoes">
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setApagando(null);
                            escrever(() =>
                              api(`/api/admin/comments/${c.id}`, { method: 'DELETE' }),
                            );
                          }}
                        >
                          Excluir
                        </button>
                        <button type="button" onClick={() => setApagando(null)}>
                          <Icon d={CLOSE} size={13} />
                          <span>Cancelar</span>
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="cmt__novo">
        <Caixa
          valor=""
          placeholder="O que foi conversado? Ex.: visita marcada para quinta, cliente vai enviar a planta."
          rotuloEnviar="Anotar"
          onEnviar={(texto) =>
            escrever(() =>
              api(`/api/admin/leads/${leadId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ body: texto }),
              }),
            )
          }
        />
      </div>
    </section>
  );
}
