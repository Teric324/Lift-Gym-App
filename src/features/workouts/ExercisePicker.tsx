import { useEffect, useMemo, useRef, useState } from 'react';
import { findExerciseByName } from '../../db/repo/exercises';
import { db } from '../../db/instance';
import type { Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { EmptyState } from '../../ui/EmptyState';

const t = en.workouts.picker;

export interface ExerciseSelection {
  exerciseIds: string[];
  newNames: string[];
}

interface ExercisePickerProps {
  open: boolean;
  /** Registry exercises that can be chosen (the caller leaves out archived and unusable ones). */
  available: Exercise[];
  /** Called with the chosen existing ids and the names of exercises to create. */
  onConfirm: (selection: ExerciseSelection) => void | Promise<void>;
  onCancel: () => void;
  /**
   * "multiple": tick several and confirm. "single": one tap on an exercise (or on "Create ...")
   * chooses it at once, for replacing an exercise.
   */
  mode?: 'multiple' | 'single';
  title?: string;
}

/** Full-screen sheet: search the registry, pick exercises, or create a new one inline. */
export function ExercisePicker({
  open,
  available,
  onConfirm,
  onCancel,
  mode = 'multiple',
  title = t.title,
}: ExercisePickerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [newNames, setNewNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const single = mode === 'single';

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
  const cleanQuery = query.trim().replace(/\s+/g, ' ');

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  /** The name may belong to an exercise that is archived or already in the workout. */
  async function nameIsFree(name: string): Promise<boolean> {
    const existing = await findExerciseByName(db, name);
    if (existing) {
      setError(en.exercises.nameTaken(existing.name));
      return false;
    }
    return true;
  }

  async function confirmWith(selection: ExerciseSelection) {
    setBusy(true);
    try {
      await onConfirm(selection);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createClicked() {
    if (!(await nameIsFree(cleanQuery))) return;
    if (single) {
      await confirmWith({ exerciseIds: [], newNames: [cleanQuery] });
      return;
    }
    setNewNames((current) => [...current, cleanQuery]);
    setQuery('');
    setError(null);
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog--tall"
      onCancel={onCancel}
      aria-labelledby="exercise-picker-title"
    >
      <h2 id="exercise-picker-title">{title}</h2>

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
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => void createClicked()}
        >
          {t.create(cleanQuery)}
        </button>
      )}

      {newNames.length > 0 && (
        <ul className="list">
          {newNames.map((name) => (
            <li key={name} className="list__row">
              <span className="list__main">
                <span className="list__title">{name}</span>
                <span className="list__meta">{t.create(name)}</span>
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

      <ul className="list exercise-picker__list">
        {shown.map((exercise) => (
          <li key={exercise.id} className="list__row">
            {single ? (
              <button
                type="button"
                className="list__main picker__choice picker__choice--button"
                disabled={busy}
                onClick={() => void confirmWith({ exerciseIds: [exercise.id], newNames: [] })}
              >
                <span className="list__title">{exercise.name}</span>
              </button>
            ) : (
              <label className="list__main picker__choice">
                <input
                  type="checkbox"
                  checked={selected.includes(exercise.id)}
                  onChange={() => toggle(exercise.id)}
                />
                <span className="list__title">{exercise.name}</span>
              </label>
            )}
          </li>
        ))}
      </ul>

      <div className="dialog__actions">
        <button type="button" className="button" onClick={onCancel}>
          {en.common.cancel}
        </button>
        {!single && (
          <button
            type="button"
            className="button button--primary"
            disabled={count === 0 || busy}
            onClick={() => void confirmWith({ exerciseIds: selected, newNames })}
          >
            {t.confirm(count)}
          </button>
        )}
      </div>
    </dialog>
  );
}
