import { useEffect, type ReactNode } from 'react';
import { Icon } from './icons';

/**
 * O vocabulário dos formulários desenhados à mão do painel.
 *
 * O editor genérico (`PageEditor`, `Field`) serve qualquer JSON e por isso não
 * sabe nada sobre ele: empilha os campos na ordem em que o banco devolve a
 * chave, todos na mesma largura, sem dizer quais formam uma coisa só. Onde o
 * registro tem forma conhecida e estável — dados da empresa, projeto — a tela
 * é desenhada, e estas três peças são o que ela usa.
 */

/** Grupo de campos: marca de ícone, título e a frase que diz onde aquilo sai no site. */
export function Grupo({
  icon,
  title,
  note,
  children,
}: {
  icon: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="ed-grupo">
      <header>
        <span className="ed-grupo__mark">
          <Icon d={icon} size={17} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{note}</p>
        </div>
      </header>
      <div className="ed-grupo__body">{children}</div>
    </section>
  );
}

/**
 * Campo de texto com o ícone dentro da moldura, como a busca do CRM.
 *
 * O ícone não decora: numa pilha de dez caixas iguais ele é o que separa CNPJ
 * de CREA, categoria de etiqueta, antes de o rótulo ser lido.
 */
export function Campo({
  icon,
  label,
  value,
  onChange,
  hint,
  erro,
  type = 'text',
  placeholder,
  ...rest
}: {
  icon?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  erro?: string;
  type?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  maxLength?: number;
  autoCapitalize?: string;
  className?: string;
}) {
  return (
    <label className="ed-f">
      <span className="ed-f__label">{label}</span>
      <span className={erro ? 'ed-f__box ed-f__box--erro' : 'ed-f__box'}>
        {icon && <Icon d={icon} />}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      </span>
      {erro ? (
        <small className="hint hint--error" role="status">
          {erro}
        </small>
      ) : (
        hint && <small className="hint">{hint}</small>
      )}
    </label>
  );
}

/** Texto longo: mesma moldura, sem ícone dentro — a caixa alta já se identifica. */
export function CampoLongo({
  label,
  value,
  onChange,
  hint,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="ed-f">
      <span className="ed-f__label">{label}</span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

/**
 * Escape fecha o que está por cima. Sobreposição que só fecha no × prende quem
 * usa teclado e quem abriu por engano.
 */
export function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
}
