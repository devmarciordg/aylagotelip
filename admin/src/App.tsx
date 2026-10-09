import { useEffect, useState } from 'react';
import { api, type User } from './api';
import { Login } from './Login';
import { Kanban } from './Kanban';
import { Collection } from './Collection';
import { Projeto } from './Projeto';
import { Faq } from './Faq';
import { Etapas } from './Etapas';
import { Pixels } from './Pixels';
import { Company } from './Company';
import { Galeria } from './Galeria';
import { ARTICLE, BOARD, BRIEFCASE, BUILDING, HELP, IMAGE, Icon, LOGOUT, PULSE, TUNE, USER } from './icons';
import logo from './logo.svg';

// ponytail: router de hash em 8 linhas. Trocar por react-router se surgirem rotas aninhadas.
function useHash(): string {
  const [hash, setHash] = useState(() => location.hash.slice(1) || '/leads');
  useEffect(() => {
    const onChange = () => setHash(location.hash.slice(1) || '/leads');
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/**
 * A navegação é a única estrutura constante do painel, então ela carrega o
 * significado: ícone para reconhecer de relance, rótulo para não depender do
 * ícone, e um agrupamento que separa o trabalho diário (leads) do que se mexe
 * de vez em quando (conteúdo) e do que quase não se mexe (configuração).
 */
const NAV = [
  { group: 'Operação', items: [{ href: '/leads', label: 'CRM', icon: BOARD }] },
  {
    group: 'Conteúdo do site',
    items: [
      { href: '/artigos', label: 'Artigos', icon: ARTICLE },
      { href: '/projetos', label: 'Projetos', icon: BUILDING },
      { href: '/galeria', label: 'Galeria', icon: IMAGE },
      { href: '/faq', label: 'Perguntas frequentes', icon: HELP },
    ],
  },
  {
    group: 'Configuração',
    items: [
      { href: '/etapas', label: 'Etapas do funil', icon: TUNE },
      { href: '/empresa', label: 'Dados da empresa', icon: BRIEFCASE },
      { href: '/pixels', label: 'Pixels e rastreio', icon: PULSE },
    ],
  },
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const route = useHash();

  useEffect(() => {
    api<{ user: User }>('/api/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <p className="state">Carregando…</p>;
  if (!user) return <Login onLogin={setUser} />;

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  return (
    <div className="shell">
      <aside className="side">
        <a className="side__brand" href="#/leads">
          <img src={logo} alt="Gotelip Engenharia" width="148" height="35" />
          <span className="side__brand-sub">Painel administrativo</span>
        </a>

        <nav className="side__nav" aria-label="Seções do painel">
          {NAV.map(({ group, items }) => (
            <div className="side__group" key={group}>
              <h2 className="side__group-title">{group}</h2>
              {items.map(({ href, label, icon }) => (
                <a key={href} href={`#${href}`} aria-current={route === href || undefined}>
                  <Icon d={icon} size={16} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="side__foot">
          <span className="side__who">
            <Icon d={USER} size={14} />
            <span>{user.name}</span>
          </span>
          <button onClick={logout} title="Encerrar sessão">
            <Icon d={LOGOUT} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main>
        {route === '/artigos' ? (
          <Collection
            slug="blog"
            block="posts"
            heading="Artigos do blog"
            icon={ARTICLE}
            singular="artigo"
            routeBase="/blog/"
            hint="Cada artigo vira uma página própria do site. Escreva o texto no editor e envie as imagens por ele: elas são convertidas para WebP e publicadas junto com a página."
          />
        ) : route === '/projetos' ? (
          <Collection
            slug="projetos"
            block="slots"
            heading="Projetos publicados"
            icon={BUILDING}
            singular="projeto"
            editor={Projeto}
            hint="Os projetos aparecem na página /projetos/ e, quando marcados como destaque, também na home."
          />
        ) : route === '/galeria' ? (
          <Galeria />
        ) : route === '/faq' ? (
          <Collection
            slug="sobre"
            block="faq"
            heading="Perguntas frequentes"
            icon={HELP}
            singular="pergunta"
            editor={Faq}
            hint="Esta é a lista única do site: aparece na home e na página /sobre/, e é lida pelo Google como perguntas e respostas."
          />
        ) : route === '/etapas' ? (
          <Etapas />
        ) : route === '/empresa' ? (
          <Company />
        ) : route === '/pixels' ? (
          <Pixels />
        ) : (
          <Kanban user={user} />
        )}
      </main>
    </div>
  );
}
