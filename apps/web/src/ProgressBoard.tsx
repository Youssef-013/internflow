import { useEffect, useRef, useState } from 'react';
import { api, ApiError, displayDate, errorMessage, STATUSES, STATUS_LABELS } from './api';
import type { Application, ApplicationPage, ApplicationStatus } from './api';

type Columns = Record<ApplicationStatus, ApplicationPage>;
export function ProgressBoard({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [columns, setColumns] = useState<Columns | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setColumns(null); setError('');
    Promise.all(STATUSES.map(async status => [status, await api.list(token, status, 1, controller.signal)] as const))
      .then(entries => { if (!controller.signal.aborted) setColumns(Object.fromEntries(entries) as Columns); })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (failure instanceof ApiError && failure.status === 401) onExpired(); else setError(errorMessage(failure));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision, onExpired]);

  async function action(run: (signal: AbortSignal) => Promise<void>) {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError(''); setNotice('');
    try { await run(controller.signal); }
    catch (failure: unknown) {
      if (!controller.signal.aborted) {
        if (failure instanceof ApiError && failure.status === 401) onExpired(); else setError(errorMessage(failure));
      }
    } finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  function move(item: Application, status: ApplicationStatus) {
    if (status === item.status) return;
    void action(async signal => {
      await api.move(token, item.id, status, signal);
      if (signal.aborted) return;
      setNotice(`Statut enregistré pour ${item.company} : ${STATUS_LABELS[status]}.`);
      setLoading(true); setColumns(null); setRevision(value => value + 1);
    });
  }
  function more(status: ApplicationStatus) {
    if (!columns) return;
    const current = columns[status];
    void action(async signal => {
      const next = await api.list(token, status, current.page + 1, signal);
      if (signal.aborted) return;
      // Deduplicate if another client changes ordering between pages.
      const items = [...new Map([...current.items, ...next.items].map(item => [item.id, item])).values()];
      setColumns(value => value && { ...value, [status]: { ...next, items } });
    });
  }
  const total = columns ? STATUSES.reduce((sum, status) => sum + columns[status].total, 0) : 0;
  const locked = loading || busy;
  return <section aria-labelledby="progress-title" className="progress-space">
    <div className="section-heading"><div><p className="eyebrow">UNE VUE D’ENSEMBLE</p><h2 id="progress-title">Dashboard et Kanban</h2></div><button className="secondary" disabled={locked} onClick={() => setRevision(value => value + 1)}>Actualiser le suivi</button></div>
    {notice && <p role="status" className="success-message">{notice}</p>}
    {error && <div role="alert" className="error-message"><p>{error}</p><button className="secondary" disabled={locked} onClick={() => setRevision(value => value + 1)}>Réessayer le suivi</button></div>}
    {loading ? <p role="status">Chargement du suivi…</p> : columns && <>
      <dl className="dashboard-stats" aria-label="Statistiques des candidatures"><div><dt>Total</dt><dd>{total}</dd></div>{STATUSES.map(status => <div key={status}><dt>{STATUS_LABELS[status]}</dt><dd>{columns[status].total}</dd></div>)}</dl>
      <p className="field-hint">Les totaux couvrent toutes vos candidatures. Changez le statut sur une carte pour enregistrer son déplacement. Les colonnes se chargent par lots de 20.</p>
      <div className="kanban-board">{STATUSES.map(status => {
        const column = columns[status];
        return <section key={status} className={`kanban-column status-${status.toLowerCase()}`} aria-label={`Colonne ${STATUS_LABELS[status]}`}>
          <div className="kanban-heading"><h3>{STATUS_LABELS[status]}</h3><span>{column.total}</span></div>
          {!column.items.length && <p className="field-hint">Aucune candidature.</p>}
          {column.items.map(item => <article className="kanban-card" key={item.id}><h4>{item.company}</h4><p>{item.position}</p><p className="field-hint">Échéance : {displayDate(item.deadline)}</p><label htmlFor={`move-${item.id}`}>Statut de {item.company}</label><select id={`move-${item.id}`} value={item.status} disabled={locked} onChange={event => move(item, event.target.value as ApplicationStatus)}>{STATUSES.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></article>)}
          {column.page * column.pageSize < column.total && <button className="secondary" disabled={locked} onClick={() => more(status)}>Charger plus — {STATUS_LABELS[status]}</button>}
        </section>;
      })}</div>
    </>}
    {busy && <p role="status">Enregistrement ou chargement en cours…</p>}
  </section>;
}
