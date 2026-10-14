import { useEffect, useMemo, useRef, useState } from 'react';
import { findExerciseByName } from '../../db/repo/exercises';
import { db } from '../../db/instance';
import type { Exercise } from '../../domain/types';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { EmptyState } from '../../ui/EmptyState';

const t = en.workouts.picker;

interface ExercisePickerProps {
  open: boolean;
  /** Registry exercises that can be added (the caller leaves out archived ones). */
  available: Exercise[];
  /** Called with the chosen existing ids and the names of exercises to create. */
  onConfirm: (selection: { exerciseIds: string[]; newNames: string[] }) => void | Promise<void>;
  onCancel: () => void;
}

/** Full-screen sheet: search the registry, tick several exercises, or create a new one inline. */
export function ExercisePicker({ open, available, onConfirm, onCancel }: ExercisePickerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [newNames, setNewNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setSelected([]);
      setNewNames([]);
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () => available.filter((e) => needle === '' || e.name.toLowerCase().includes(needle)),
    [available, needle],
  );
  const exactMatch = available.some((e) => e.name.toLowerCase() === needle);
  const alreadyQueued = newNames.some((n) => n.toLowerCase() === needle);
  const canCreate = needle !== '' && !exactMatch && !alreadyQueued;
  const count = selected.length + newNames.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function queueNewName() {
    const name = query.trim().replace(/\s+/g, ' ');
    // The name may belong to an exercise that is archived or already in this workout.
    const existing = await findExerciseByName(db, name);
    if (existing) {
      setError(en.exercises.nameTaken(existing.name));
      return;
    }
    setNewNames((current) => [...current, name]);
    setQuery('');
    setError(null);
  }

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm({ exerciseIds: selected, newNames });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog--tall"
      onCancel={onCancel}
      aria-labelledby="picker-title"
    >
      <h2 id="picker-title">{t.title}</h2>

      <label className="field">
        <span className="field__label">{t.searchLabel}</span>
        <input
          className="field__input"
          type="search"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
        />
      </label>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {canCreate && (
        <button type="button" className="button" onClick={() => void queueNewName()}>
          {t.create(query.trim().replace(/\s+/g, ' '))}
        </button>
      )}

      {newNames.length > 0 && (
        <ul className="list">
          {newNames.map((name) => (
            <li key={name} className="list__row">
              <span className="list__main">
                <span className="list__title">{name}</span>
                <span className="list__meta">{en.workouts.picker.create(name)}</span>
              </span>
              <button
                type="button"
                className="button button--small"
                onClick={() => setNewNames((current) => current.filter((n) => n !== name))}
              >
                {en.common.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length === 0 && newNames.length === 0 && !canCreate && (
        <EmptyState>{t.allAdded}</EmptyState>
      )}
      {available.length > 0 && shown.length === 0 && !canCreate && (
        <EmptyState>{t.none}</EmptyState>
      )}

      <ul className="list picker__list">
        {shown.map((exercise) => (
          <li key={exercise.id} className="list__row">
            <label className="list__main picker__choice">
              <input
                type="checkbox"
                checked={selected.includes(exercise.id)}
                onChange={() => toggle(exercise.id)}
              />
              <span>
                <span className="list__title">{exercise.name}</span>
                <span className="list__meta">
                  {en.exercises.step(formatWeight(exercise.stepGrams))}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="dialog__actions">
        <button type="button" className="button" onClick={onCancel}>
          {en.common.cancel}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={count === 0 || busy}
          onClick={() => void confirm()}
        >
          {t.confirm(count)}
        </button>
      </div>
    </dialog>
  );
}
