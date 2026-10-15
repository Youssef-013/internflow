import { useState } from 'react';

type Connection = 'idle' | 'checking' | 'online' | 'offline';
const labels: Record<Connection, string> = {
  idle: 'Connexion à vérifier', checking: 'Vérification en cours…',
  online: 'API connectée', offline: 'API indisponible. Réessayez après son démarrage.',
};

export function App() {
  const [connection, setConnection] = useState<Connection>('idle');
  async function checkConnection() {
    setConnection('checking');
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('API unavailable');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'ok') {
        throw new Error('Unexpected response');
      }
      setConnection('online');
    } catch { setConnection('offline'); }
  }
  return (
    <div className="shell">
      <header><a className="brand" href="/" aria-label="InternFlow, accueil"><span className="brand-mark" aria-hidden="true">if</span>InternFlow<span className="brand-dot">.</span></a><span className="header-note">VOTRE PROCHAIN CHAPITRE</span></header>
      <main>
        <section className="intro" aria-labelledby="welcome-title">
          <p className="eyebrow"><span aria-hidden="true">↗</span> UN PAS VERS LA SUITE</p>
          <h1 id="welcome-title">Votre recherche de stage,<br /><em>organisée.</em></h1>
          <p className="description">Un espace pour garder le fil de vos candidatures et avancer vers votre prochaine opportunité.</p>
          <div className="connection-card">
            <div><p className="card-label">PREMIÈRE ÉTAPE</p><h2>Préparons votre espace.</h2><p>L’authentification et le suivi des candidatures arrivent aux prochains jalons.</p></div>
            <button onClick={checkConnection} disabled={connection === 'checking'}>Vérifier la connexion <span aria-hidden="true">↗</span></button>
            <p role="status" className={`connection ${connection}`}>{labels[connection]}</p>
          </div>
        </section>
        <aside className="journey" aria-label="Fonctionnalités prévues">
          <p className="card-label">À VENIR DANS VOTRE ESPACE</p>
          <ol>
            <li><span className="step">01</span><div><h2>Tout au même endroit</h2><p>Vos candidatures, entreprises et notes.</p></div></li>
            <li><span className="step">02</span><div><h2>Une vue d’ensemble</h2><p>Un dashboard pour suivre votre progression.</p></div></li>
            <li><span className="step">03</span><div><h2>Le prochain mouvement</h2><p>Un Kanban pour visualiser chaque étape.</p></div></li>
          </ol>
          <div className="journey-footer"><span aria-hidden="true">✳</span><p>Chaque candidature ouvre<br />une nouvelle possibilité.</p></div>
        </aside>
      </main>
      <footer><span>InternFlow · En cours de construction</span><span>Moins de dispersion. Plus de perspectives.</span></footer>
    </div>
  );
}
