import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { db } from '../../db/instance';
import {
  addExercise,
  findExerciseByName,
  listExercises,
  setExerciseArchived,
} from '../../db/repo/exercises';
import type { Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { TextPrompt } from '../../ui/TextPrompt';

const t = en.exercises;

export function ExerciseListScreen() {
  const all = useLiveQuery(() => listExercises(db, { includeArchived: true }), []);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [toRestore, setToRestore] = useState<Exercise | null>(null);

  if (all === undefined) return <p>{en.settings.loading}</p>;

  const needle = query.trim().toLowerCase();
  const matches = (e: Exercise) => needle === '' || e.name.toLowerCase().includes(needle);
  const active = all.filter((e) => !e.archived && matches(e));
  const archived = all.filter((e) => e.archived && matches(e));
  const archivedTotal = all.filter((e) => e.archived).length;

  return (
    <section>
      <h1>{t.title}</h1>
      <p className="muted">{t.intro}</p>

      <div className="screen__actions">
        <button type="button" className="button button--primary" onClick={() => setAdding(true)}>
          {t.add}
        </button>
      </div>

      {all.length > 0 && (
        <label className="field">
          <span className="field__label">{t.searchLabel}</span>
          <input
            className="field__input"
            type="search"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}

      {all.length === 0 && <EmptyState>{t.empty}</EmptyState>}
      {all.length > 0 && active.length === 0 && archived.length === 0 && (
        <EmptyState>{t.noMatches}</EmptyState>
      )}

      <ul className="list">
        {active.map((exercise) => (
          <li key={exercise.id} className="list__row">
            <Link className="list__main" to={`/exercises/${exercise.id}`}>
              <span className="list__title">{exercise.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      {archivedTotal > 0 && (
        <CollapsibleSection title={t.archivedHeading(archivedTotal)}>
          <ul className="list">
            {archived.map((exercise) => (
              <li key={exercise.id} className="list__row list__row--muted">
                <Link className="list__main" to={`/exercises/${exercise.id}`}>
                  <span className="list__title">{exercise.name}</span>
                </Link>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => void setExerciseArchived(db, exercise.id, false)}
                >
                  {en.common.restore}
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      <TextPrompt
        open={adding}
        title={t.addTitle}
        label={t.nameLabel}
        confirmLabel={en.common.add}
        validate={async (name) => {
          const existing = await findExerciseByName(db, name);
          return existing && !existing.archived ? t.nameTaken(existing.name) : null;
        }}
        onSubmit={async (name) => {
          const existing = await findExerciseByName(db, name);
          setAdding(false);
          if (existing)
            setToRestore(existing); // archived: offer to bring it back
          else await addExercise(db, name);
        }}
        onCancel={() => setAdding(false)}
      />

      <ConfirmDialog
        open={toRestore !== null}
        title={t.restoreTitle}
        confirmLabel={en.common.restore}
        onCancel={() => setToRestore(null)}
        onConfirm={async () => {
          if (toRestore) await setExerciseArchived(db, toRestore.id, false);
          setToRestore(null);
        }}
      >
        <p>{toRestore ? t.restoreBody(toRestore.name) : null}</p>
      </ConfirmDialog>
    </section>
  );
}
