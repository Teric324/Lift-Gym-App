import { useId, useRef, useState } from 'react';
import { readWeightText } from '../../domain/field-input';
import { CONFIRM_ABOVE_GRAMS, formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';

const t = en.session;

export interface WeightFieldProps {
  /** The stored weight in grams; null while the row is still blank. */
  valueGrams: number | null;
  /** Called with every new valid weight as the user types. */
  onChange: (grams: number) => unknown;
  label?: string;
}

/**
 * Weight of a set: a plain input with the unit "kg" after it. The user types the weight
 * (`27.3` or `27,3`) and every valid value is saved at once, so nothing is lost if the app is
 * closed while typing. An invalid text is marked and never saved; an empty one is ignored. The
 * text is selected when the field gets focus, so typing replaces it. Above 500 kg a note asks
 * "are you sure" but the value is still saved.
 */
export function WeightField({ valueGrams, onChange, label = t.weightLabel }: WeightFieldProps) {
  const messageId = useId();
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
      : valueGrams !== null && valueGrams > CONFIRM_ABOVE_GRAMS;

  function handleChange(next: string) {
    setText(next);
    const read = readWeightText(next);
    if (read.state === 'valid') save(read.value);
  }

  function handleBlur() {
    const read = text === null ? null : readWeightText(text);
    if (read === null || read.state !== 'invalid') setText(null);
  }

  return (
    <span className="field-inline weight-field">
      <input
        className={`field__input field-inline__input${invalid ? ' field__input--invalid' : ''}`}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={invalid || warn ? messageId : undefined}
        value={shown}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        onBlur={handleBlur}
      />
      <span className="weight-field__unit">{t.kg}</span>
      {invalid && (
        <span id={messageId} className="field__error" role="status">
          {`${t.fieldError[reading.error]} ${
            valueGrams === null ? t.notSavedBlank : t.notSaved(`${formatWeight(valueGrams)} kg`)
          }`}
        </span>
      )}
      {!invalid && warn && (
        <span id={messageId} className="field__warning" role="status">
          {t.overWeight}
        </span>
      )}
    </span>
  );
}
