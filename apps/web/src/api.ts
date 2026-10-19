export const STATUSES = ['DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'] as const;
export type ApplicationStatus = typeof STATUSES[number];
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Brouillon', APPLIED: 'Envoyée', INTERVIEW: 'Entretien', OFFER: 'Offre reçue', REJECTED: 'Refusée',
};
export interface Application {
  id: string; company: string; position: string; status: ApplicationStatus;
  appliedAt: string | null; deadline: string | null; notes: string | null;
  createdAt: string; updatedAt: string;
}
export interface ApplicationInput {
  company: string; position: string; status: ApplicationStatus;
  appliedAt: string | null; deadline: string | null; notes: string | null;
}
export interface ApplicationPage { items: Application[]; total: number; page: number; pageSize: number; }
export interface Session {
  accessToken: string; expiresIn: number;
  user: { id: string; email: string; createdAt: string };
}
export class ApiError extends Error {
  constructor(message: string, public readonly status = 0) { super(message); this.name = 'ApiError'; }
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';
const text = (value: unknown): value is string => typeof value === 'string';
const date = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || date(value);
const invalid = () => new ApiError('Réponse du serveur invalide. Réessayez.');
function application(value: unknown): Application {
  if (!object(value) || !text(value.id) || !value.id || !text(value.company) || !text(value.position) ||
      !STATUSES.includes(value.status as ApplicationStatus) || !nullableDate(value.appliedAt) ||
      !nullableDate(value.deadline) || !(value.notes === null || text(value.notes)) ||
      !date(value.createdAt) || !date(value.updatedAt)) throw invalid();
  return value as unknown as Application;
}
function page(value: unknown): ApplicationPage {
  if (!object(value) || !Array.isArray(value.items) || !Number.isSafeInteger(value.total) || Number(value.total) < 0 ||
      !Number.isSafeInteger(value.page) || Number(value.page) < 1 || !Number.isSafeInteger(value.pageSize) ||
      Number(value.pageSize) < 1 || Number(value.pageSize) > 100 || value.items.length > Number(value.pageSize)) throw invalid();
  return { items: value.items.map(application), total: Number(value.total), page: Number(value.page), pageSize: Number(value.pageSize) };
}
function session(value: unknown): Session {
  if (!object(value) || !text(value.accessToken) || !value.accessToken || value.accessToken.length > 4096 ||
      value.tokenType !== 'Bearer' || !Number.isInteger(value.expiresIn) || Number(value.expiresIn) < 1 || Number(value.expiresIn) > 900 ||
      !object(value.user) || !text(value.user.id) || !value.user.id || !text(value.user.email) || !date(value.user.createdAt)) throw invalid();
  return { accessToken: value.accessToken, expiresIn: Number(value.expiresIn), user: { id: value.user.id, email: value.user.email, createdAt: value.user.createdAt } };
}
const messages: Record<number, string> = {
  400: 'Vérifiez les champs renseignés.', 401: 'Votre session a expiré. Reconnectez-vous.',
  404: 'Cette candidature n’est plus disponible.', 409: 'Cet email est déjà utilisé.',
  429: 'Trop de tentatives. Réessayez dans une minute.', 503: 'Le service est temporairement indisponible.',
};
interface Options { method?: string; body?: unknown; token?: string; signal?: AbortSignal; }
async function request<T>(path: string, options: Options, parse: (value: unknown) => T): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort(); else options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 10000);
  try {
    const response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET', cache: 'no-store', credentials: 'omit', signal: controller.signal,
      headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) throw new ApiError(messages[response.status] ?? 'Une erreur du serveur est survenue. Réessayez.', response.status);
    if (response.status === 204) return parse(undefined);
    let value: unknown;
    try { value = await response.json(); } catch { throw invalid(); }
    return parse(value);
  } catch (error: unknown) {
    if (options.signal?.aborted) throw new DOMException('Requête annulée', 'AbortError');
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'La requête a expiré. Réessayez.' : 'Impossible de joindre le serveur. Vérifiez la connexion puis réessayez.');
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}
export const api = {
  health: () => request('/health', {}, value => { if (!object(value) || value.status !== 'ok') throw invalid(); return true; }),
  authenticate: (mode: 'login' | 'register', email: string, password: string, signal: AbortSignal) => request(`/auth/${mode}`, { method: 'POST', body: { email, password }, signal }, session),
  list: (token: string, status: ApplicationStatus | '', pageNumber: number, signal: AbortSignal) => {
    const query = new URLSearchParams({ page: String(pageNumber), pageSize: '20' });
    if (status) query.set('status', status);
    return request(`/applications?${query}`, { token, signal }, page);
  },
  get: (token: string, id: string, signal: AbortSignal) => request(`/applications/${encodeURIComponent(id)}`, { token, signal }, application),
  move: (token: string, id: string, status: ApplicationStatus, signal: AbortSignal) => request(`/applications/${encodeURIComponent(id)}`, { token, signal, method: 'PATCH', body: { status } }, application),
  save: (token: string, input: ApplicationInput, signal: AbortSignal, id?: string) => request(id ? `/applications/${encodeURIComponent(id)}` : '/applications', { token, signal, method: id ? 'PATCH' : 'POST', body: input }, application),
  remove: (token: string, id: string, signal: AbortSignal) => request(`/applications/${encodeURIComponent(id)}`, { token, signal, method: 'DELETE' }, value => { if (value !== undefined) throw invalid(); }),
};
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez.'; }
export function isAborted(error: unknown): boolean { return error instanceof Error && error.name === 'AbortError'; }
export function displayDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '—';
}
