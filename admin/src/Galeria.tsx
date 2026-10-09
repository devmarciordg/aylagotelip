import { useEffect, useState } from 'react';
import { api, API_BASE, type Page } from './api';
import { Grupo, useEscape } from './FormKit';
import { PageHead } from './PageHead';
import { BUILDING, CLOSE, IMAGE, Icon, TRASH, USER } from './icons';

/**
 * Galeria: as fotos fixas do site, trocadas no lugar onde elas aparecem.
 *
 * As outras telas de conteúdo editam texto e tratam a foto como mais um campo
 * com um caminho de arquivo dentro. Só que quem troca a foto da home não pensa
 * em `blocks.hero.desktopImage` — pensa "a foto grande da primeira tela". Aqui
 * cada posição do site é um cartão com a foto que está no ar, e o caminho no
 * JSON é problema desta tela.
 *
 * O tamanho também: cada posição tem as larguras que o site usa (a hero cobre
 * 1920px no desktop e 900 no celular, o cartão de solução mostra a foto do
 * serviço em 600). O `slot` enviado no upload é o que diz isso à API, que grava
 * uma variante por largura em WebP — a pessoa envia a foto que tem.
 */

type Bloco = Record<string, unknown>;

/** Posição de imagem no site: onde ela aparece e onde o valor mora no conteúdo. */
type Slot = {
  id: string;
  /** Chave de `GALLERY_SLOTS` no backend — decide as larguras geradas. */
  tipo: string;
  pagina: 'home' | 'servicos' | 'sobre';
  caminho: (string | number)[];
  label: string;
  nota: string;
  /** Proporção da moldura de prévia, para mostrar o recorte que o site publica. */
  ratio: string;
};

const SECOES: { icon: string; titulo: string; nota: string; slots: Slot[] }[] = [
  {
    icon: IMAGE,
    titulo: 'Página inicial',
    nota: 'A primeira tela e a seção de atendimento. São as fotos que mais gente vê.',
    slots: [
      {
        id: 'hero-desktop',
        tipo: 'hero-desktop',
        pagina: 'home',
        caminho: ['hero', 'desktopImage'],
        label: 'Primeira tela — computador',
        nota: 'Fundo da tela inteira. O texto entra por cima do lado esquerdo, então deixe esse lado com menos informação.',
        ratio: '16 / 9',
      },
      {
        id: 'hero-mobile',
        tipo: 'hero-mobile',
        pagina: 'home',
        caminho: ['hero', 'imageSlot'],
        label: 'Primeira tela — celular',
        nota: 'O cartão de apresentação da engenheira. Foto em pé.',
        ratio: '3 / 4',
      },
      {
        id: 'atendimento',
        tipo: 'atendimento',
        pagina: 'home',
        caminho: ['whyImageSlot'],
        label: 'Atendimento',
        nota: 'Seção "diferencial", no meio da home.',
        ratio: '3 / 4',
      },
    ],
  },
  {
    icon: USER,
    titulo: 'Página Sobre',
    nota: 'As duas fotos da página da engenheira.',
    slots: [
      {
        id: 'sobre-retrato',
        tipo: 'sobre-retrato',
        pagina: 'sobre',
        caminho: ['portraitSlot'],
        label: 'Retrato',
        nota: 'Topo da página, ao lado do texto de apresentação. Foto em pé.',
        ratio: '3 / 4',
      },
      {
        id: 'sobre-escritorio',
        tipo: 'sobre-escritorio',
        pagina: 'sobre',
        caminho: ['commitment', 'image'],
        label: 'Critério técnico',
        nota: 'Seção "critério técnico e acompanhamento direto", abaixo do retrato. Foto deitada.',
        ratio: '4 / 3',
      },
    ],
  },
];

/** Os serviços são cadastrados no painel, então os cartões saem da lista salva. */
function slotsDeServicos(blocks: Bloco | undefined): Slot[] {
  const lista = (blocks?.services ?? []) as { slug?: string; title?: string }[];
  return lista.map((s, i) => ({
    id: `servico-${s.slug ?? i}`,
    tipo: 'servico',
    pagina: 'servicos',
    caminho: ['services', i, 'image'],
    label: s.title ?? `Serviço ${i + 1}`,
    nota: 'Aparece na página do serviço e, em tamanho menor, no cartão da home.',
    ratio: '3 / 2',
  }));
}

const ler = (o: unknown, caminho: (string | number)[]): string => {
  const v = caminho.reduce<unknown>((x, k) => (x as Record<string, unknown>)?.[k], o);
  return typeof v === 'string' ? v : '';
};

/** Grava no caminho clonando só o que está nele — o resto do bloco vai de volta como veio. */
function gravar<T>(o: T, caminho: (string | number)[], valor: string): T {
  const [k, ...resto] = caminho;
  const filho = resto.length === 0 ? valor : gravar((o as never)[k], resto, valor);
  if (Array.isArray(o)) {
    return o.map((x, i) => (i === k ? filho : x)) as T;
  }
  return { ...(o as object), [k]: filho } as T;
}

/** Caminho servido pela API (`/uploads/…`) ou pelo próprio site (`/img/…`). */
const urlDaFoto = (p: string) => (p.startsWith('/uploads/') ? API_BASE + p : p);

type Foto = { url: string; largura: number; altura: number; at: number; em_uso: boolean };

/**
 * Proporção de uma foto, no formato que quem escolhe reconhece.
 *
 * `1920×1072` reduzido pelo MDC vira `120:67`, que não diz nada. As proporções
 * que as posições do site usam são poucas e conhecidas, então a foto é
 * aproximada à mais próxima (2% de folga, o bastante para um recorte manual
 * fora por um pixel) e só cai na razão decimal quando não é nenhuma delas.
 */
const PROPORCOES: [string, number][] = [
  ['21:9', 21 / 9],
  ['16:9', 16 / 9],
  ['3:2', 3 / 2],
  ['4:3', 4 / 3],
  ['1:1', 1],
  ['3:4', 3 / 4],
  ['2:3', 2 / 3],
  ['9:16', 9 / 16],
];

/** A proporção que a posição publica, escrita no slot como `aspect-ratio`. */
const proporcaoDoSlot = (slot: Slot) =>
  proporcao(...(slot.ratio.split(' / ').map(Number) as [number, number]));

function proporcao(largura: number, altura: number): string {
  if (!largura || !altura) return '';
  const r = largura / altura;
  const perto = PROPORCOES.find(([, v]) => Math.abs(r - v) / v < 0.02);
  return perto ? perto[0] : `${r.toFixed(2).replace('.', ',')}:1`;
}

/**
 * Biblioteca: as fotos já enviadas, para reaproveitar uma sem subir de novo.
 *
 * Em modal e não dentro do cartão porque a lista cresce a cada envio e a
 * escolha é entre fotos, não entre uma foto e o formulário atrás dela. Cada
 * item mostra a proporção: é ela que decide se a foto serve à posição — uma
 * foto em pé numa faixa 16:9 é recortada pelo meio, e isso só apareceria
 * publicado.
 */
function Biblioteca({
  slot,
  atual,
  fotos,
  onEscolher,
  onApagar,
  onFechar,
}: {
  slot: Slot;
  atual: string;
  fotos: Foto[];
  onEscolher: (url: string) => void;
  onApagar: (foto: Foto) => Promise<string>;
  onFechar: () => void;
}) {
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState<string | null>(null);
  useEscape(onFechar);

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal gal-modal" role="dialog" aria-label="Fotos já enviadas">
        <header>
          <h2>
            <Icon d={IMAGE} size={15} />
            Fotos já enviadas
          </h2>
          <button type="button" className="icon-btn" onClick={onFechar} aria-label="Fechar">
            <Icon d={CLOSE} size={15} />
          </button>
        </header>

        <p className="hint">
          Para <strong>{slot.label}</strong>, o site usa {proporcaoDoSlot(slot)}. Uma foto em outra proporção é
          recortada, e uma menor que a posição aparece sem nitidez.
        </p>

        {erro && (
          <small className="hint hint--error" role="alert">
            {erro}
          </small>
        )}

        {fotos.length === 0 ? (
          <p className="state">Nenhuma foto enviada ainda.</p>
        ) : (
          <ul className="gal-lib">
            {fotos.map((f) => (
              <li key={f.url}>
                <button
                  type="button"
                  className="gal-lib__foto"
                  aria-current={f.url === atual || undefined}
                  onClick={() => onEscolher(f.url)}
                >
                  <img src={API_BASE + f.url} alt="" loading="lazy" />
                </button>
                <span className="gal-lib__meta">
                  <strong>{proporcao(f.largura, f.altura)}</strong>
                  <small>
                    {f.largura} × {f.altura}
                  </small>
                </span>
                <button
                  type="button"
                  className="gal-lib__apagar"
                  title={f.em_uso ? 'Em uso em alguma página do site' : 'Apagar foto'}
                  disabled={f.em_uso}
                  onClick={() => {
                    setErro('');
                    setConfirmando(f.url);
                  }}
                >
                  <Icon d={TRASH} size={14} />
                </button>

                {confirmando === f.url && (
                  <div className="confirm" role="alertdialog" aria-label="Confirmar exclusão">
                    <p>Apagar esta foto do servidor. Não dá para recuperar.</p>
                    <div className="confirm__actions">
                      <button type="button" onClick={() => setConfirmando(null)}>
                        Manter
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={async () => {
                          setConfirmando(null);
                          setErro(await onApagar(f));
                        }}
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Cartao({
  slot,
  valor,
  onChange,
  biblioteca,
  onEnviou,
  onApagar,
}: {
  slot: Slot;
  valor: string;
  onChange: (v: string) => void;
  biblioteca: Foto[];
  onEnviou: () => void;
  onApagar: (foto: Foto) => Promise<string>;
}) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [quebrou, setQuebrou] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const alvo = proporcaoDoSlot(slot);

  function enviar() {
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
        const { url } = await api<{ url: string }>(`/api/admin/gallery/${slot.tipo}`, {
          method: 'POST',
          body,
        });
        setQuebrou(false);
        onChange(url);
        onEnviou();
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
    <div className="gal-card">
      <div className="gal-card__quadro" style={{ aspectRatio: slot.ratio }}>
        {valor && !quebrou ? (
          <img src={urlDaFoto(valor)} alt="" onError={() => setQuebrou(true)} />
        ) : (
          <span className="gal-card__vazio">
            <Icon d={IMAGE} size={22} />
            <span>{valor ? 'Imagem não encontrada' : 'Sem foto'}</span>
          </span>
        )}
      </div>

      <div className="gal-card__txt">
        <strong>
          {slot.label}
          {/* A proporção fica junto do rótulo porque é o que a pessoa precisa
              saber antes de escolher o arquivo, não depois de ver o recorte. */}
          <span className="gal-card__ratio">{alvo}</span>
        </strong>
        <small>{slot.nota}</small>
      </div>

      <div className="gal-card__acoes">
        <button type="button" onClick={enviar} disabled={busy}>
          <Icon d={IMAGE} />
          <span>{busy ? 'Enviando…' : 'Enviar nova'}</span>
        </button>
        <button type="button" onClick={() => setEscolhendo(true)}>
          Usar uma já enviada
        </button>
      </div>

      {erro && (
        <small className="hint hint--error" role="alert">
          {erro}
        </small>
      )}

      {escolhendo && (
        <Biblioteca
          slot={slot}
          atual={valor}
          fotos={biblioteca}
          onEscolher={(url) => {
            setQuebrou(false);
            onChange(url);
            setEscolhendo(false);
          }}
          onApagar={onApagar}
          onFechar={() => setEscolhendo(false)}
        />
      )}
    </div>
  );
}

export function Galeria() {
  const [pages, setPages] = useState<Record<string, Page> | null>(null);
  const [biblioteca, setBiblioteca] = useState<Foto[]>([]);
  const [sujas, setSujas] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  const carregarBiblioteca = () =>
    api<{ images: Foto[] }>('/api/admin/gallery')
      .then((r) => setBiblioteca(r.images))
      .catch(() => setBiblioteca([]));

  /** @returns mensagem de erro, ou '' quando a foto saiu do servidor. */
  async function apagar(foto: Foto): Promise<string> {
    try {
      await api(`/api/admin/gallery/${foto.url.replace('/uploads/', '')}`, { method: 'DELETE' });
      await carregarBiblioteca();
      return '';
    } catch (e) {
      // A API recusa apagar foto que alguma página ainda usa: o arquivo sumiria
      // do disco na hora e a página publicada ficaria com um buraco silencioso.
      return (e as Error).message === 'imagem_em_uso'
        ? 'Esta foto ainda está em uso em alguma posição do site. Troque a foto lá antes de apagar.'
        : 'Não foi possível apagar a foto.';
    }
  }

  useEffect(() => {
    Promise.all(['home', 'servicos', 'sobre'].map((slug) => api<Page>(`/api/pages/${slug}`)))
      .then((lista) => setPages(Object.fromEntries(lista.map((p) => [p.slug, p]))))
      .catch(() => setStatus('Não foi possível carregar as páginas do site.'));
    carregarBiblioteca();
  }, []);

  if (!pages) return <p className="state">{status || 'Carregando galeria…'}</p>;

  const secoes = [
    ...SECOES,
    {
      icon: BUILDING,
      titulo: 'Serviços',
      nota: 'Uma foto por serviço. A mesma imagem serve a página do serviço e o cartão da home.',
      slots: slotsDeServicos(pages.servicos?.blocks),
    },
  ];

  function set(slot: Slot, url: string) {
    const page = pages![slot.pagina];
    setPages({ ...pages, [slot.pagina]: { ...page, blocks: gravar(page.blocks, slot.caminho, url) } });
    setSujas((s) => (s.includes(slot.pagina) ? s : [...s, slot.pagina]));
    setStatus('');
  }

  async function salvar() {
    setStatus('Salvando…');
    try {
      for (const slug of sujas) {
        const p = pages![slug];
        await api(`/api/admin/pages/${slug}`, {
          method: 'PUT',
          body: JSON.stringify({ title: p.title, blocks: p.blocks, meta: p.meta }),
        });
      }
      setSujas([]);
      setStatus('Imagens atualizadas. Publique o site para elas entrarem no ar.');
    } catch (e) {
      setStatus(`Não foi possível salvar: ${(e as Error).message}`);
    }
  }

  return (
    <div className="pages">
      <PageHead
        icon={IMAGE}
        title="Galeria"
        status={status || (sujas.length > 0 ? 'Alterações não salvas' : '')}
        actions={
          <button className="primary" onClick={salvar} disabled={sujas.length === 0}>
            Salvar e publicar
          </button>
        }
      />

      <div className="pages__body ed">
        <p className="hint">
          Envie a foto no tamanho que tiver: cada posição já sabe as larguras que o site usa e a
          imagem é convertida para WebP e recortada para elas no envio. As fotos enviadas ficam
          guardadas e podem ser usadas de novo em qualquer posição, ou apagadas quando nenhuma
          página usar mais.
        </p>

        {secoes.map((s) => (
          <Grupo key={s.titulo} icon={s.icon} title={s.titulo} note={s.nota}>
            <div className="gal-grid">
              {s.slots.map((slot) => (
                <Cartao
                  key={slot.id}
                  slot={slot}
                  valor={ler(pages![slot.pagina]?.blocks, slot.caminho)}
                  onChange={(v) => set(slot, v)}
                  biblioteca={biblioteca}
                  onEnviou={carregarBiblioteca}
                  onApagar={apagar}
                />
              ))}
            </div>
          </Grupo>
        ))}
      </div>
    </div>
  );
}
