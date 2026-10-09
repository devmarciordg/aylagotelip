import { useState } from 'react';
import { Campo, CampoLongo } from './FormKit';
import { type Json } from './PageEditor';
import { CHEVRON, HELP, INFO, Icon, SPEECH, STAR } from './icons';

/**
 * Editor de uma pergunta frequente.
 *
 * O par `{q, a}` é o registro mais curto do painel e por isso o mais fácil de
 * desenhar errado: dois campos de texto soltos não dizem nada sobre o que eles
 * viram. No site cada par é um `<details>` da seção de perguntas — e o **primeiro
 * da lista nasce aberto** (site/build/render.js, `faqSection`) — e, junto com os
 * outros, alimenta o bloco `FAQPage` do Schema.org, que é o que o Google lê para
 * montar o resultado expandido na busca (`faqJsonLd`).
 *
 * Nada disso era visível no painel: a resposta que aparece de cara na página e a
 * resposta que o Google cita eram, na tela, duas caixas de texto iguais.
 */

const texto = (v: Json | undefined) => (typeof v === 'string' ? v : '');

/** Aviso de conteúdo, nunca bloqueio. Publicar torto é decisão de quem escreve. */
function reparos(q: string, a: string): string[] {
  const avisos: string[] = [];
  if (q.trim() !== '' && !/[?？]\s*$/.test(q.trim()))
    avisos.push('A pergunta não termina em “?”. Na página ela aparece exatamente como escrita aqui.');
  if (q.trim() !== '' && a.trim() === '')
    avisos.push('Sem resposta, o item abre vazio na página e entra vazio no resultado do Google.');
  return avisos;
}

/**
 * O acordeão como o site o publica.
 *
 * `<details>` nativo, a mesma marcação de `faqSection`: abrir aqui é abrir lá.
 * Sem isto a única forma de ver a quebra de linha da resposta era publicar.
 */
function Acordeao({ q, a, aberto }: { q: string; a: string; aberto: boolean }) {
  return (
    <div className="ed-preview" aria-label="Prévia da pergunta na página">
      <span className="ed-preview__tag">Como aparece na home e em /sobre/#faq</span>
      <details className="faq-prev" open={aberto}>
        <summary>
          <span>{q || 'Pergunta…'}</span>
          <Icon d={CHEVRON} />
        </summary>
        <p>{a || 'Resposta…'}</p>
      </details>
    </div>
  );
}

export function Faq({
  value,
  onChange,
  index,
  total,
}: {
  value: Json;
  onChange: (v: Json) => void;
  index: number;
  total: number;
}) {
  const [abertoNaPrevia, setAbertoNaPrevia] = useState(true);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, Json>;
  const q = texto(o.q);
  const a = texto(o.a);
  const primeira = index === 0;
  const avisos = reparos(q, a);

  return (
    <div className="ed faq-ed">
      {/* O par é uma coisa só: pergunta e resposta dividem a mesma moldura, em
          vez de virarem dois campos avulsos entre outros quaisquer. */}
      <section className="faq-ed__par">
        <div className="faq-ed__lado">
          <span className="faq-ed__mark faq-ed__mark--q">
            <Icon d={HELP} size={17} />
          </span>
          <Campo
            label="Pergunta"
            value={q}
            onChange={(v) => onChange({ ...o, q: v })}
            hint="Escreva como o cliente perguntaria ao telefone, não como a norma diz."
            placeholder="Recebi uma notificação do Corpo de Bombeiros. Como proceder?"
          />
        </div>

        <div className="faq-ed__lado">
          <span className="faq-ed__mark faq-ed__mark--a">
            <Icon d={SPEECH} size={17} />
          </span>
          <CampoLongo
            label="Resposta"
            rows={6}
            value={a}
            onChange={(v) => onChange({ ...o, a: v })}
            placeholder="Guarde o documento e entre em contato antes do vencimento do prazo…"
          />
        </div>

        <p className="faq-ed__conta">
          <span>{a.trim() === '' ? 'Resposta vazia' : `${a.trim().length} caracteres`}</span>
          <span className="faq-ed__sep" aria-hidden="true">
            ·
          </span>
          <span>
            pergunta {index + 1} de {total}
          </span>
        </p>
      </section>

      {avisos.map((t) => (
        <p className="hint hint--inset hint--error" role="status" key={t}>
          <Icon d={INFO} size={14} />
          <span>{t}</span>
        </p>
      ))}

      {primeira && (
        <p className="faq-ed__primeira">
          <span className="faq-ed__mark faq-ed__mark--star">
            <Icon d={STAR} size={15} />
          </span>
          <span>
            <strong>Esta é a primeira da lista, então nasce aberta na página.</strong> É a única
            resposta que o visitante lê sem clicar — use as setas do cabeçalho para trocar a ordem.
          </span>
        </p>
      )}

      <label className="faq-ed__toggle">
        <input
          type="checkbox"
          checked={abertoNaPrevia}
          onChange={(e) => setAbertoNaPrevia(e.target.checked)}
        />
        <span>Ver a prévia aberta</span>
      </label>

      <Acordeao q={q} a={a} aberto={abertoNaPrevia} />

      <p className="hint hint--inset">
        <Icon d={INFO} size={14} />
        <span>
          As perguntas desta lista também são publicadas como <code>FAQPage</code> do Schema.org: é
          esse bloco que o Google lê para mostrar a pergunta e a resposta direto no resultado de
          busca. O texto sai daqui sem edição.
        </span>
      </p>
    </div>
  );
}
