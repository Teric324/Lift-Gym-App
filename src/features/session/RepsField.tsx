import { useId, useRef, useState } from 'react';
import { readRepsText } from '../../domain/field-input';
import { MAX_REPS, MIN_REPS } from '../../domain/set-values';
import { en } from '../../i18n/en';

const t = en.session;

export interface RepsFieldProps {
  /** The stored repetitions; null while the row is still blank. */
  value: number | null;
  /** Called with every new valid value as the user types or taps - / +. */
  onChange: (reps: number) => unknown;
  label?: string;
}

/** Reps input with - and + buttons. Saves every valid value at once, like `WeightField`. */
export function RepsField({ value, onChange, label = t.repsLabel }: RepsFieldProps) {
  const errorId = useId();
  const [text, setText] = useState<string | null>(null);
  // The value being written right now (see WeightField).
  const inFlight = useRef<number | null>(null);

  function save(next: number) {
    if (next === value || next === inFlight.current) return;
    inFlight.current = next;
    void Promise.resolve(onChange(next)).finally(() => {
      if (inFlight.current === next) inFlight.current = null;
    });
  }

  const shown = text ?? (value === null ? '' : String(value));
  const reading = text === null ? null : readRepsText(text);
  const invalid = reading?.state === 'invalid';

  function handleChange(next: string) {
    setText(next);
    const read = readRepsText(next);
    if (read.state === 'valid') save(read.value);
  }

  function handleBlur() {
    const read = text === null ? null : readRepsText(text);
    if (read === null || read.state !== 'invalid') setText(null);
  }

  function step(delta: number) {
    const base = value ?? 0;
    const next = Math.min(MAX_REPS, Math.max(MIN_REPS, base + delta));
    setText(null);
    save(next);
  }

  return (
    <span className="field-inline reps-field">
      <button
        type="button"
        className="button button--small reps-field__step"
        aria-label={t.repsMinus}
        disabled={value !== null && value <= MIN_REPS}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        className={`field__input field-inline__input${invalid ? ' field__input--invalid' : ''}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        value={shown}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
      <button
        type="button"
        className="button button--small reps-field__step"
        aria-label={t.repsPlus}
        disabled={value !== null && value >= MAX_REPS}
        onClick={() => step(1)}
      >
        +
      </button>
      {invalid && (
        <span id={errorId} className="field__error" role="status">
          {`${t.fieldError[reading.error]} ${
            value === null ? t.notSavedBlank : t.notSaved(String(value))
          }`}
        </span>
      )}
    </span>
  );
}
