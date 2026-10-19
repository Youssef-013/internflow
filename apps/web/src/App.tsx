import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Session } from './api';
import { AuthPanel } from './AuthPanel';
import { ApplicationsView } from './ApplicationsView';

type Connection = 'idle' | 'checking' | 'online' | 'offline';
const labels: Record<Connection, string> = {
  idle: 'Connexion à vérifier', checking: 'Vérification en cours…',
  online: 'API connectée', offline: 'API indisponible. Réessayez après son démarrage.',
};

export function App() {
  const [connection, setConnection] = useState<Connection>('idle');
  const [session, setSession] = useState<(Session & { expiresAt: number }) | null>(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const expired = useCallback(() => { setSession(null); setSessionMessage('Votre session a expiré. Reconnectez-vous.'); }, []);
  const acceptSession = useCallback((value: Session) => { setSessionMessage(''); setSession({ ...value, expiresAt: Date.now() + value.expiresIn * 1000 }); }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(expired, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, expired]);
  async function checkConnection() {
    setConnection('checking');
    try {
      await api.health();
      setConnection('online');
    } catch { setConnection('offline'); }
  }
  return (
    <div className="shell">
      <header><a className="brand" href="/" aria-label="InternFlow, accueil"><span className="brand-mark" aria-hidden="true">if</span>InternFlow<span className="brand-dot">.</span></a>{session ? <div className="account-menu"><span title={session.user.email}>{session.user.email}</span><button className="secondary" onClick={() => { setSession(null); setSessionMessage('Vous êtes déconnecté.'); }}>Se déconnecter</button></div> : <span className="header-note">VOTRE PROCHAIN CHAPITRE</span>}</header>
      {session ? <main className="workspace"><ApplicationsView key={session.accessToken} token={session.accessToken} onExpired={expired} /></main> : <main className="welcome">
        <section className="intro" aria-labelledby="welcome-title">
          <p className="eyebrow"><span aria-hidden="true">↗</span> UN PAS VERS LA SUITE</p>
          <h1 id="welcome-title">Votre recherche de stage,<br /><em>organisée.</em></h1>
          <p className="description">Un espace pour garder le fil de vos candidatures et avancer vers votre prochaine opportunité.</p>
          <div className="connection-card">
            <div><p className="card-label">UN SUIVI PLUS SIMPLE</p><h2>Tout commence par une candidature.</h2><p>Retrouvez vos entreprises, vos démarches et vos notes dans votre espace personnel.</p></div>
            <button onClick={checkConnection} disabled={connection === 'checking'}>Vérifier la connexion <span aria-hidden="true">↗</span></button>
            <p role="status" className={`connection ${connection}`}>{labels[connection]}</p>
          </div>
        </section>
        <div>{sessionMessage && <p role="alert" className="session-message">{sessionMessage}</p>}<AuthPanel onSession={acceptSession} /></div>
      </main>}
      <footer><span>InternFlow · En cours de construction</span><span>Moins de dispersion. Plus de perspectives.</span></footer>
    </div>
  );
}
