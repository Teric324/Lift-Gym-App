import { useId, useRef, useState } from 'react';
import { CONFIRM_ABOVE_GRAMS, formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { WeightPicker } from './WeightPicker';

const t = en.session;

export interface WeightFieldProps {
  /** The stored weight in grams; null while the row is still blank. */
  valueGrams: number | null;
  /** The exercise's weight step: the picker lists its multiples. */
  stepGrams: number;
  /** A weight to start near when the picker opens if the row has none (the pre-filled value). */
  lastGrams: number | null;
  /** Called with every new valid weight: a tap in the picker, or each valid value typed. */
  onChange: (grams: number) => unknown;
  label?: string;
}

/**
 * Weight of a set. It shows the value as a button; tapping it opens the picker (step list, jump
 * buttons, free typing). Every valid value is saved at once, so nothing is lost if the app is
 * closed with the picker open. An invalid or empty text is never saved.
 *
 * The props are the contract `SetRow` relies on; they did not change when the text field was
 * replaced by the picker.
 */
export function WeightField({
  valueGrams,
  stepGrams,
  lastGrams,
  onChange,
  label = t.weightLabel,
}: WeightFieldProps) {
  const warnId = useId();
  const [open, setOpen] = useState(false);
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

  const warn = valueGrams !== null && valueGrams > CONFIRM_ABOVE_GRAMS;

  return (
    <span className="field-inline">
      <button
        type="button"
        className="weight-button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-describedby={warn ? warnId : undefined}
        onClick={() => setOpen(true)}
      >
        {valueGrams === null ? (
          <span className="muted">{t.setWeight}</span>
        ) : (
          <>
            {formatWeight(valueGrams)} <span className="weight-button__unit">{t.kg}</span>
          </>
        )}
      </button>
      {warn && (
        <span id={warnId} className="field__warning" role="status">
          {t.overWeight}
        </span>
      )}

      {open && (
        <WeightPicker
          title={label}
          valueGrams={valueGrams}
          stepGrams={stepGrams}
          lastGrams={lastGrams}
          onSelect={save}
          onType={save}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}
