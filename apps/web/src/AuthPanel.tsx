import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError, errorMessage, isAborted } from './api';
import type { Session } from './api';

export function AuthPanel({ onSession }: { onSession: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) { setError('Renseignez une adresse email valide.'); return; }
    if (password.length < 12 || password.length > 128) { setError('Le mot de passe doit contenir entre 12 et 128 caractères.'); return; }
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError('');
    try {
      const session = await api.authenticate(mode, normalized, password, controller.signal);
      if (!controller.signal.aborted) { setPassword(''); onSession(session); }
    } catch (failure: unknown) {
      if (!isAborted(failure)) setError(failure instanceof ApiError && failure.status === 401 ? 'Email ou mot de passe incorrect.' : errorMessage(failure));
    } finally { pending.current = null; setBusy(false); }
  }
  return <aside className="auth-panel" aria-labelledby="auth-title">
    <p className="card-label">VOTRE ESPACE PERSONNEL</p>
    <h2 id="auth-title">{mode === 'login' ? 'Heureux de vous retrouver.' : 'Votre prochain départ.'}</h2>
    <p className="muted">{mode === 'login' ? 'Connectez-vous pour retrouver vos candidatures.' : 'Créez votre compte et gardez le fil de vos démarches.'}</p>
    <div className="auth-switch" aria-label="Choisir un accès">
      <button className={mode === 'login' ? 'selected' : ''} aria-pressed={mode === 'login'} disabled={busy} onClick={() => { setMode('login'); setError(''); setPassword(''); }}>Connexion</button>
      <button className={mode === 'register' ? 'selected' : ''} aria-pressed={mode === 'register'} disabled={busy} onClick={() => { setMode('register'); setError(''); setPassword(''); }}>Créer un compte</button>
    </div>
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <label htmlFor="auth-email">Email</label>
      <input id="auth-email" type="email" autoComplete="email" value={email} maxLength={254} required disabled={busy} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="auth-password">Mot de passe</label>
      <input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} minLength={12} maxLength={128} required disabled={busy} aria-describedby="password-hint" onChange={event => setPassword(event.target.value)} />
      <p className="field-hint" id="password-hint">Entre 12 et 128 caractères. Les espaces comptent.</p>
      {error && <p role="alert" className="error-message">{error}</p>}
      <button className="wide-button" type="submit" disabled={busy}>{busy ? 'Connexion en cours…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
    </form>
    <p className="field-hint session-note">Session temporaire : reconnectez-vous après un rechargement de la page.</p>
  </aside>;
}
