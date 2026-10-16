import { useId, useRef, useState } from 'react';
import { readRepsText } from '../../domain/field-input';
import { en } from '../../i18n/en';

const t = en.session;

export interface RepsFieldProps {
  /** The stored repetitions; null while the row is still blank. */
  value: number | null;
  /** Called with every new valid value as the user types. */
  onChange: (reps: number) => unknown;
  label?: string;
}

/**
 * Reps: a plain numeric input. Saves every valid value at once,
 * like `WeightField`. The text is selected when the field gets focus, so typing replaces it.
 */
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

  return (
    <span className="field-inline reps-field">
      <input
        className={`field__input field-inline__input${invalid ? ' field__input--invalid' : ''}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        value={shown}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        onBlur={handleBlur}
      />
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
