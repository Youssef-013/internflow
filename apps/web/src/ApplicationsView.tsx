import { useEffect, useRef, useState } from 'react';
import { api, ApiError, displayDate, errorMessage, isAborted, STATUSES, STATUS_LABELS } from './api';
import type { Application, ApplicationInput, ApplicationPage, ApplicationStatus } from './api';
import { ApplicationForm } from './ApplicationForm';
import { ProgressBoard } from './ProgressBoard';

function Details({ token, id, onClose, onEdit, onExpired }: { token: string; id: string; onClose: () => void; onEdit: (item: Application) => void; onExpired: () => void }) {
  const [item, setItem] = useState<Application | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setItem(null); setError('');
    api.get(token, id, controller.signal).then(value => { if (!controller.signal.aborted) setItem(value); }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired(); else setError(errorMessage(failure));
    });
    return () => controller.abort();
  }, [token, id, attempt, onExpired]);
  return <section className="panel detail-panel" aria-labelledby="detail-title">
    <div className="section-heading"><h2 id="detail-title">Détail de la candidature</h2><button className="secondary" onClick={onClose}>Fermer</button></div>
    {error ? <div role="alert"><p className="error-message">{error}</p><button className="secondary" onClick={() => setAttempt(value => value + 1)}>Réessayer le détail</button></div> : !item ? <p role="status">Chargement du détail…</p> : <>
      <h3>{item.company}</h3><p>{item.position}</p>
      <dl className="details-grid"><div><dt>Statut</dt><dd>{STATUS_LABELS[item.status]}</dd></div><div><dt>Date de candidature</dt><dd>{displayDate(item.appliedAt)}</dd></div><div><dt>Date limite</dt><dd>{displayDate(item.deadline)}</dd></div><div><dt>Dernière modification</dt><dd>{displayDate(item.updatedAt)}</dd></div></dl>
      <h3>Notes</h3><p className="notes-content">{item.notes || 'Aucune note.'}</p>
      <button onClick={() => onEdit(item)}>Modifier cette candidature</button>
    </>}
  </section>;
}

export function ApplicationsView({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [view, setView] = useState<'list' | 'progress'>('list');
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [pageNumber, setPageNumber] = useState(1);
  const [data, setData] = useState<ApplicationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState<{ initial?: Application } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Application | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const mutations = useRef(new Set<AbortController>());
  const deletePending = useRef(false);
  useEffect(() => () => { for (const controller of mutations.current) controller.abort(); }, []);
  useEffect(() => {
    if (view !== 'list') return;
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    api.list(token, status, pageNumber, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      const last = Math.max(1, Math.ceil(value.total / value.pageSize));
      if (pageNumber > last) setPageNumber(last); else setData(value);
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired(); else setError(errorMessage(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, status, pageNumber, refresh, onExpired, view]);

  async function save(input: ApplicationInput) {
    const controller = new AbortController(); mutations.current.add(controller);
    try {
      await api.save(token, input, controller.signal, form?.initial?.id);
      if (controller.signal.aborted) return;
      setNotice(form?.initial ? 'Candidature modifiée.' : 'Candidature ajoutée.');
      setForm(null); setData(null); setRefresh(value => value + 1);
    } catch (failure: unknown) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      throw failure;
    } finally { mutations.current.delete(controller); }
  }
  async function remove() {
    if (!deleting || deletePending.current) return;
    deletePending.current = true; setDeletingBusy(true); setDeleteError('');
    const controller = new AbortController(); mutations.current.add(controller);
    try {
      await api.remove(token, deleting.id, controller.signal);
      if (controller.signal.aborted) return;
      setDeleting(null); setDetail(null); setNotice('Candidature supprimée.'); setData(null);
      if (data && data.total - 1 <= (pageNumber - 1) * data.pageSize && pageNumber > 1) setPageNumber(pageNumber - 1);
      setRefresh(value => value + 1);
    } catch (failure: unknown) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else if (!isAborted(failure)) setDeleteError(errorMessage(failure));
    } finally { mutations.current.delete(controller); deletePending.current = false; setDeletingBusy(false); }
  }
  const locked = !!form || !!deleting;
  const edit = (item: Application) => { setForm({ initial: item }); setDetail(null); setNotice(''); };
  return <>
    <div className="workspace-heading"><div><p className="eyebrow">VOTRE PROCHAIN CHAPITRE</p><h1>Mes candidatures<span className="brand-dot">.</span></h1><p className="muted">Chaque démarche compte. Gardez une vue claire de la suite.</p></div><button disabled={locked} onClick={() => { setView('list'); setForm({}); setDetail(null); setNotice(''); }}>+ Nouvelle candidature</button></div>
    <nav className="view-switch" aria-label="Vues des candidatures"><button className={view === 'list' ? 'selected' : 'secondary'} aria-pressed={view === 'list'} disabled={locked} onClick={() => { setView('list'); setDetail(null); }}>Liste</button><button className={view === 'progress' ? 'selected' : 'secondary'} aria-pressed={view === 'progress'} disabled={locked} onClick={() => { setView('progress'); setDetail(null); setNotice(''); }}>Dashboard et Kanban</button></nav>
    {view === 'progress' ? <ProgressBoard token={token} onExpired={onExpired} /> : <>
    {notice && <p role="status" className="success-message">{notice}</p>}
    {form && <ApplicationForm key={form.initial?.id ?? 'new'} initial={form.initial} onSave={save} onCancel={() => setForm(null)} />}
    {detail && !locked && <Details key={detail} token={token} id={detail} onClose={() => setDetail(null)} onEdit={edit} onExpired={onExpired} />}
    {deleting && <section className="panel danger-panel" aria-label="Confirmer la suppression"><h2>Supprimer cette candidature ?</h2><p>{deleting.company} · {deleting.position}</p><p className="muted">La candidature et ses notes seront supprimées.</p>{deleteError && <p role="alert" className="error-message">{deleteError}</p>}<div className="form-actions"><button autoFocus className="secondary" disabled={deletingBusy} onClick={() => setDeleting(null)}>Annuler la suppression</button><button className="danger" disabled={deletingBusy} onClick={remove}>{deletingBusy ? 'Suppression…' : 'Confirmer la suppression'}</button></div></section>}
    <section className="panel list-panel" aria-labelledby="list-title">
      <div className="list-toolbar"><div><h2 id="list-title">Votre suivi</h2><p className="field-hint">{data ? `${data.total} candidature${data.total === 1 ? '' : 's'}` : 'Vos candidatures personnelles'}</p></div><div><label htmlFor="status-filter">Filtrer par statut</label><select id="status-filter" value={status} disabled={locked} onChange={event => { setStatus(event.target.value as ApplicationStatus | ''); setPageNumber(1); setDetail(null); setNotice(''); }}><option value="">Tous les statuts</option>{STATUSES.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></div></div>
      {loading ? <p className="empty-state" role="status">Chargement des candidatures…</p> : error ? <div className="empty-state" role="alert"><p className="error-message">{error}</p><button className="secondary" onClick={() => setRefresh(value => value + 1)}>Réessayer</button></div> : data && !data.items.length ? <div className="empty-state"><span className="empty-symbol" aria-hidden="true">↗</span><h3>{status ? 'Aucune candidature pour ce statut.' : 'Votre prochaine opportunité commence ici.'}</h3><p className="muted">{status ? 'Choisissez un autre statut ou ajoutez une candidature.' : 'Ajoutez votre première candidature pour commencer votre suivi.'}</p></div> : data && <>
        <div className="table-scroll"><table><caption className="sr-only">Liste de vos candidatures</caption><thead><tr><th>Entreprise / Poste</th><th>Statut</th><th>Date limite</th><th>Actions</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td><strong>{item.company}</strong><span className="table-position">{item.position}</span></td><td><span className={`status-badge status-${item.status.toLowerCase()}`}>{STATUS_LABELS[item.status]}</span></td><td>{displayDate(item.deadline)}</td><td><div className="row-actions"><button className="text-button" disabled={locked} aria-label={`Consulter ${item.company}`} onClick={() => { setDetail(item.id); setNotice(''); }}>Consulter</button><button className="text-button" disabled={locked} aria-label={`Modifier ${item.company}`} onClick={() => edit(item)}>Modifier</button><button className="text-button delete-link" disabled={locked} aria-label={`Supprimer ${item.company}`} onClick={() => { setDeleting(item); setDetail(null); setDeleteError(''); setNotice(''); }}>Supprimer</button></div></td></tr>)}</tbody></table></div>
        <nav className="pagination" aria-label="Pages des candidatures"><button className="secondary" disabled={locked || pageNumber <= 1} onClick={() => { setPageNumber(value => value - 1); setDetail(null); }}>Précédent</button><span>Page {pageNumber} sur {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button className="secondary" disabled={locked || pageNumber * data.pageSize >= data.total} onClick={() => { setPageNumber(value => value + 1); setDetail(null); }}>Suivant</button></nav>
      </>}
    </section>
    </>}
  </>;
}
