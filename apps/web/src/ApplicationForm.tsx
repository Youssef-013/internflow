import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage, isAborted, STATUSES, STATUS_LABELS } from './api';
import type { Application, ApplicationInput, ApplicationStatus } from './api';

interface Props { initial?: Application; onSave: (input: ApplicationInput) => Promise<void>; onCancel: () => void; }
const dateInput = (value: string | null | undefined) => value?.slice(0, 10) ?? '';
const validDate = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const storedDate = (value: string, original?: string | null) => value ? (value === dateInput(original) ? original! : value) : null;

export function ApplicationForm({ initial, onSave, onCancel }: Props) {
  const [company, setCompany] = useState(initial?.company ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(initial?.status ?? 'DRAFT');
  const [appliedAt, setAppliedAt] = useState(dateInput(initial?.appliedAt));
  const [deadline, setDeadline] = useState(dateInput(initial?.deadline));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const invalid: Record<string, string> = {};
    if (!company.trim() || company.trim().length > 200) invalid.company = 'Indiquez une entreprise (200 caractères maximum).';
    if (!position.trim() || position.trim().length > 200) invalid.position = 'Indiquez un poste (200 caractères maximum).';
    if (!validDate(appliedAt)) invalid.appliedAt = 'Choisissez une date de candidature valide.';
    if (!validDate(deadline)) invalid.deadline = 'Choisissez une date limite valide.';
    if (notes.length > 10000) invalid.notes = 'Les notes sont limitées à 10 000 caractères.';
    setErrors(invalid); setError(''); if (Object.keys(invalid).length) return;
    pending.current = true; setBusy(true);
    try {
      await onSave({ company: company.trim(), position: position.trim(), status, appliedAt: storedDate(appliedAt, initial?.appliedAt), deadline: storedDate(deadline, initial?.deadline), notes: notes === '' ? null : notes });
    } catch (failure: unknown) { if (!isAborted(failure)) setError(errorMessage(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  const feedback = (name: string) => errors[name] ? <p className="field-error" id={`error-${name}`}>{errors[name]}</p> : null;
  return <section className="panel editor" aria-labelledby="editor-title">
    <p className="card-label">{initial ? 'METTRE À JOUR' : 'UNE NOUVELLE OPPORTUNITÉ'}</p>
    <h2 id="editor-title">{initial ? 'Modifier la candidature' : 'Nouvelle candidature'}</h2>
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <fieldset disabled={busy}>
        <div className="form-grid">
          <div><label htmlFor="application-company">Entreprise <span aria-hidden="true">*</span></label><input autoFocus id="application-company" value={company} maxLength={200} required aria-invalid={!!errors.company} aria-describedby={errors.company ? 'error-company' : undefined} onChange={event => setCompany(event.target.value)} />{feedback('company')}</div>
          <div><label htmlFor="application-position">Poste <span aria-hidden="true">*</span></label><input id="application-position" value={position} maxLength={200} required aria-invalid={!!errors.position} aria-describedby={errors.position ? 'error-position' : undefined} onChange={event => setPosition(event.target.value)} />{feedback('position')}</div>
          <div><label htmlFor="application-status">Statut</label><select id="application-status" value={status} onChange={event => setStatus(event.target.value as ApplicationStatus)}>{STATUSES.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></div>
          <div><label htmlFor="application-applied">Date de candidature</label><input id="application-applied" type="date" value={appliedAt} aria-invalid={!!errors.appliedAt} aria-describedby={errors.appliedAt ? 'error-appliedAt' : undefined} onChange={event => setAppliedAt(event.target.value)} />{feedback('appliedAt')}</div>
          <div><label htmlFor="application-deadline">Date limite</label><input id="application-deadline" type="date" value={deadline} aria-invalid={!!errors.deadline} aria-describedby={errors.deadline ? 'error-deadline' : undefined} onChange={event => setDeadline(event.target.value)} />{feedback('deadline')}</div>
        </div>
        <label htmlFor="application-notes">Notes</label><textarea id="application-notes" rows={4} value={notes} maxLength={10000} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'error-notes' : undefined} onChange={event => setNotes(event.target.value)} />{feedback('notes')}
      </fieldset>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Annuler</button><button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Enregistrer la candidature'}</button></div>
    </form>
  </section>;
}
