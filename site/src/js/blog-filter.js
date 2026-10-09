/* Filtro do índice do blog: uma única caixa de busca.
   Texto comum procura em título e resumo; `#` sozinho abre o menu suspenso de
   hashtags ancorado no campo, e o que se digita depois do `#` filtra o menu. */
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Traduz o que está no campo em um critério de filtro.
 * `#algo` filtra por hashtag (prefixo, então `#reg` já recorta); o resto é busca textual.
 */
export const parseQuery = (value) => {
  const v = value.trim();
  return v.startsWith('#') ? { tag: v.slice(1), text: '' } : { tag: '', text: v };
};

/**
 * Predicado puro do filtro: exportado para o `npm run check` exercitá-lo.
 *
 * `entry.tag` pode trazer várias categorias separadas por vírgula. O recorte
 * casa se *qualquer* uma começar com o que foi digitado — testar a linha inteira
 * esconderia todo artigo cuja segunda categoria é a procurada.
 */
export const matches = (entry, { text, tag }) =>
  (!text || norm(entry.text).includes(norm(text))) &&
  (!tag ||
    String(entry.tag ?? '')
      .split(',')
      .some((t) => norm(t.trim()).startsWith(norm(tag))));

/**
 * Recorta `text` em [antes, trecho, depois] na primeira ocorrência de `query`,
 * ignorando caixa e acento. `null` quando não há o que realçar.
 *
 * O índice vem do texto normalizado, então só serve se a normalização preservar
 * o comprimento — vale para os acentos do português, não para todo Unicode.
 */
export const splitMatch = (text, query) => {
  if (!query || norm(text).length !== text.length) return null;
  const i = norm(text).indexOf(norm(query));
  return i < 0 ? null : [text.slice(0, i), text.slice(i, i + query.length), text.slice(i + query.length)];
};

/**
 * Valor do campo correspondente a um `location.hash`.
 * Os links de hashtag dos artigos apontam para `/blog/#tag=Algo`, entao a pagina
 * precisa entrar ja filtrada — e voltar ao estado neutro quando o hash sai.
 */
export const queryFromHash = (hash) => {
  const tag = new URLSearchParams(hash.replace(/^#/, '')).get('tag');
  return tag ? `#${tag}` : '';
};

export function initBlogFilter() {
  const archive = document.querySelector('.archive');
  const filters = document.querySelector('.archive__filters');
  if (!archive || !filters) return;

  const input = filters.querySelector('input');
  const count = filters.querySelector('.archive__count');
  const empty = document.querySelector('.archive__empty');
  const entries = [...archive.querySelectorAll('.entry')];
  const months = [...archive.querySelectorAll('.archive__month')];

  // Sem JavaScript nada disso filtra; por isso a barra só aparece agora.
  filters.hidden = false;
  filters.querySelector('form').addEventListener('submit', (e) => e.preventDefault());

  // O texto original precisa sobreviver aos realces sucessivos.
  for (const el of entries) {
    el.dataset.text = el.textContent;
    for (const node of el.querySelectorAll('.entry__title a, .entry__excerpt')) {
      node.dataset.raw = node.textContent;
    }
  }

  /* Realce da ocorrência: reescreve só os nós de texto, senão o innerHTML
     destruiria o link do título a cada tecla digitada. */
  const highlight = (el, query) => {
    for (const node of el.querySelectorAll('[data-raw]')) {
      const text = node.dataset.raw;
      const cut = splitMatch(text, query);
      node.textContent = '';
      if (!cut) {
        node.textContent = text;
        continue;
      }
      const mark = document.createElement('mark');
      mark.textContent = cut[1];
      node.append(cut[0], mark, cut[2]);
    }
  };

  const apply = () => {
    const q = parseQuery(input.value);
    let visible = 0;

    for (const el of entries) {
      const hit = matches({ text: el.dataset.text, tag: el.dataset.tag }, q);
      el.hidden = !hit;
      if (hit) {
        visible++;
        highlight(el, q.text);
      }
    }
    for (const m of months) {
      m.hidden = ![...m.querySelectorAll('.entry')].some((e) => !e.hidden);
    }

    empty.hidden = visible > 0;
    count.textContent = `${visible} ${visible === 1 ? 'artigo' : 'artigos'}${q.tag ? ` em #${q.tag}` : ''}`;
  };

  const setValue = (value) => {
    input.value = value;
    apply();
  };

  input.addEventListener('input', apply);

  /* Menu suspenso de hashtags: abre com `#` sozinho no campo e filtra pelo que
     vem depois dele. Combobox na unha porque nenhum elemento nativo ancora uma
     lista assim — o <datalist> não é estilizável e o <dialog> vira modal. */
  const menu = document.getElementById('tagmenu');
  if (menu) {
    const options = [...menu.querySelectorAll('[role="option"]')];
    const none = menu.querySelector('.tagmenu__empty');
    let active = -1;

    const shown = () => options.filter((o) => !o.hidden);

    const setActive = (i) => {
      const list = shown();
      active = list.length ? (i + list.length) % list.length : -1;
      for (const o of options) o.setAttribute('aria-selected', 'false');
      const el = list[active];
      el?.setAttribute('aria-selected', 'true');
      el?.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', el?.id ?? '');
    };

    const close = () => {
      menu.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };

    /* Só abre com `#`; o texto após ele filtra as opções. */
    const sync = () => {
      const q = parseQuery(input.value);
      if (!input.value.trim().startsWith('#')) return close();

      let visible = 0;
      for (const o of options) {
        const hit = !q.tag || norm(o.dataset.tag).includes(norm(q.tag));
        o.hidden = !hit;
        if (hit) visible++;
      }
      none.hidden = visible > 0;
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      setActive(0);
    };

    const pick = (tag) => {
      close();
      history.pushState('', '', `#tag=${encodeURIComponent(tag)}`);
      setValue(`#${tag}`);
    };

    input.addEventListener('input', sync);
    input.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      const list = shown();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter' && list[active]) {
        e.preventDefault();
        pick(list[active].dataset.tag);
      } else if (e.key === 'Escape') {
        close();
      }
    });

    menu.addEventListener('mousedown', (e) => {
      const li = e.target.closest('[role="option"]');
      if (li) {
        e.preventDefault(); // evita o blur antes do clique registrar
        pick(li.dataset.tag);
      }
    });

    document.addEventListener('click', (e) => {
      if (!menu.hidden && !e.target.closest('.archive__search')) close();
    });
  }

  document.querySelector('.archive__empty .archive__clear')?.addEventListener('click', () => {
    history.pushState('', '', location.pathname);
    setValue('');
  });

  const fromHash = () => {
    input.value = queryFromHash(location.hash);
  };

  // `pushState` nao dispara `hashchange`; o clique num `#tag=` e o botao voltar, sim.
  addEventListener('hashchange', () => {
    fromHash();
    apply();
  });

  fromHash();
  apply();
}
