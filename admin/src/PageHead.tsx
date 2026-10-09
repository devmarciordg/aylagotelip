import type { ReactNode } from 'react';
import { Icon } from './icons';

/**
 * Cabeçalho único de toda tela do painel.
 *
 * Antes cada seção inventava a sua barra (`.crm-bar`, `.pages__bar`, um `h1`
 * solto dentro do corpo em Pixels), então o título mudava de lugar e de peso a
 * cada clique da navegação. Aqui a linha é sempre a mesma: ícone da seção,
 * título, ferramentas no meio, estado e ação primária à direita.
 */
export function PageHead({
  icon,
  title,
  tools,
  status,
  actions,
}: {
  icon: string;
  title: string;
  tools?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="phead">
      <h1 className="phead__title">
        <span className="phead__mark">
          <Icon d={icon} size={16} />
        </span>
        {title}
      </h1>
      {tools && <div className="phead__tools">{tools}</div>}
      <span className="phead__spacer" />
      {status && (
        <span className="phead__status" aria-live="polite">
          {status}
        </span>
      )}
      {actions}
    </header>
  );
}
