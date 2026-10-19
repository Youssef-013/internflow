import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import type { Application, ApplicationInput, Session } from './api';

const item: Application = { id: 'app-a', company: 'Acme', position: 'Stage backend', status: 'APPLIED', appliedAt: '2026-10-17T12:30:00.000Z', deadline: '2026-11-01T10:00:00.000Z', notes: 'Notes privées', createdAt: '2026-10-17T10:00:00.000Z', updatedAt: '2026-10-17T10:00:00.000Z' };
const session: Session & { tokenType: string } = { accessToken: 'session-token-a', tokenType: 'Bearer', expiresIn: 900, user: { id: 'user-a', email: 'candidate@example.com', createdAt: '2026-10-17T10:00:00.000Z' } };
const password = 'Correct password 123!';
const json = (value: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
type Reply = ReturnType<typeof json>;
type Override = (path: string, options: RequestInit) => Reply | Promise<Reply> | undefined;
function server(initial: Application[] = []) {
  const state: { items: Application[]; override?: Override } = { items: [...initial] };
  let sequence = 0;
  const request = vi.fn(async (path: string, options: RequestInit = {}): Promise<Reply> => {
    const overridden = state.override?.(path, options); if (overridden !== undefined) return overridden;
    const url = new URL(path, 'http://localhost');
    const method = options.method ?? 'GET';
    if (url.pathname.startsWith('/api/auth/')) return json(session, url.pathname.endsWith('register') ? 201 : 200);
    if (url.pathname === '/api/health') return json({ status: 'ok' });
    if (url.pathname === '/api/applications' && method === 'GET') {
      const page = Number(url.searchParams.get('page') ?? 1), status = url.searchParams.get('status');
      const items = state.items.filter(value => !status || value.status === status);
      return json({ items: items.slice((page - 1) * 20, page * 20), total: items.length, page, pageSize: 20 });
    }
    if (url.pathname === '/api/applications' && method === 'POST') {
      const created = { ...item, ...JSON.parse(String(options.body)) as ApplicationInput, id: `new-${++sequence}` };
      state.items.unshift(created); return json(created, 201);
    }
    const id = decodeURIComponent(url.pathname.split('/').pop()!);
    const found = state.items.find(value => value.id === id);
    if (!found) return json({}, 404);
    if (method === 'GET') return json(found);
    if (method === 'PATCH') { Object.assign(found, JSON.parse(String(options.body))); return json(found); }
    if (method === 'DELETE') { state.items = state.items.filter(value => value.id !== id); return json(undefined, 204); }
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  vi.stubGlobal('fetch', request);
  return { state, request };
}
async function login(mode: 'login' | 'register' = 'login', email = session.user.email, waitForList = true) {
  if (mode === 'register') fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: mode === 'login' ? 'Se connecter' : 'Créer mon compte' }));
  await screen.findByRole('heading', { name: /Mes candidatures/ });
  if (waitForList) await waitFor(() => expect(screen.queryByText('Chargement des candidatures…')).toBeNull());
}
const calls = (request: ReturnType<typeof server>['request'], method: string) => request.mock.calls.filter(([path, options]) => path.startsWith('/api/applications') && options?.method === method);
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['login', 'register'] as const)('%s normalizes email, uses the JWT and keeps it out of browser storage', async mode => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const backend = server(); render(<App />);
  await login(mode, ' Candidate@Example.COM ');
  const auth = backend.request.mock.calls.find(([path]) => path === `/api/auth/${mode}`)!;
  expect(JSON.parse(String(auth[1]?.body))).toEqual({ email: session.user.email, password });
  expect(screen.getByText('Votre prochaine opportunité commence ici.')).toBeTruthy();
  const list = calls(backend.request, 'GET')[0];
  expect(list[1]?.headers).toEqual({ Authorization: 'Bearer session-token-a' });
  expect(list[1]?.credentials).toBe('omit');
  expect(storage).not.toHaveBeenCalled();
});

it('validates credentials before sending them and shows a generic login error', async () => {
  const backend = server(); backend.state.override = path => path.includes('/auth/') ? json({}, 401) : undefined;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  expect(screen.getByRole('alert').textContent).toContain('adresse email valide');
  expect(backend.request).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: session.user.email } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Email ou mot de passe incorrect');
  expect(screen.queryByRole('heading', { name: /Mes candidatures/ })).toBeNull();
});

it('paginates and resets pagination when filtering by status', async () => {
  const records = Array.from({ length: 21 }, (_, index) => ({ ...item, id: `item-${index}`, company: `Entreprise ${index}`, status: index === 20 ? 'INTERVIEW' as const : 'APPLIED' as const }));
  const backend = server(records); render(<App />); await login();
  fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
  await screen.findByText('Entreprise 20');
  expect(screen.getByText('Page 2 sur 2')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'INTERVIEW' } });
  await screen.findByText('Page 1 sur 1');
  expect(screen.getByText('Entreprise 20')).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Suivant' }).disabled).toBe(true);
  expect(calls(backend.request, 'GET').at(-1)?.[0]).toContain('page=1&pageSize=20&status=INTERVIEW');
});

it('validates a new application, prevents duplicate submission and refreshes the list', async () => {
  const backend = server(); let finish!: (value: Reply) => void;
  backend.state.override = (path, options) => path === '/api/applications' && options.method === 'POST' ? new Promise<Reply>(resolve => { finish = resolve; }) : undefined;
  render(<App />); await login();
  fireEvent.click(screen.getByRole('button', { name: '+ Nouvelle candidature' }));
  const button = screen.getByRole('button', { name: 'Enregistrer la candidature' });
  const form = button.closest('form')!;
  fireEvent.submit(form);
  expect(screen.getByText(/Indiquez une entreprise/)).toBeTruthy();
  expect(calls(backend.request, 'POST')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(/Entreprise/), { target: { value: ' Nouvelle société ' } });
  fireEvent.change(screen.getByLabelText(/Poste/), { target: { value: ' Stage React ' } });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(calls(backend.request, 'POST')).toHaveLength(1);
  const body = JSON.parse(String(calls(backend.request, 'POST')[0][1]?.body));
  expect(body).toEqual({ company: 'Nouvelle société', position: 'Stage React', status: 'DRAFT', appliedAt: null, deadline: null, notes: null });
  backend.state.items = [{ ...item, ...body, id: 'created' }];
  await act(async () => { finish(json(backend.state.items[0], 201)); });
  await screen.findByText('Nouvelle société');
  expect(screen.getByText('Candidature ajoutée.')).toBeTruthy();
});

it('preserves unchanged timestamps, clears notes and retains input after a save error', async () => {
  const backend = server([{ ...item }]); let fail = true;
  backend.state.override = (_path, options) => options.method === 'PATCH' && fail ? json({}, 503) : undefined;
  render(<App />); await login();
  fireEvent.click(screen.getByRole('button', { name: 'Modifier Acme' }));
  fireEvent.change(screen.getByLabelText(/Poste/), { target: { value: 'Stage frontend' } });
  fireEvent.change(screen.getByLabelText('Notes'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
  await screen.findByText('Le service est temporairement indisponible.');
  expect(screen.getByDisplayValue('Stage frontend')).toBeTruthy();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
  await screen.findByText('Candidature modifiée.');
  await screen.findByText('Stage frontend');
  expect(JSON.parse(String(calls(backend.request, 'PATCH').at(-1)?.[1]?.body))).toMatchObject({ appliedAt: item.appliedAt, deadline: item.deadline, notes: null });
});

it('fetches full details, renders notes as text and handles a disappeared record', async () => {
  const backend = server([{ ...item, notes: '<script>alert(1)</script>' }]); render(<App />); await login();
  fireEvent.click(screen.getByRole('button', { name: 'Consulter Acme' }));
  await screen.findByText('<script>alert(1)</script>');
  expect(document.querySelector('.notes-content script')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
  backend.state.override = path => path === '/api/applications/app-a' ? json({}, 404) : undefined;
  fireEvent.click(screen.getByRole('button', { name: 'Consulter Acme' }));
  await screen.findByText('Cette candidature n’est plus disponible.');
  expect(screen.getByRole('button', { name: 'Fermer' })).toBeTruthy();
});

it('requires deletion confirmation, supports cancel and retry, and refreshes after success', async () => {
  const backend = server([{ ...item }]); render(<App />); await login();
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer Acme' }));
  expect(calls(backend.request, 'DELETE')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Annuler la suppression' }));
  expect(calls(backend.request, 'DELETE')).toHaveLength(0);
  backend.state.override = (_path, options) => options.method === 'DELETE' ? json({}, 503) : undefined;
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer Acme' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
  await screen.findByText('Le service est temporairement indisponible.');
  backend.state.override = undefined;
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
  await screen.findByText('Candidature supprimée.');
  await screen.findByText('Votre prochaine opportunité commence ici.');
  expect(screen.queryByText('Acme')).toBeNull();
});

it('retries a failed list request and clears private data on a protected 401', async () => {
  const backend = server([{ ...item }]); let failure = 503;
  backend.state.override = path => path.startsWith('/api/applications?') && failure ? json({}, failure) : undefined;
  render(<App />); await login();
  await screen.findByText('Le service est temporairement indisponible.');
  failure = 0; fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  await screen.findByText('Acme');
  failure = 401;
  fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'APPLIED' } });
  await screen.findByText('Votre session a expiré. Reconnectez-vous.');
  expect(screen.queryByText('Acme')).toBeNull();
  expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy();
});

it('aborts an old account request on logout and ignores its late response after another login', async () => {
  const backend = server(); let finish!: (value: Reply) => void; let oldSignal: AbortSignal | undefined;
  backend.state.override = (path, options) => {
    if (path.includes('/auth/') && String(options.body).includes('other@example.com')) return json({ ...session, accessToken: 'session-token-b', user: { ...session.user, id: 'user-b', email: 'other@example.com' } });
    if (path.startsWith('/api/applications?')) {
      if ((options.headers as Record<string, string>).Authorization.endsWith('token-a')) { oldSignal = options.signal as AbortSignal; return new Promise<Reply>(resolve => { finish = resolve; }); }
      return json({ items: [{ ...item, id: 'app-b', company: 'Beta' }], total: 1, page: 1, pageSize: 20 });
    }
    return undefined;
  };
  render(<App />); await login('login', session.user.email, false);
  await waitFor(() => expect(oldSignal).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
  expect(oldSignal?.aborted).toBe(true);
  await login('login', 'other@example.com'); await screen.findByText('Beta');
  await act(async () => { finish(json({ items: [item], total: 1, page: 1, pageSize: 20 })); });
  expect(screen.queryByText('Acme')).toBeNull();
  expect(screen.getByText('Beta')).toBeTruthy();
});

it('expires the session automatically and removes private content', async () => {
  vi.useFakeTimers(); const backend = server([{ ...item }]);
  backend.state.override = path => path.includes('/auth/') ? json({ ...session, expiresIn: 1 }) : undefined;
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: session.user.email } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Se connecter' })); });
  expect(screen.getByText('Acme')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
  expect(screen.queryByText('Acme')).toBeNull();
  expect(screen.getByText('Votre session a expiré. Reconnectez-vous.')).toBeTruthy();
});

it('rejects a malformed authentication response instead of opening a private workspace', async () => {
  const backend = server(); backend.state.override = path => path.includes('/auth/') ? json({ accessToken: 'x', user: null }) : undefined;
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: session.user.email } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  await screen.findByText('Réponse du serveur invalide. Réessayez.');
  expect(calls(backend.request, 'GET')).toHaveLength(0);
});

it('ignores a late filter response and keeps the newest filter result', async () => {
  const backend = server([{ ...item }]); let finish!: (value: Reply) => void;
  backend.state.override = path => path.includes('status=OFFER') ? new Promise<Reply>(resolve => { finish = resolve; }) : undefined;
  render(<App />); await login();
  fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'OFFER' } });
  await waitFor(() => expect(finish).toBeTruthy());
  fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'APPLIED' } });
  await screen.findByText('Acme');
  await act(async () => { finish(json({ items: [{ ...item, company: 'Stale result', status: 'OFFER' }], total: 1, page: 1, pageSize: 20 })); });
  expect(screen.queryByText('Stale result')).toBeNull();
  expect(within(screen.getByRole('table')).getByText('Acme')).toBeTruthy();
});

it('switches between list and Kanban and reloads persisted status when returning to the list', async () => {
  server([item]); render(<App />); await login();
  fireEvent.click(screen.getByRole('button', { name: 'Dashboard et Kanban' }));
  const source = await screen.findByRole('region', { name: 'Colonne Envoyée' });
  expect(within(source).getByText('Acme')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Statut de Acme'), { target: { value: 'INTERVIEW' } });
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Colonne Entretien' })).getByText('Acme')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Liste' }));
  const row = await screen.findByRole('row', { name: /Acme/ });
  expect(within(row).getByText('Entretien')).toBeTruthy();
});
