import { useEffect, useState } from 'react';
import { api } from './api';
import { ALERT, CHART, CHECK, Icon, INFO, LOCK, PAUSE, PULSE, TRASH } from './icons';
import { PageHead } from './PageHead';

const PROVIDERS = [
  {
    key: 'meta',
    label: 'Meta Pixel',
    icon: PULSE,
    what: 'Mede quem chegou pelo Facebook e pelo Instagram e envia os leads de volta para os anúncios.',
    idLabel: 'ID do pixel',
    idHint: 'Só números. Está no Gerenciador de Eventos, ao lado do nome do pixel.',
    idPlaceholder: '1234567890123456',
  },
  {
    key: 'ga4',
    label: 'Google Analytics 4',
    icon: CHART,
    what: 'Mede o tráfego do site: de onde as visitas vêm e quais páginas elas percorrem.',
    idLabel: 'ID de métrica',
    idHint: 'Começa com G-. Está em Administrador → Fluxos de dados, no Analytics.',
    idPlaceholder: 'G-XXXXXXXXXX',
  },
] as const;

type Pixel = { provider: string; pixel_id: string; capi_token: string; enabled: number };
type Row = { pixel_id: string; enabled: boolean; capi_token: string; saved_token: string };

const EMPTY_ROW: Row = { pixel_id: '', enabled: false, capi_token: '', saved_token: '' };

/** O erro da API é um código; quem lê a tela precisa saber o que corrigir. */
function mensagemDeErro(codigo: string): string {
  if (codigo === 'pixel_id_invalido')
    return 'ID inválido. Use apenas letras, números, hífen e sublinhado — até 64 caracteres.';
  if (codigo === 'capi_token_invalido')
    return 'Token inválido. Cole o token inteiro do Gerenciador de Eventos, sem espaços nas pontas.';
  if (codigo === 'unauthorized') return 'Sua sessão expirou. Entre de novo para salvar.';
  return `Não foi possível salvar (${codigo}).`;
}

export function Pixels() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [status, setStatus] = useState<Record<string, { texto: string; erro: boolean }>>({});
  const [confirmando, setConfirmando] = useState<string | null>(null);

  function load() {
    api<{ pixels: Pixel[] }>('/api/admin/pixels')
      .then((r) => {
        const next: Record<string, Row> = {};
        for (const p of r.pixels) {
          next[p.provider] = {
            pixel_id: p.pixel_id,
            enabled: !!p.enabled,
            capi_token: '',
            saved_token: p.capi_token,
          };
        }
        setRows(next);
      })
      .catch(() => setRows({}));
  }

  useEffect(load, []);

  const row = (key: string) => rows[key] ?? EMPTY_ROW;
  const set = (key: string, patch: Partial<Row>) => {
    setRows({ ...rows, [key]: { ...row(key), ...patch } });
    setStatus({ ...status, [key]: { texto: '', erro: false } });
  };
  const diz = (key: string, texto: string, erro = false) =>
    setStatus((s) => ({ ...s, [key]: { texto, erro } }));

  async function save(key: string) {
    diz(key, 'Salvando…');
    const { pixel_id, enabled, capi_token } = row(key);
    try {
      await api(`/api/admin/pixels/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ pixel_id, enabled, capi_token }),
      });
      diz(key, 'Salvo. Entra no ar na próxima publicação do site.');
      load();
    } catch (e) {
      diz(key, mensagemDeErro((e as Error).message), true);
    }
  }

  async function clearToken(key: string) {
    setConfirmando(null);
    diz(key, 'Removendo token…');
    try {
      await api(`/api/admin/pixels/${key}/token`, { method: 'DELETE' });
      diz(key, 'Token removido. A Conversions API parou de enviar leads.');
      load();
    } catch (e) {
      diz(key, mensagemDeErro((e as Error).message), true);
    }
  }

  return (
    <div className="pixels">
      <PageHead icon={PULSE} title="Pixels e rastreio" />

      <div className="pixels__body">
        <p className="pixels__intro">
          Os códigos de medição entram no HTML quando o site é publicado. Para não derrubar a
          velocidade das páginas, o script do provedor só carrega 3 segundos depois da abertura —
          ou assim que a visita rolar ou clicar, o que vier primeiro.
        </p>

      {PROVIDERS.map((p) => {
        const r = row(p.key);
        const semId = r.pixel_id === '';
        const st = status[p.key];
        // O backend grava `enabled = 0` quando não há ID. Sem isto a tela mostraria
        // um estado que o banco não tem.
        const estado = semId
          ? { icone: ALERT, texto: 'Sem ID', classe: 'off' }
          : r.enabled
            ? { icone: CHECK, texto: 'Ativo no site', classe: 'on' }
            : { icone: PAUSE, texto: 'Pausado', classe: 'paused' };

        return (
          <section className={`provider provider--${estado.classe}`} key={p.key}>
            <header>
              <span className="provider__mark">
                <Icon d={p.icon} />
              </span>
              <div>
                <h2>{p.label}</h2>
                <p>{p.what}</p>
              </div>
              <span className="pill">
                <Icon d={estado.icone} />
                {estado.texto}
              </span>
            </header>

            <div className="provider__body">
              <label>
                <span className="field-head">
                  {p.idLabel}
                  <small className="hint">{p.idHint}</small>
                </span>
                <input
                  value={r.pixel_id}
                  placeholder={p.idPlaceholder}
                  spellCheck={false}
                  onChange={(e) => set(p.key, { pixel_id: e.target.value.trim() })}
                />
              </label>

              {p.key === 'meta' && (
                <label>
                  <span className="field-head">
                    <span className="field-head__title">
                      <Icon d={LOCK} />
                      Token da Conversions API
                    </span>
                    <small className="hint">
                      {r.saved_token
                        ? `Um token terminado em ${r.saved_token.slice(-4)} já está gravado. Deixe vazio para mantê-lo.`
                        : 'Opcional. Envia o lead direto do servidor para a Meta, mesmo quando o navegador bloqueia o pixel.'}
                    </small>
                  </span>
                  <span className="row">
                    <input
                      type="password"
                      value={r.capi_token}
                      autoComplete="off"
                      placeholder={r.saved_token ? 'Colar um token novo substitui o atual' : 'Cole o token do Gerenciador de Eventos'}
                      onChange={(e) => set(p.key, { capi_token: e.target.value.trim() })}
                    />
                    {r.saved_token && (
                      <button type="button" onClick={() => setConfirmando(p.key)}>
                        <Icon d={TRASH} />
                        Remover
                      </button>
                    )}
                  </span>

                  {confirmando === p.key && (
                    <div className="confirm" role="alertdialog" aria-label="Confirmar remoção do token">
                      <p>
                        Remover o token interrompe o envio de leads pela Conversions API. Ele não
                        pode ser recuperado — para voltar atrás será preciso gerar outro no
                        Gerenciador de Eventos.
                      </p>
                      <div className="confirm__actions">
                        <button type="button" onClick={() => setConfirmando(null)}>
                          Manter token
                        </button>
                        <button type="button" className="danger" onClick={() => clearToken(p.key)}>
                          Remover token
                        </button>
                      </div>
                    </div>
                  )}
                </label>
              )}

              <label className="inline">
                <input
                  type="checkbox"
                  checked={r.enabled && !semId}
                  disabled={semId}
                  onChange={(e) => set(p.key, { enabled: e.target.checked })}
                />
                Carregar no site
              </label>
              {semId && (
                <p className="hint hint--inset">
                  <Icon d={INFO} />
                  Informe o {p.idLabel.toLowerCase()} antes de ativar — sem ele não há o que carregar.
                </p>
              )}
            </div>

            <footer>
              <button className="primary" onClick={() => save(p.key)}>
                Salvar {p.label}
              </button>
              <span className={st?.erro ? 'provider__status is-error' : 'provider__status'} aria-live="polite">
                {st?.texto}
              </span>
            </footer>
          </section>
        );
      })}
      </div>
    </div>
  );
}
