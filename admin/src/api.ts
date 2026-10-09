export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** O `sid` e HttpOnly: o browser o envia sozinho. Nunca ha JWT aqui. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const csrf = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/)?.[1] ?? '';

  const res = await fetch(API_BASE + path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...init.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `http_${res.status}`);
  return data as T;
}

/**
 * Etapa do funil: o slug gravado em `leads.stage`.
 *
 * Era uma tupla fixa aqui e uma constante PHP do outro lado (routes.php,
 * LEAD_STAGES): mudar o funil custava editar dois arquivos e publicar os dois.
 * Agora as etapas moram na tabela `lead_stages` e chegam por `/api/admin/stages`;
 * o tipo passa a ser a string, porque a lista não é conhecida em tempo de
 * compilação.
 */
export type Stage = string;

export type StageDef = {
  id: string;
  slug: Stage;
  label: string;
  color: string;
  position: number;
  /** `novo`, `ganho` e `perdido`: a entrada do funil e os dois fechamentos. */
  locked: boolean;
};

/**
 * Rótulo e cor de uma etapa, com saída para o caso de o slug não existir mais.
 *
 * A API exige destino ao excluir uma etapa com leads, então o órfão não deveria
 * acontecer — mas um lead que sumisse da tela por causa disso seria invisível e
 * ainda assim cobrado, então ele aparece com o próprio slug e em cinza.
 */
export function stageInfo(stages: StageDef[], slug: Stage): { label: string; color: string } {
  const s = stages.find((x) => x.slug === slug);
  return s ? { label: s.label, color: s.color } : { label: slug || '—', color: '#7f8c8d' };
}

/** Comentário de um lead: o histórico que a ficha não tem. */
export type Comment = {
  id: string;
  user_id: string | null;
  author_name: string;
  body: string;
  edited_at: string | null;
  created_at: string;
};

/** Canais de origem oferecidos no cadastro manual. `site` vem da captação. */
export const CHANNELS = [
  'WhatsApp',
  'Instagram',
  'Indicação',
  'LinkedIn',
  'Site',
  'Evento',
  'Outro',
] as const;

export const DEMANDS = [
  'Projeto novo',
  'Regularização',
  'Apoio em exigência',
  'Consultoria',
  'Outro',
] as const;

export type Lead = {
  id: string;
  name_company: string;
  email: string;
  phone: string;
  channel: string;
  /** Chave do questionário respondido (vazio = formulário genérico). */
  form: string;
  /** Respostas do questionário, nomeadas pelos ids do schema. */
  answers: Record<string, string> | null;
  enterprise: string;
  demand: string;
  city: string;
  notes: string;
  stage: Stage;
  deadline: string | null;
  next_action: string;
  estimated_value: string | null;
  created_at: string;
  updated_at: string;
};

export type User = { id: string; email: string; name: string; role: string };

export type Page = {
  slug: string;
  title: string;
  /** Forma livre: cada pagina tem os seus blocos (texto, objeto ou lista de itens). */
  blocks: Record<string, unknown>;
  meta: Record<string, string>;
  updated_at: string;
};
