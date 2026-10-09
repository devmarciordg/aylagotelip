import { useEffect, useMemo, useState } from 'react';
import {
  api,
  CHANNELS,
  DEMANDS,
  stageInfo,
  type Lead,
  type Stage,
  type StageDef,
  type User,
} from './api';
import {
  ALERT,
  BOARD,
  CALENDAR,
  CHART,
  CHEVRON,
  CLOSE,
  COIN,
  FLAG,
  FUNNEL,
  GRIP,
  Icon,
  MAIL,
  NOTE,
  PHONE,
  PIN,
  PLUS,
  SEARCH,
  SITE_WORK,
  TAG,
  TREND,
  TROPHY,
} from './icons';
import { Comentarios } from './Comentarios';
import { useEscape } from './FormKit';
import { PageHead } from './PageHead';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const hoje = () => new Date().toISOString().slice(0, 10);
const dia = (iso: string) => iso.split('-').reverse().join('/');

/** Carimbo do servidor (UTC, sem fuso) na data de quem lê. */
const diaDoCarimbo = (iso: string) =>
  new Date(`${iso.replace(' ', 'T')}Z`).toLocaleDateString('pt-BR');

/** O banco guarda só dígitos; quem lê a gaveta lê um telefone. */
function telefone(bruto: string): string {
  const d = bruto.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return bruto;
}

/** Cartões por página em cada coluna do quadro. */
const POR_COLUNA = 10;

/**
 * Encurta o número para caber na medida do cartão: 1,2k, 340k, 4,7M, 2,1B.
 *
 * `R$ 118.700,00` tem dezessete caracteres e, no corpo de 28px do KPI, estoura
 * a coluna de 200px — a métrica virava reticência. A casa decimal só entra
 * quando informa: `1,2k` diz algo que `1k` não diz, mas `1,0k` não diz nada.
 */
const DEGRAUS: [number, string][] = [
  [1, ''],
  [1e3, 'k'],
  [1e6, 'M'],
  [1e9, 'B'],
];

function compacto(n: number): string {
  const abs = Math.abs(n);
  let d = abs >= 1e9 ? 3 : abs >= 1e6 ? 2 : abs >= 1e3 ? 1 : 0;
  let v = n / DEGRAUS[d][0];
  let casas = casasDe(v, d);

  /* 999.999 arredondaria para "1.000k". Quando o arredondamento estoura o
     degrau, sobe-se um em vez de mostrar milhares de milhares. */
  if (Math.abs(Number(v.toFixed(casas))) >= 1000 && d < DEGRAUS.length - 1) {
    d += 1;
    v = n / DEGRAUS[d][0];
    casas = casasDe(v, d);
  }

  return (
    v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) +
    DEGRAUS[d][1]
  );
}

/** Três dígitos significativos, e nenhuma casa decimal que não diga nada. */
function casasDe(v: number, degrau: number): 0 | 1 {
  if (degrau === 0) return 0;
  return Math.abs(v) < 100 && Math.round(v * 10) % 10 !== 0 ? 1 : 0;
}

/** `R$ 118,7k` no cartão, `R$ 118.700,00` no hover. */
const dinheiro = (n: number) => `R$ ${compacto(n)}`;

/**
 * Um número abreviado que revela o valor cheio.
 *
 * O `title` do navegador não serve aqui: demora perto de um segundo, aparece
 * onde o sistema quiser e some no toque. Esta dica abre na hora, abre também no
 * foco do teclado, e o valor exato fica sempre no DOM para o leitor de tela —
 * quem não vê a dica não fica sem o número.
 *
 * Quando o valor não foi encurtado, nada disso existe: sem dica, sem parada de
 * tabulação. Onze paradas extras num painel de operação custam mais do que a
 * dica vale quando não há nada a revelar.
 */
function Numero({ curto, exato }: { curto: string; exato: string }) {
  if (curto === exato) return <>{exato}</>;
  return (
    <span className="num" tabIndex={0}>
      <span aria-hidden="true">{curto}</span>
      <span className="sr">{exato}</span>
      <span className="num__exato" aria-hidden="true">
        {exato}
      </span>
    </span>
  );
}

type View = 'pipeline' | 'lista' | 'metricas';

/** Lead ainda sem id: o POST devolve o id e o painel recarrega. */
type Draft = Partial<Lead> & { stage: Stage };

const novoDraft = (stage: Stage): Draft => ({
  stage,
  name_company: '',
  email: '',
  phone: '',
  channel: 'WhatsApp',
  enterprise: '',
  demand: '',
  city: '',
  notes: '',
});

/**
 * Um dado do lead com o seu ícone. O ícone é o rótulo: na coluna estreita não
 * cabe escrever "Cidade", mas o pin diz que aquilo é um lugar antes da leitura.
 * O nome do campo continua no DOM para o leitor de tela e no `title` do hover.
 */
function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <span className="meta" title={label}>
      <Icon d={icon} size={13} />
      <span className="sr">{label}: </span>
      <span className="meta__v">{value}</span>
    </span>
  );
}

export function Kanban({ user }: { user: User }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [stages, setStages] = useState<StageDef[] | null>(null);
  const [view, setView] = useState<View>('pipeline');
  const [busca, setBusca] = useState('');

  async function carregar() {
    // As duas juntas: um quadro com leads e sem etapas não tem colunas onde
    // desenhá-los, e um com etapas e sem leads não tem o que mostrar.
    const [l, s] = await Promise.all([
      api<{ leads: Lead[] }>('/api/admin/leads'),
      api<{ stages: StageDef[] }>('/api/admin/stages'),
    ]);
    setLeads(l.leads);
    setStages(s.stages);
  }

  useEffect(() => {
    carregar().catch((e: Error) => setError(e.message));
  }, []);

  /** Atualiza otimista e faz rollback se a API recusar. */
  async function patch(id: string, changes: Partial<Lead>) {
    const before = leads;
    if (!before) return;
    setLeads(before.map((l) => (l.id === id ? { ...l, ...changes } : l)));
    try {
      await api(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
    } catch (e) {
      setLeads(before);
      setError((e as Error).message);
    }
  }

  async function criar(form: Draft) {
    try {
      await api('/api/admin/leads', { method: 'POST', body: JSON.stringify(form) });
      setDraft(null);
      setError('');
      await carregar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const filtrados = useMemo(() => {
    if (!leads) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name_company, l.enterprise, l.city, l.demand, l.phone]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [leads, busca]);

  if (error && !leads) return <p className="state">Erro ao carregar: {error}</p>;
  if (!leads || !stages) return <p className="state">Carregando leads…</p>;

  const open = leads.find((l) => l.id === openId) ?? null;

  return (
    <div className="crm">
      <PageHead
        icon={BOARD}
        title="CRM"
        tools={
          <>
            <div className="tabs" role="tablist">
              {(
                [
                  ['pipeline', 'Pipeline'],
                  ['lista', 'Lista'],
                  ['metricas', 'Métricas'],
                ] as [View, string][]
              ).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}>
                  {label}
                </button>
              ))}
            </div>

            {view !== 'metricas' && (
              <span className="busca">
                <Icon d={SEARCH} />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, empreendimento, cidade ou telefone…"
                  aria-label="Buscar lead"
                />
              </span>
            )}
          </>
        }
        status={
          view !== 'metricas' && busca.trim() ? `${filtrados.length} de ${leads.length}` : undefined
        }
        actions={
          <button className="primary" onClick={() => setDraft(novoDraft(stages[0].slug))}>
            <Icon d={PLUS} />
            <span>Novo lead</span>
          </button>
        }
      />

      {error && (
        <p className="state" role="alert">
          {error}
        </p>
      )}

      {view === 'pipeline' && (
        <div className="board">
          {stages.map((stage) => (
            <Coluna
              key={stage.slug}
              stage={stage}
              leads={filtrados.filter((l) => l.stage === stage.slug)}
              onOpen={setOpenId}
              onNovo={() => setDraft(novoDraft(stage.slug))}
              onSoltar={(id) => {
                const lead = leads.find((l) => l.id === id);
                if (lead && lead.stage !== stage.slug) patch(id, { stage: stage.slug });
              }}
            />
          ))}
        </div>
      )}

      {view === 'lista' && <Lista leads={filtrados} stages={stages} onOpen={setOpenId} />}
      {view === 'metricas' && <Metricas leads={leads} stages={stages} />}

      {open && (
        <Detail
          lead={open}
          stages={stages}
          user={user}
          onPatch={patch}
          onClose={() => setOpenId(null)}
        />
      )}
      {draft && (
        <NovoLead draft={draft} stages={stages} onSave={criar} onClose={() => setDraft(null)} />
      )}
    </div>
  );
}

/**
 * Uma etapa do funil. A página vive aqui dentro, não no quadro: cada coluna
 * enche no seu ritmo, e virar a página de "Follow-Up" não tem por que mexer em
 * "Novo".
 *
 * A página é recortada, não carregada — a API já devolve o funil inteiro. O que
 * isso evita é o DOM com centenas de cartões: com sete etapas cheias, era o
 * navegador montando tudo para mostrar os dez primeiros de cada fila.
 *
 * ponytail: paginação no cliente. Quando a base passar de alguns milhares de
 * leads o gargalo vira o próprio GET, e aí a página precisa virar LIMIT/OFFSET
 * por etapa em `/api/admin/leads`.
 */
function Coluna({
  stage,
  leads,
  onOpen,
  onNovo,
  onSoltar,
}: {
  stage: StageDef;
  leads: Lead[];
  onOpen: (id: string) => void;
  onNovo: () => void;
  onSoltar: (id: string) => void;
}) {
  const [pagina, setPagina] = useState(0);

  /* A página é grampeada em vez de zerada por efeito: quando a busca encurta a
     fila, quem estava na página 3 cai na última que existe, sem piscar. */
  const total = Math.max(1, Math.ceil(leads.length / POR_COLUNA));
  const atual = Math.min(pagina, total - 1);
  const inicio = atual * POR_COLUNA;
  const naPagina = leads.slice(inicio, inicio + POR_COLUNA);

  return (
    <section
      className="column"
      style={{ '--stage': stage.color } as React.CSSProperties}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onSoltar(e.dataTransfer.getData('text/plain'));
      }}
    >
      <h2>
        {stage.label} <span className="count">{leads.length}</span>
      </h2>

      <div className="column-body">
        {naPagina.map((lead) => (
          <Card key={lead.id} lead={lead} onOpen={() => onOpen(lead.id)} />
        ))}
        {leads.length === 0 && <p className="column-vazia">Nenhum lead nesta etapa.</p>}
        <button className="add" onClick={onNovo}>
          <Icon d={PLUS} size={13} />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Sempre visível: o controle some de baixo da coluna se aparecer só ao
          passar de dez, e quem trabalha no quadro deixa de saber que ele existe. */}
      <nav className="pager" aria-label={`Páginas de ${stage.label}`}>
        <button
          onClick={() => setPagina(atual - 1)}
          disabled={atual === 0}
          aria-label="Página anterior"
        >
          <Icon d={CHEVRON} rotate={180} />
        </button>
        <span className="pager__n">
          {Math.min(inicio + 1, leads.length)}–{Math.min(inicio + POR_COLUNA, leads.length)} de{' '}
          {leads.length}
        </span>
        <button
          onClick={() => setPagina(atual + 1)}
          disabled={atual >= total - 1}
          aria-label="Próxima página"
        >
          <Icon d={CHEVRON} />
        </button>
      </nav>
    </section>
  );
}

/**
 * O compromisso do cartão: o que ficou de fazer e até quando. É a única linha
 * que muda de cor, porque é a única que exige reação — e atraso é estado, não
 * decoração, então troca também de ícone (PRODUCT.md: nada depende só de cor).
 */
function Proxima({ lead }: { lead: Lead }) {
  const atrasado = !!lead.deadline && lead.deadline < hoje();
  return (
    <p className={atrasado ? 'next next--late' : 'next'}>
      <Icon d={atrasado ? ALERT : FLAG} size={13} />
      <span className="next__t">{lead.next_action}</span>
      {lead.deadline && (
        <span className="next__d">
          <Icon d={CALENDAR} size={12} />
          {dia(lead.deadline)}
        </span>
      )}
    </p>
  );
}

function Card({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  return (
    <article
      className="card"
      // ponytail: drag-and-drop nativo HTML5 - zero dependencia, mas nao funciona
      // em touch. Trocar por @dnd-kit se o CRM precisar rodar em tablet.
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', lead.id)}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir lead ${lead.name_company}`}
    >
      <header className="card__head">
        <strong>{lead.name_company}</strong>
        {/* A pega diz que o cartão se arrasta. Sem ela, arrastar é um segredo. */}
        <Icon d={GRIP} size={14} />
      </header>

      {(lead.enterprise || lead.city) && (
        <div className="card__meta">
          {lead.enterprise && (
            <Meta icon={SITE_WORK} label="Empreendimento" value={lead.enterprise} />
          )}
          {lead.city && <Meta icon={PIN} label="Cidade" value={lead.city} />}
        </div>
      )}

      {(lead.channel || lead.estimated_value) && (
        <div className="tags">
          {lead.channel && (
            <span className="tag">
              <Icon d={TAG} size={11} />
              {lead.channel}
            </span>
          )}
          {lead.estimated_value && (
            <span className="tag tag--value">
              <Icon d={COIN} size={11} />
              {money.format(Number(lead.estimated_value))}
            </span>
          )}
        </div>
      )}

      {lead.next_action && <Proxima lead={lead} />}
    </article>
  );
}

/**
 * A lista é dado tabular, não texto corrido: ocupa a largura toda e alinha as
 * colunas em grade, para que etapa e valor possam ser comparados de cima a
 * baixo. No estreito a grade colapsa numa pilha, e os metadados descem para a
 * linha de baixo em vez de espremer o nome do lead.
 */
function Lista({
  leads,
  stages,
  onOpen,
}: {
  leads: Lead[];
  stages: StageDef[];
  onOpen: (id: string) => void;
}) {
  if (leads.length === 0)
    return (
      <p className="state">
        <Icon d={SEARCH} size={16} /> Nenhum lead encontrado com esses termos.
      </p>
    );
  return (
    // `role="list"` explícito: cada item vira botão para ser alcançável pelo
    // teclado, e sem isso o `ul` perderia a semântica de lista junto.
    <ul className="lista" role="list">
      {leads.map((lead) => (
        <li
          key={lead.id}
          style={{ '--stage': stageInfo(stages, lead.stage).color } as React.CSSProperties}
          onClick={() => onOpen(lead.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(lead.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="lista__id">
            <strong>{lead.name_company}</strong>
            <div className="card__meta">
              {lead.enterprise && (
                <Meta icon={SITE_WORK} label="Empreendimento" value={lead.enterprise} />
              )}
              {lead.city && <Meta icon={PIN} label="Cidade" value={lead.city} />}
              {lead.channel && <Meta icon={TAG} label="Canal" value={lead.channel} />}
            </div>
          </div>

          <div className="lista__next">{lead.next_action && <Proxima lead={lead} />}</div>

          <div className="lista__meta">
            <span className="tag tag--stage">{stageInfo(stages, lead.stage).label}</span>
            {lead.estimated_value && (
              <span className="lista__valor">
                <Icon d={COIN} size={13} />
                {money.format(Number(lead.estimated_value))}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Metricas({ leads, stages }: { leads: Lead[]; stages: StageDef[] }) {
  const total = leads.length;
  const ganhos = leads.filter((l) => l.stage === 'ganho');
  /* Taxa de conversão = ganhos sobre o que já foi decidido.
     A conta antiga somava `proposta` + `follow_up` + `ganho` no denominador, e
     esses dois slugs do meio agora são configuráveis: uma etapa renomeada pela
     tela de configuração zeraria a métrica em silêncio. Ganho e perdido são as
     duas etapas que a API protege, então a razão entre elas vale em qualquer
     funil — e responde a pergunta melhor: das decisões tomadas, quantas foram
     sim. */
  const decididos = leads.filter((l) => l.stage === 'ganho' || l.stage === 'perdido').length;
  const conversao = decididos > 0 ? Math.round((ganhos.length / decididos) * 100) : 0;
  const receita = ganhos.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0);
  const ticket = ganhos.length > 0 ? receita / ganhos.length : 0;

  /* Só a receita fica dourada. Quatro números disputando destaque entre si não
     destacam nenhum: o dourado marca o que a operação persegue. */
  const vazio = { curto: '—', exato: '—' };
  const kpis: [string, { curto: string; exato: string }, string, string, boolean][] = [
    ['Leads no pipeline', { curto: compacto(total), exato: String(total) }, 'total captado', FUNNEL, false],
    ['Taxa de conversão', { curto: `${conversao}%`, exato: `${conversao}%` }, `${ganhos.length} de ${decididos} decididos`, TREND, false],
    [
      'Ticket médio',
      ticket > 0 ? { curto: dinheiro(ticket), exato: money.format(ticket) } : vazio,
      'por contrato ganho',
      CHART,
      false,
    ],
    [
      'Receita ganha',
      receita > 0 ? { curto: dinheiro(receita), exato: money.format(receita) } : vazio,
      `${ganhos.length} contrato${ganhos.length === 1 ? '' : 's'} fechado${ganhos.length === 1 ? '' : 's'}`,
      TROPHY,
      true,
    ],
  ];

  return (
    <div className="metricas">
      <div className="kpis">
        {kpis.map(([label, valor, sub, icon, destaque]) => (
          <div key={label} className={destaque ? 'kpi kpi--destaque' : 'kpi'}>
            <span className="label">
              <Icon d={icon} size={14} />
              {label}
            </span>
            <strong>
              <Numero curto={valor.curto} exato={valor.exato} />
            </strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>

      <section className="dist">
        <h2>Distribuição por etapa</h2>
        {stages.map((stage) => {
          const n = leads.filter((l) => l.stage === stage.slug).length;
          const pct = total > 0 ? (n / total) * 100 : 0;
          return (
            <div
              key={stage.slug}
              className="dist-row"
              style={{ '--stage': stage.color } as React.CSSProperties}
            >
              <span className="dist-label">{stage.label}</span>
              <div className="bar">
                <div className="bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
              <span className="dist-n">{n}</span>
              {/* A contagem sozinha não é distribuição: "7" só vira informação
                  ao lado da fatia que representa. */}
              <span className="dist-pct">{total > 0 ? `${Math.round(pct)}%` : '—'}</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function NovoLead({
  draft,
  stages,
  onSave,
  onClose,
}: {
  draft: Draft;
  stages: StageDef[];
  onSave: (form: Draft) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const set = (k: keyof Draft, v: string) => setForm((f) => ({ ...f, [k]: v }));
  useEscape(onClose);

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <header>
          <h2>
            <Icon d={PLUS} size={15} />
            Novo lead
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon d={CLOSE} size={15} />
          </button>
        </header>

        <div className="grid-2">
          <label>
            Nome / empresa *
            <input
              required
              value={form.name_company ?? ''}
              onChange={(e) => set('name_company', e.target.value)}
              placeholder="Ex.: Construtora Horizonte"
            />
          </label>
          <label>
            Canal de origem
            <select value={form.channel ?? ''} onChange={(e) => set('channel', e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Demanda *
            <input
              required
              list="demandas"
              value={form.demand ?? ''}
              onChange={(e) => set('demand', e.target.value)}
              placeholder="Ex.: Projeto novo"
            />
            <datalist id="demandas">
              {DEMANDS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </label>
          <label>
            Etapa
            <select
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as Stage }))}
            >
              {stages.map((st) => (
                <option key={st.slug} value={st.slug}>
                  {st.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            WhatsApp / telefone
            <input
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="33 99999-9999"
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </label>
          <label>
            Empreendimento
            <input
              value={form.enterprise ?? ''}
              onChange={(e) => set('enterprise', e.target.value)}
              placeholder="Ex.: Galpão 4.000 m²"
            />
          </label>
          <label>
            Cidade / UF
            <input
              value={form.city ?? ''}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Ex.: Governador Valadares / MG"
            />
          </label>
        </div>

        <label>
          Observações
          <textarea
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Cenário, dores e riscos identificados no diagnóstico…"
          />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary">
            Salvar lead
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * O painel de detalhe abre sobre o quadro, então ganha fundo escurecido: sem
 * ele não se sabe que o quadro atrás continua clicável, e um clique fora move
 * um lead sem querer.
 *
 * A ordem inverteu. O que se faz com um lead aberto é falar com ele e mexer no
 * compromisso; ler o cadastro é o que vem antes de decidir, não a ação. Por
 * isso contato e edição rápida vêm primeiro, e os dados frios caem para o fim.
 */
function Detail({
  lead,
  stages,
  user,
  onPatch,
  onClose,
}: {
  lead: Lead;
  stages: StageDef[];
  user: User;
  onPatch: (id: string, changes: Partial<Lead>) => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  const zap = lead.phone ? `https://wa.me/55${lead.phone.replace(/\D/g, '')}` : null;

  return (
    <>
      <div className="detail-bg" onClick={onClose} />
      <aside
        className="detail"
        style={{ '--stage': stageInfo(stages, lead.stage).color } as React.CSSProperties}
        aria-label={`Detalhe de ${lead.name_company}`}
      >
        <header>
          <div className="detail__id">
            <div className="detail__linha">
              <span className="tag tag--stage">{stageInfo(stages, lead.stage).label}</span>
              <span className="detail__entrada">
                <Icon d={CALENDAR} size={12} />
                Entrada em {diaDoCarimbo(lead.created_at)}
              </span>
            </div>
            <h2>{lead.name_company}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon d={CLOSE} size={15} />
          </button>
        </header>

        {/* O compromisso abre a gaveta porque é a única linha que cobra reação.
            Sem próxima ação, o vazio é dito — some é pior do que pendente. */}
        {lead.next_action ? (
          <Proxima lead={lead} />
        ) : (
          <p className="next next--vazio">
            <Icon d={FLAG} size={13} />
            <span className="next__t">Sem próxima ação definida</span>
          </p>
        )}

        <div className="detail__contato">
          {zap ? (
            <a className="btn-contato" href={zap} target="_blank" rel="noopener">
              <Icon d={PHONE} size={15} />
              <span>{telefone(lead.phone)}</span>
            </a>
          ) : (
            <span className="btn-contato is-vazio">
              <Icon d={PHONE} size={15} />
              <span>Sem telefone</span>
            </span>
          )}
          {lead.email ? (
            <a className="btn-contato" href={`mailto:${lead.email}`}>
              <Icon d={MAIL} size={15} />
              <span>{lead.email}</span>
            </a>
          ) : (
            <span className="btn-contato is-vazio">
              <Icon d={MAIL} size={15} />
              <span>Sem e-mail</span>
            </span>
          )}
        </div>

        {/* A demanda é o texto que decide o orçamento, então é lida como texto,
            não espremida numa coluna de chave/valor. Canal, empreendimento e
            cidade são etiquetas do caso, e ficam abaixo dela. */}
        <section className="detail__bloco">
          <h3>Demanda</h3>
          <div className="ficha">
            <p className="ficha__demanda">
              {lead.demand || 'Nada descrito na captação.'}
            </p>
            <ul className="ficha__meta">
              <li>
                <Icon d={TAG} size={13} />
                <span className="sr">Canal: </span>
                {lead.channel || '—'}
              </li>
              {lead.enterprise && (
                <li>
                  <Icon d={SITE_WORK} size={13} />
                  <span className="sr">Empreendimento: </span>
                  {lead.enterprise}
                </li>
              )}
              {lead.city && (
                <li>
                  <Icon d={PIN} size={13} />
                  <span className="sr">Cidade: </span>
                  {lead.city}
                </li>
              )}
            </ul>
            {lead.notes && (
              <div className="ficha__nota">
                <h4>
                  <Icon d={NOTE} size={13} />
                  Observações
                </h4>
                <p>{lead.notes}</p>
              </div>
            )}
          </div>
        </section>

        {/* O questionário sobe para antes do formulário: é o que a operação lê
            para orçar, e ler antes de decidir é a ordem do trabalho. */}
        {lead.answers && Object.keys(lead.answers).length > 0 && (
          <section className="detail__bloco">
            <h3>Questionário{lead.form ? ` — ${lead.form}` : ''}</h3>
            <dl className="respostas">
              {Object.entries(lead.answers).map(([campo, valor]) => (
                <div key={campo}>
                  <dt>{campo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="detail__bloco">
          <h3>Edição rápida</h3>

          <label>
            Etapa do funil
            <select
              value={lead.stage}
              onChange={(e) => onPatch(lead.id, { stage: e.target.value as Stage })}
            >
              {stages.map((st) => (
                <option key={st.slug} value={st.slug}>
                  {st.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Próxima ação
            <input
              key={`na-${lead.id}`}
              defaultValue={lead.next_action}
              placeholder="Ex.: Enviar proposta revisada"
              onBlur={(e) => onPatch(lead.id, { next_action: e.target.value })}
            />
          </label>

          <div className="grid-2">
            <label>
              Prazo
              <input
                type="date"
                key={`dl-${lead.id}`}
                defaultValue={lead.deadline ?? ''}
                onBlur={(e) => onPatch(lead.id, { deadline: e.target.value || null })}
              />
            </label>
            <label>
              Valor estimado (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                key={`ev-${lead.id}`}
                defaultValue={lead.estimated_value ?? ''}
                onBlur={(e) => onPatch(lead.id, { estimated_value: e.target.value || null })}
              />
            </label>
          </div>

          <div className="grid-2">
            <label>
              Empreendimento
              <input
                key={`ent-${lead.id}`}
                defaultValue={lead.enterprise}
                onBlur={(e) => onPatch(lead.id, { enterprise: e.target.value })}
              />
            </label>
            <label>
              Cidade / UF
              <input
                key={`city-${lead.id}`}
                defaultValue={lead.city}
                onBlur={(e) => onPatch(lead.id, { city: e.target.value })}
              />
            </label>
          </div>
        </section>

        <Comentarios leadId={lead.id} user={user} />
      </aside>
    </>
  );
}
