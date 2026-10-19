import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProgressBoard } from './ProgressBoard';
import type { Application } from './api';
const item: Application = { id: 'app-a', company: 'Acme', position: 'Stage React', status: 'APPLIED', appliedAt: null, deadline: null, notes: 'Private', createdAt: '2026-10-19T10:00:00Z', updatedAt: '2026-10-19T10:00:00Z' };
const json = (value: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
type Reply = ReturnType<typeof json>;
function server(initial: Application[] = [item]) {
  const state: { items: Application[]; override?: (path: string, options: RequestInit) => Reply | Promise<Reply> | undefined } = { items: initial.map(value => ({ ...value })) };
  const request = vi.fn(async (path: string, options: RequestInit): Promise<Reply> => {
    const overridden = state.override?.(path, options); if (overridden !== undefined) return overridden;
    const url = new URL(path, 'http://localhost');
    if (options.method === 'PATCH') {
      const found = state.items.find(value => value.id === url.pathname.split('/').pop());
      if (!found) return json({}, 404);
      Object.assign(found, JSON.parse(String(options.body))); return json(found);
    }
    const page = Number(url.searchParams.get('page')), status = url.searchParams.get('status');
    const rows = state.items.filter(value => value.status === status);
    return json({ items: rows.slice((page - 1) * 20, page * 20), total: rows.length, page, pageSize: 20 });
  });
  vi.stubGlobal('fetch', request); return { state, request };
}
const column = (name: string) => screen.getByRole('region', { name: `Colonne ${name}` });
async function ready() { await waitFor(() => expect(screen.queryByText('Chargement du suivi…')).toBeNull()); }
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('counts every page, scopes all five requests and loads the rest of a column without duplicates', async () => {
  const backend = server(Array.from({ length: 21 }, (_, index) => ({ ...item, id: `a-${index}`, company: `Company ${index}` })));
  render(<ProgressBoard token="token-a" onExpired={vi.fn()} />); await ready();
  expect(within(screen.getByLabelText('Statistiques des candidatures')).getAllByText('21')).toHaveLength(2);
  expect(within(column('Envoyée')).getAllByRole('article')).toHaveLength(20);
  expect(backend.request.mock.calls).toHaveLength(5);
  for (const [, options] of backend.request.mock.calls) expect(options.headers).toEqual({ Authorization: 'Bearer token-a' });
  fireEvent.click(screen.getByRole('button', { name: 'Charger plus — Envoyée' }));
  await within(column('Envoyée')).findByText('Company 20');
  expect(within(column('Envoyée')).getAllByRole('article')).toHaveLength(21);
  expect(screen.queryByRole('button', { name: 'Charger plus — Envoyée' })).toBeNull();
});

it('patches only status, updates totals and preserves the move after remount', async () => {
  const backend = server(); const expired = vi.fn();
  const ui = render(<ProgressBoard token="token-a" onExpired={expired} />); await ready();
  fireEvent.change(screen.getByLabelText('Statut de Acme'), { target: { value: 'INTERVIEW' } });
  await waitFor(() => expect(within(column('Entretien')).getByText('Acme')).toBeTruthy());
  expect(within(column('Envoyée')).queryByText('Acme')).toBeNull();
  const patches = backend.request.mock.calls.filter(([, options]) => options.method === 'PATCH');
  expect(patches).toHaveLength(1); expect(JSON.parse(String(patches[0][1].body))).toEqual({ status: 'INTERVIEW' });
  expect(backend.state.items[0].notes).toBe('Private');
  ui.unmount(); render(<ProgressBoard token="token-a" onExpired={expired} />); await ready();
  expect(within(column('Entretien')).getByText('Acme')).toBeTruthy();
});

it('keeps a failed move in its original column, prevents duplicate writes and allows a retry', async () => {
  const backend = server(); let release!: (reply: Reply) => void;
  backend.state.override = (_path, options) => options.method === 'PATCH' ? new Promise(resolve => { release = resolve; }) : undefined;
  render(<ProgressBoard token="token-a" onExpired={vi.fn()} />); await ready();
  const select = screen.getByLabelText('Statut de Acme');
  fireEvent.change(select, { target: { value: 'OFFER' } }); fireEvent.change(select, { target: { value: 'REJECTED' } });
  expect(backend.request.mock.calls.filter(([, options]) => options.method === 'PATCH')).toHaveLength(1);
  await act(async () => release(json({}, 503)));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Statut de Acme') as HTMLSelectElement).value).toBe('APPLIED');
  expect(within(column('Envoyée')).getByText('Acme')).toBeTruthy();
  backend.state.override = undefined;
  fireEvent.change(screen.getByLabelText('Statut de Acme'), { target: { value: 'OFFER' } });
  await waitFor(() => expect(within(column('Offre reçue')).getByText('Acme')).toBeTruthy());
});

it('shows retryable loading errors and rejects a malformed response', async () => {
  const backend = server(); backend.state.override = () => json({ broken: true });
  render(<ProgressBoard token="token-a" onExpired={vi.fn()} />); await ready();
  expect(screen.getByRole('alert').textContent).toContain('invalide');
  expect(screen.queryByLabelText('Statistiques des candidatures')).toBeNull();
  backend.state.override = undefined; fireEvent.click(screen.getByRole('button', { name: 'Réessayer le suivi' }));
  await waitFor(() => expect(within(column('Envoyée')).getByText('Acme')).toBeTruthy());
});

it.each(['load', 'move'] as const)('expires the private session after a 401 during %s', async mode => {
  const backend = server(), expired = vi.fn();
  if (mode === 'load') backend.state.override = () => json({}, 401);
  render(<ProgressBoard token="token-a" onExpired={expired} />);
  if (mode === 'move') { await ready(); backend.state.override = () => json({}, 401); fireEvent.change(screen.getByLabelText('Statut de Acme'), { target: { value: 'DRAFT' } }); }
  await waitFor(() => expect(expired).toHaveBeenCalled());
});

it('aborts pending requests on unmount and never replaces the next account with an old response', async () => {
  const backend = server(); let release!: (reply: Reply) => void;
  backend.state.override = (path, options) => {
    if ((options.headers as Record<string, string>).Authorization === 'Bearer token-a' && path.includes('status=APPLIED')) return new Promise(resolve => { release = resolve; });
    return undefined;
  };
  const expired = vi.fn(), ui = render(<ProgressBoard token="token-a" onExpired={expired} />);
  await waitFor(() => expect(release).toBeTypeOf('function'));
  const pendingSignal = backend.request.mock.calls.find(([path]) => path.includes('status=APPLIED'))![1].signal!;
  ui.unmount(); backend.state.items = [];
  render(<ProgressBoard token="token-b" onExpired={expired} />); await ready();
  await act(async () => release(json({ items: [item], total: 1, page: 1, pageSize: 20 })));
  expect(pendingSignal.aborted).toBe(true);
  expect(screen.queryByText('Acme')).toBeNull(); expect(expired).not.toHaveBeenCalled();
});
