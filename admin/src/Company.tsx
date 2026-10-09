import { useEffect, useState } from 'react';
import { api, type Page } from './api';
import { Field, type Json } from './PageEditor';
import {
  BRIEFCASE,
  CLOCK,
  ID_CARD,
  Icon,
  LINK,
  MAIL,
  MAP,
  PAGE_FOOT,
  PHONE,
  PIN,
  SHIELD,
} from './icons';
import { Campo, CampoLongo, Grupo } from './FormKit';
import { PageHead } from './PageHead';

/**
 * Dados da empresa: telefone, endereço, CNPJ, CREA e a descrição do rodapé.
 *
 * Alimentam o rodapé de *todas* as páginas, a página de contato e o JSON-LD do
 * Google. Antes estavam copiados nos 7 arquivos de conteúdo e já haviam
 * divergido em produção — o CREA aparecia em quatro rodapés e sumia nos outros
 * três. Agora moram na página `contato` e o build os distribui
 * (site/vite.config.js, CONTACT_OWNER).
 */
const OWNER = 'contato';

type Contact = Record<string, Json>;

/** Os campos que esta tela desenha à mão, na ordem em que se preenchem. */
const CONHECIDOS = [
  'phone',
  'phoneDigits',
  'email',
  'address',
  'city',
  'state',
  'zip',
  'cnpj',
  'crea',
  'hours',
  'footerText',
];

/**
 * O telefone do link é o telefone exibido sem os enfeites.
 *
 * Eram dois campos digitados à mão e um só número: `+55 33 99145-6937` e
 * `553391456937` tinham de concordar para o botão de WhatsApp cair na pessoa
 * certa, e nada no painel garantia isso. Mesma decisão já tomada para o
 * endereço do artigo e o tempo de leitura (PageEditor, `derive`): quando um
 * campo é formato puro de outro, ele é mostrado, nunca digitado.
 */
const soDigitos = (s: string) => s.replace(/\D/g, '');

/** Aviso de formato, nunca bloqueio: um CNPJ torto não pode custar o texto já escrito. */
function formatoSuspeito(k: string, v: string): string {
  if (v.trim() === '') return '';
  if (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return 'Não parece um e-mail válido — confira antes de publicar.';
  if (k === 'zip' && !/^\d{5}-?\d{3}$/.test(v)) return 'O CEP tem 8 dígitos, no formato 00000-000.';
  if (k === 'cnpj' && !/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(v))
    return 'O CNPJ tem 14 dígitos, no formato 00.000.000/0000-00.';
  if (k === 'state' && !/^[A-Za-z]{2}$/.test(v)) return 'A UF tem duas letras. Ex.: MG.';
  if (k === 'phone' && soDigitos(v).length < 10)
    return 'Faltam dígitos: o número precisa do DDD, e do 55 se for para o WhatsApp.';
  return '';
}

/**
 * O rodapé montado com os valores da tela, campo por campo.
 *
 * A tela edita onze fragmentos que só existem juntos, em outra página, com
 * pontuação que o painel não mostra: `CNPJ … · CREA-MG`, `Cidade, UF · CEP`.
 * Sem ver a linha pronta, a vírgula que falta no endereço só aparece publicada.
 * A composição aqui é a mesma de site/build/render.js, `foot`.
 */
function Rodape({ c }: { c: Record<string, string> }) {
  const linha = (s: string) => s.trim();
  return (
    <div className="ed-preview" aria-label="Prévia do rodapé do site">
      <span className="ed-preview__tag">Como aparece no rodapé de todas as páginas</span>
      <div className="ed-preview__cols">
        <div>
          <p className="ed-preview__desc">{linha(c.footerText) || 'Descrição do rodapé…'}</p>
          <p className="ed-preview__note">{linha(c.hours)}</p>
          <p className="ed-preview__note">
            {c.cnpj && `CNPJ ${c.cnpj}`}
            {c.cnpj && c.crea && ' · '}
            {c.crea}
          </p>
        </div>
        <div>
          <h3>Contato &amp; Localização</h3>
          <p className="ed-preview__forte">{linha(c.phone)}</p>
          <p>{linha(c.email)}</p>
          <p>
            {linha(c.address)}
            <br />
            {c.city}
            {c.city && c.state && ', '}
            {c.state}
            {c.zip && ` · CEP ${c.zip}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Company() {
  const [page, setPage] = useState<Page | null>(null);
  const [status, setStatus] = useState('');
  const [sujo, setSujo] = useState(false);

  useEffect(() => {
    api<Page>(`/api/pages/${OWNER}`)
      .then(setPage)
      .catch(() => setStatus('Não foi possível carregar os dados da empresa.'));
  }, []);

  if (!page) return <p className="state">{status || 'Carregando dados da empresa…'}</p>;

  const contact = (page.blocks.contact ?? {}) as Contact;
  const c = Object.fromEntries(
    Object.entries(contact).map(([k, v]) => [k, typeof v === 'string' ? v : '']),
  ) as Record<string, string>;

  // Chave que o seed criar depois desta tela não pode sumir do painel: cai aqui,
  // no editor genérico, em vez de ficar invisível e ainda assim publicada.
  const extras = Object.keys(contact).filter((k) => !CONHECIDOS.includes(k));

  function set(k: string, v: string) {
    const next = { ...contact, [k]: v };
    // O telefone do link acompanha o exibido; ninguém digita os dois.
    if (k === 'phone') next.phoneDigits = soDigitos(v);
    setPage({ ...page!, blocks: { ...page!.blocks, contact: next } });
    setSujo(true);
    setStatus('');
  }

  // Grava a página inteira: o restante dos blocos vai de volta como veio.
  async function save() {
    setStatus('Salvando…');
    try {
      await api(`/api/admin/pages/${OWNER}`, {
        method: 'PUT',
        body: JSON.stringify({ title: page!.title, blocks: page!.blocks, meta: page!.meta }),
      });
      setStatus('Dados atualizados em todas as páginas do site.');
      setSujo(false);
    } catch (e) {
      setStatus(`Não foi possível salvar: ${(e as Error).message}`);
    }
  }

  const err = (k: string) => formatoSuspeito(k, c[k] ?? '');
  const wa = soDigitos(c.phone ?? '');

  return (
    <div className="pages">
      <PageHead
        icon={BRIEFCASE}
        title="Dados da empresa"
        status={status || (sujo ? 'Alterações não salvas' : '')}
        actions={
          <button className="primary" onClick={save} disabled={!sujo}>
            Salvar e publicar
          </button>
        }
      />

      <div className="pages__body ed">
        <p className="hint">
          Estes campos valem para o site inteiro: rodapé de todas as páginas, página de contato e
          os dados que o Google lê. Não existe versão por página.
        </p>

        <Grupo
          icon={PHONE}
          title="Contato"
          note="Por onde o cliente notificado fala com a engenheira. Sai no rodapé, na página de contato e nos botões de WhatsApp."
        >
          <div className="ed-linha ed-linha--2">
            <Campo
              icon={PHONE}
              label="Telefone exibido"
              value={c.phone ?? ''}
              onChange={(v) => set('phone', v)}
              erro={err('phone')}
              hint="Escreva como quer que apareça na tela."
              type="tel"
              inputMode="tel"
              placeholder="+55 33 99145-6937"
            />
            <Campo
              icon={MAIL}
              label="E-mail"
              value={c.email ?? ''}
              onChange={(v) => set('email', v)}
              erro={err('email')}
              type="email"
              inputMode="email"
              placeholder="contato@empresa.com.br"
            />
          </div>

          <div className="derived">
            <span className="derived__label">
              <span className="ed-derived__head">
                <Icon d={LINK} size={13} />
                Link do WhatsApp e do telefone
              </span>
            </span>
            <p className={wa ? 'derived__value' : 'derived__value derived__value--vazio'}>
              {wa ? `wa.me/${wa}` : 'Preencha o telefone para gerar o link.'}
            </p>
            <small className="hint">
              Montado a partir do telefone acima, só com os números. Eram dois campos separados e
              bastava um errar um dígito para o botão de WhatsApp cair em outro número.
            </small>
          </div>
        </Grupo>

        <Grupo
          icon={PIN}
          title="Endereço"
          note="Entra no rodapé, no mapa e no endereço estruturado que o Google lê para a busca local."
        >
          <Campo
            icon={MAP}
            label="Logradouro, número e bairro"
            value={c.address ?? ''}
            onChange={(v) => set('address', v)}
            placeholder="Rua Crisolino Ferreira da Costa, 145, Castanheiras"
          />
          <div className="ed-linha ed-linha--cidade">
            <Campo
              icon={PIN}
              label="Cidade"
              value={c.city ?? ''}
              onChange={(v) => set('city', v)}
              placeholder="Governador Valadares"
            />
            <label className="ed-f">
              <span className="ed-f__label">UF</span>
              <span className={err('state') ? 'ed-f__box ed-f__box--erro' : 'ed-f__box'}>
                <input
                  className="ed-f__uf"
                  value={c.state ?? ''}
                  maxLength={2}
                  autoCapitalize="characters"
                  onChange={(e) => set('state', e.target.value.toUpperCase())}
                  placeholder="MG"
                />
              </span>
              {err('state') && (
                <small className="hint hint--error" role="status">
                  {err('state')}
                </small>
              )}
            </label>
            <label className="ed-f">
              <span className="ed-f__label">CEP</span>
              <span className={err('zip') ? 'ed-f__box ed-f__box--erro' : 'ed-f__box'}>
                <input
                  value={c.zip ?? ''}
                  inputMode="numeric"
                  maxLength={9}
                  onChange={(e) => set('zip', e.target.value)}
                  placeholder="35054-767"
                />
              </span>
              {err('zip') && (
                <small className="hint hint--error" role="status">
                  {err('zip')}
                </small>
              )}
            </label>
          </div>
        </Grupo>

        <Grupo
          icon={SHIELD}
          title="Registro e atendimento"
          note="O que prova, no rodapé, que há empresa e responsabilidade técnica por trás do serviço."
        >
          <div className="ed-linha ed-linha--2">
            <Campo
              icon={ID_CARD}
              label="CNPJ"
              value={c.cnpj ?? ''}
              onChange={(v) => set('cnpj', v)}
              erro={err('cnpj')}
              inputMode="numeric"
              maxLength={18}
              placeholder="00.000.000/0000-00"
            />
            <Campo
              icon={SHIELD}
              label="CREA"
              value={c.crea ?? ''}
              onChange={(v) => set('crea', v)}
              hint="Sai no rodapé exatamente como for escrito aqui. Vazio some da linha."
              placeholder="CREA-MG 000000/D"
            />
          </div>
          <Campo
            icon={CLOCK}
            label="Horário de atendimento"
            value={c.hours ?? ''}
            onChange={(v) => set('hours', v)}
            placeholder="Atendimento com agendamento prévio"
          />
        </Grupo>

        <Grupo
          icon={PAGE_FOOT}
          title="Rodapé do site"
          note="O parágrafo abaixo do logo, em todas as páginas. Duas linhas bastam: quem é a empresa e o que resolve."
        >
          <CampoLongo
            label="Descrição no rodapé"
            rows={3}
            value={c.footerText ?? ''}
            onChange={(v) => set('footerText', v)}
            placeholder="Engenharia especializada em projetos de combate a incêndio (PPCI)…"
          />
          <Rodape c={c} />
        </Grupo>

        {extras.length > 0 && (
          <Grupo
            icon={BRIEFCASE}
            title="Outros campos"
            note="Campos que o conteúdo do site trouxe e esta tela ainda não organiza. Editáveis do mesmo jeito."
          >
            {extras.map((k) => (
              <Field
                key={k}
                name={k}
                value={contact[k]}
                onChange={(v) => {
                  setPage({
                    ...page!,
                    blocks: { ...page!.blocks, contact: { ...contact, [k]: v } },
                  });
                  setSujo(true);
                  setStatus('');
                }}
              />
            ))}
          </Grupo>
        )}
      </div>
    </div>
  );
}
