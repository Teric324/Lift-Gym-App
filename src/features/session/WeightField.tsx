import { useId, useRef, useState } from 'react';
import { CONFIRM_ABOVE_GRAMS, formatWeight } from '../../domain/weight';
import { readWeightText } from '../../domain/field-input';
import { en } from '../../i18n/en';

const t = en.session;

export interface WeightFieldProps {
  /** The stored weight in grams; null while the row is still blank. */
  valueGrams: number | null;
  /** The exercise's weight step. Not used by this text field; the picker (next step) needs it. */
  stepGrams: number;
  /** A weight to start near when the picker opens (the pre-filled value). Next step. */
  lastGrams: number | null;
  /** Called with every new valid weight as the user types, not only on blur. */
  onChange: (grams: number) => unknown;
  label?: string;
}

/**
 * Weight input of a set. Every valid value typed is saved at once, so nothing is lost if the app
 * is closed while the field is focused. An invalid or empty value is never saved: the last valid
 * value stays stored, and an invalid text stays visible and marked until it is fixed.
 *
 * Contract kept stable so the weight picker (steps, +10/+25 jumps, free typing) can replace the
 * inside of this component without changing `SetRow`.
 */
export function WeightField({ valueGrams, onChange, label = t.weightLabel }: WeightFieldProps) {
  const errorId = useId();
  // null = show the stored value; a string = the user's own text while editing or when invalid.
  const [text, setText] = useState<string | null>(null);
  // The value being written right now, so a second identical value (typing "27" then "27,")
  // is not written twice before the stored value has come back.
  const inFlight = useRef<number | null>(null);

  function save(grams: number) {
    if (grams === valueGrams || grams === inFlight.current) return;
    inFlight.current = grams;
    void Promise.resolve(onChange(grams)).finally(() => {
      if (inFlight.current === grams) inFlight.current = null;
    });
  }

  const shown = text ?? (valueGrams === null ? '' : formatWeight(valueGrams));
  const reading = text === null ? null : readWeightText(text);
  const invalid = reading?.state === 'invalid';
  const warn =
    reading?.state === 'valid'
      ? reading.warn
      : reading === null && valueGrams !== null && valueGrams > CONFIRM_ABOVE_GRAMS;

  function handleChange(next: string) {
    setText(next);
    const read = readWeightText(next);
    if (read.state === 'valid') save(read.value);
  }

  function handleBlur() {
    // Valid or empty text goes back to showing the stored value. An invalid text stays marked,
    // with a note that the previous value is what is actually kept.
    const read = text === null ? null : readWeightText(text);
    if (read === null || read.state !== 'invalid') setText(null);
  }

  const kept = valueGrams === null ? null : `${formatWeight(valueGrams)} ${t.kg}`;

  return (
    <span className="field-inline">
      <input
        className={`field__input field-inline__input${invalid ? ' field__input--invalid' : ''}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={invalid || warn ? errorId : undefined}
        value={shown}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
      {(invalid || warn) && (
        <span id={errorId} className={invalid ? 'field__error' : 'field__warning'} role="status">
          {invalid
            ? `${t.fieldError[reading.error]} ${kept ? t.notSaved(kept) : t.notSavedBlank}`
            : t.overWeight}
        </span>
      )}
    </span>
  );
}
