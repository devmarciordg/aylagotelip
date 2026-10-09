import { useEffect, useState } from 'react';
import { api, type StageDef } from './api';
import { Grupo } from './FormKit';
import { ARROW, BOARD, CHECK, Icon, LOCK, PLUS, TRASH } from './icons';
import { PageHead } from './PageHead';

/**
 * Configuração das etapas do funil.
 *
 * Elas eram uma constante no PHP espelhada numa constante no TypeScript: mudar
 * o funil da operação era tarefa de quem publica o código. Agora moram na
 * tabela `lead_stages`.
 *
 * Três ficam de fora, e a API as recusa com 403 — a tela mostra por quê em vez
 * de esconder a linha:
 *   `novo`    recebe todo lead captado pelo site (`leads.stage` DEFAULT);
 *   `ganho`   e `perdido` fecham o funil e são o denominador da conversão.
 *
 * O rótulo é editável, o slug não: ele é o valor gravado em cada lead, e mexer
 * nele moveria de coluna todo mundo que já está na etapa. Renomear "Diagnóstico"
 * para "Vistoria" muda o que se lê, nunca onde o lead está.
 */

/** Cores sugeridas: a paleta que o quadro já usava, mais três frias. */
const PALETA = [
  '#3d9bd8',
  '#4fb3a5',
  '#d4a017',
  '#e07b39',
  '#d45c4e',
  '#a56fd4',
  '#33b26e',
  '#6b8fb5',
  '#7f8c8d',
];

/** Uma etapa protegida: aparece, explica-se e não abre para edição. */
function Fixa({ stage, n }: { stage: StageDef; n: number }) {
  const porque =
    stage.slug === 'novo'
      ? 'Todo lead captado pelo site entra aqui. Sem ela o formulário não tem onde chegar.'
      : stage.slug === 'ganho'
        ? 'Fecha o funil por cima: é a receita e o numerador da taxa de conversão.'
        : 'Fecha o funil por baixo. Junto com Ganho, forma a base da taxa de conversão.';

  return (
    <li className="et et--fixa">
      <span className="et__cor" style={{ background: stage.color }} aria-hidden="true" />
      <div className="et__corpo">
        <p className="et__nome">
          {stage.label}
          <span className="et__lock">
            <Icon d={LOCK} size={12} />
            Fixa
          </span>
        </p>
        <p className="et__porque">{porque}</p>
      </div>
      <span className="et__n" title={`${n} lead(s) nesta etapa`}>
        {n}
      </span>
    </li>
  );
}

/** Uma etapa editável: rótulo, cor, ordem e exclusão. */
function Editavel({
  stage,
  n,
  primeira,
  ultima,
  destinos,
  onSalvar,
  onMover,
  onExcluir,
}: {
  stage: StageDef;
  n: number;
  primeira: boolean;
  ultima: boolean;
  destinos: StageDef[];
  onSalvar: (mudancas: Partial<StageDef>) => void;
  onMover: (direcao: -1 | 1) => void;
  onExcluir: (moveTo: string) => void;
}) {
  const [label, setLabel] = useState(stage.label);
  const [confirmar, setConfirmar] = useState(false);
  const [destino, setDestino] = useState(destinos[0]?.slug ?? '');

  useEffect(() => setLabel(stage.label), [stage.label]);

  return (
    <li className="et">
      <label className="et__cor et__cor--edit" title="Cor da coluna">
        <span style={{ background: stage.color }} />
        <input
          type="color"
          value={stage.color}
          list="cores-de-etapa"
          onChange={(e) => onSalvar({ color: e.target.value })}
          aria-label={`Cor de ${stage.label}`}
        />
      </label>

      <div className="et__corpo">
        <span className="ed-f__box">
          <input
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label.trim() && label !== stage.label && onSalvar({ label: label.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Nome da etapa"
          />
        </span>
        <p className="et__slug">
          Gravado nos leads como <code>{stage.slug}</code> — renomear não move ninguém de coluna.
        </p>
      </div>

      <span className="et__n" title={`${n} lead(s) nesta etapa`}>
        {n}
      </span>

      <span className="et__acoes">
        <button
          type="button"
          onClick={() => onMover(-1)}
          disabled={primeira}
          aria-label={`Mover ${stage.label} para a esquerda`}
          title="Mover para a esquerda no quadro"
        >
          <Icon d={ARROW} />
        </button>
        <button
          type="button"
          onClick={() => onMover(1)}
          disabled={ultima}
          aria-label={`Mover ${stage.label} para a direita`}
          title="Mover para a direita no quadro"
        >
          <Icon d={ARROW} rotate={180} />
        </button>
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          aria-label={`Excluir ${stage.label}`}
          title="Excluir etapa"
        >
          <Icon d={TRASH} />
        </button>
      </span>

      {confirmar && (
        <div className="et__confirm" role="alert">
          {n === 0 ? (
            <p>
              A coluna <strong>{stage.label}</strong> está vazia. Excluir?
            </p>
          ) : (
            <>
              <p>
                <strong>{stage.label}</strong> tem {n} lead{n === 1 ? '' : 's'}. Eles precisam de
                outra coluna — excluir sem destino os deixaria fora do quadro sem sair do banco.
              </p>
              <label className="et__destino">
                Mover para
                <select value={destino} onChange={(e) => setDestino(e.target.value)}>
                  {destinos.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="confirm__actions">
            <button
              type="button"
              className="danger"
              onClick={() => {
                setConfirmar(false);
                onExcluir(destino);
              }}
            >
              {n === 0 ? 'Excluir' : `Mover ${n} e excluir`}
            </button>
            <button type="button" onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Etapas() {
  const [stages, setStages] = useState<StageDef[] | null>(null);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('');
  const [nova, setNova] = useState('');
  const [cor, setCor] = useState(PALETA[1]);

  async function carregar() {
    // A contagem por etapa vem dos leads: é ela que diz o custo de excluir uma
    // coluna, e sem ela a confirmação seria um susto genérico.
    const [s, l] = await Promise.all([
      api<{ stages: StageDef[] }>('/api/admin/stages'),
      api<{ leads: { stage: string }[] }>('/api/admin/leads'),
    ]);
    setStages(s.stages);
    const n: Record<string, number> = {};
    for (const lead of l.leads) n[lead.stage] = (n[lead.stage] ?? 0) + 1;
    setContagem(n);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setStatus(`Não foi possível carregar: ${e.message}`));
  }, []);

  /** Cada mudança grava na hora: não há botão de publicar, porque não há rascunho. */
  async function gravar(fn: () => Promise<unknown>, ok: string) {
    setStatus('Salvando…');
    try {
      await fn();
      await carregar();
      setStatus(ok);
    } catch (e) {
      const m = (e as Error).message;
      setStatus(
        m === 'etapa_ja_existe'
          ? 'Já existe uma etapa com esse nome.'
          : m === 'etapa_protegida'
            ? 'Esta etapa é fixa e não pode ser alterada.'
            : m.startsWith('etapa_com_leads:')
              ? `A etapa ainda tem ${m.split(':')[1]} lead(s). Escolha para onde eles vão.`
              : `Não foi possível salvar: ${m}`,
      );
    }
  }

  if (!stages) return <p className="state">{status || 'Carregando etapas…'}</p>;

  const editaveis = stages.filter((s) => !s.locked);
  const entrada = stages.find((s) => s.slug === 'novo');
  const fechamentos = stages.filter((s) => s.locked && s.slug !== 'novo');

  /** Troca de lugar com a vizinha e grava as duas posições. */
  function mover(stage: StageDef, direcao: -1 | 1) {
    const i = editaveis.findIndex((s) => s.id === stage.id);
    const vizinha = editaveis[i + direcao];
    if (!vizinha) return;
    gravar(
      () =>
        Promise.all([
          api(`/api/admin/stages/${stage.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ position: vizinha.position }),
          }),
          api(`/api/admin/stages/${vizinha.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ position: stage.position }),
          }),
        ]),
      'Ordem das colunas atualizada.',
    );
  }

  return (
    <div className="pages">
      <PageHead icon={BOARD} title="Etapas do funil" status={status} />

      <div className="pages__body ed">
        <p className="hint">
          As colunas do CRM. O que muda aqui muda no quadro, na lista e nas métricas — sem
          republicar o site.
        </p>

        <datalist id="cores-de-etapa">
          {PALETA.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <Grupo
          icon={BOARD}
          title="Colunas do quadro"
          note="Na ordem em que aparecem no Kanban, da esquerda para a direita. A entrada e os dois fechamentos são fixos."
        >
          <ol className="et__lista">
            {entrada && <Fixa stage={entrada} n={contagem[entrada.slug] ?? 0} />}

            {editaveis.map((s, i) => (
              <Editavel
                key={s.id}
                stage={s}
                n={contagem[s.slug] ?? 0}
                primeira={i === 0}
                ultima={i === editaveis.length - 1}
                destinos={stages.filter((d) => d.slug !== s.slug)}
                onSalvar={(mudancas) =>
                  gravar(
                    () =>
                      api(`/api/admin/stages/${s.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify(mudancas),
                      }),
                    'Etapa atualizada.',
                  )
                }
                onMover={(d) => mover(s, d)}
                onExcluir={(moveTo) =>
                  gravar(
                    () =>
                      api(
                        `/api/admin/stages/${s.id}` +
                          ((contagem[s.slug] ?? 0) > 0 ? `?move_to=${moveTo}` : ''),
                        { method: 'DELETE' },
                      ),
                    'Etapa excluída.',
                  )
                }
              />
            ))}

            {fechamentos.map((s) => (
              <Fixa key={s.id} stage={s} n={contagem[s.slug] ?? 0} />
            ))}
          </ol>

          <form
            className="et__nova"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nova.trim()) return;
              gravar(
                () =>
                  api('/api/admin/stages', {
                    method: 'POST',
                    body: JSON.stringify({ label: nova.trim(), color: cor }),
                  }),
                'Etapa criada.',
              );
              setNova('');
            }}
          >
            <label className="et__cor et__cor--edit" title="Cor da nova etapa">
              <span style={{ background: cor }} />
              <input
                type="color"
                value={cor}
                list="cores-de-etapa"
                onChange={(e) => setCor(e.target.value)}
                aria-label="Cor da nova etapa"
              />
            </label>
            <span className="ed-f__box">
              <Icon d={PLUS} />
              <input
                value={nova}
                maxLength={60}
                placeholder="Nome da nova coluna. Ex.: Vistoria técnica"
                onChange={(e) => setNova(e.target.value)}
                aria-label="Nome da nova etapa"
              />
            </span>
            <button type="submit" className="primary" disabled={!nova.trim()}>
              <Icon d={CHECK} />
              <span>Criar etapa</span>
            </button>
          </form>
        </Grupo>
      </div>
    </div>
  );
}
