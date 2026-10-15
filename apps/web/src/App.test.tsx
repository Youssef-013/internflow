import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('checks the real API contract and announces a successful connection', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
  vi.stubGlobal('fetch', request);
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Vérifier la connexion/ }));
  expect((await screen.findByText('API connectée')).getAttribute('role')).toBe('status');
  expect(request).toHaveBeenCalledWith('/api/health', expect.objectContaining({ signal: expect.anything() }));
});

it.each([
  ['network failure', () => Promise.reject(new Error('offline'))],
  ['HTTP failure', () => Promise.resolve({ ok: false })],
  ['invalid payload', () => Promise.resolve({ ok: true, json: async () => ({ status: 'down' }) })],
])('handles %s with a retryable message', async (_label, response) => {
  vi.stubGlobal('fetch', vi.fn(response));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Vérifier la connexion/ }));
  await screen.findByText(/API indisponible/);
  expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(false);
});
