import { useState } from 'react';
import { MAX_STEP_GRAMS, parseStep, STEP_PRESETS_GRAMS } from '../../domain/step';
import { formatWeight, stepList } from '../../domain/weight';
import { en } from '../../i18n/en';

const t = en.exercises;

interface StepPickerProps {
  stepGrams: number;
  onChange: (stepGrams: number) => void | Promise<void>;
}

/** Choose the weight step of an exercise: a preset, or a custom value typed with `.` or `,`. */
export function StepPicker({ stepGrams, onChange }: StepPickerProps) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isPreset = STEP_PRESETS_GRAMS.includes(stepGrams);
  const preview = stepList(Math.min(stepGrams, MAX_STEP_GRAMS), 4).map(formatWeight).join(', ');

  async function applyCustom() {
    const result = parseStep(custom);
    if (!result.ok) {
      setError(t.stepError[result.error]);
      return;
    }
    setError(null);
    setCustom('');
    await onChange(result.grams);
  }

  return (
    <div>
      <h2>{t.stepHeading}</h2>
      <p className="muted">{t.stepHelp}</p>
      <div className="chips" role="group" aria-label={t.stepHeading}>
        {STEP_PRESETS_GRAMS.map((grams) => (
          <button
            key={grams}
            type="button"
            className="chip"
            aria-pressed={grams === stepGrams}
            onClick={() => void onChange(grams)}
          >
            {formatWeight(grams)} kg
          </button>
        ))}
        {!isPreset && (
          <button type="button" className="chip" aria-pressed="true">
            {formatWeight(stepGrams)} kg
          </button>
        )}
      </div>
      <p className="muted">{t.stepPreview(preview)}</p>

      <label className="field">
        <span className="field__label">{t.stepCustom}</span>
        <input
          className="field__input"
          type="text"
          inputMode="decimal"
          value={custom}
          autoComplete="off"
          onChange={(e) => {
            setCustom(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void applyCustom();
          }}
        />
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
      </label>
      <button type="button" className="button" onClick={() => void applyCustom()}>
        {t.stepSet}
      </button>
    </div>
  );
}
