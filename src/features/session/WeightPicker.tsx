import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { readWeightText } from '../../domain/field-input';
import {
  jumpCenter,
  PICKER_JUMPS_GRAMS,
  pickerStart,
  pickerWindow,
} from '../../domain/weight-picker';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';

const t = en.session.picker;
const field = en.session;

export interface WeightPickerProps {
  /** Dialog title, usually the field's label. */
  title: string;
  valueGrams: number | null;
  stepGrams: number;
  lastGrams: number | null;
  /** A weight was tapped in the list (or 0 kg): apply it. The picker closes itself after this. */
  onSelect: (grams: number) => void;
  /** A valid weight was typed. Called on every new valid value; the picker stays open. */
  onType: (grams: number) => void;
  onClose: () => void;
}

/**
 * Keeps the dialog inside the visible part of the screen. On iPhone the on-screen keyboard
 * shrinks the *visual* viewport but not the layout viewport (nor `dvh`), so a dialog sized only
 * with dvh would run under the keyboard. The dialog follows `visualViewport` instead.
 */
function useVisualViewportVars(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;
    const apply = () => {
      element.style.setProperty('--vv-height', `${viewport.height}px`);
      element.style.setProperty('--vv-top', `${viewport.offsetTop}px`);
    };
    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
    };
  }, [ref]);
}

/**
 * The weight picker: the exercise's step list around the current weight, jump buttons to move
 * along it, and 0 kg. Tapping a value applies it at once. Nothing is selected until a tap.
 * Mount it only while it is open, so each opening starts near the weight in the row.
 */
export function WeightPicker({
  title,
  valueGrams,
  stepGrams,
  lastGrams,
  onSelect,
  onType,
  onClose,
}: WeightPickerProps) {
  const errorId = useId();
  const inputId = useId();
  // The user's own text. null = nothing typed yet.
  const [text, setText] = useState<string | null>(null);
  const reading = text === null ? null : readWeightText(text);
  const invalid = reading?.state === 'invalid';
  const warn = reading?.state === 'valid' && reading.warn;
  const kept = valueGrams === null ? null : `${formatWeight(valueGrams)} ${field.kg}`;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [center, setCenter] = useState(() => pickerStart(valueGrams, lastGrams, stepGrams));

  useVisualViewportVars(dialogRef);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Put the centre value in the middle of the visible list, on open and after each jump.
  useLayoutEffect(() => {
    const list = listRef.current;
    const target = list?.querySelector<HTMLElement>('[data-center="true"]');
    if (!list || !target) return;
    list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.offsetHeight / 2;
  }, [center]);

  const values = pickerWindow(stepGrams, center);

  return (
    <dialog
      ref={dialogRef}
      className="dialog picker"
      aria-label={title}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // tap on the backdrop
      }}
    >
      <header className="picker__header">
        <div>
          <h2 className="picker__title">{title}</h2>
          <p className="muted picker__sub">
            {valueGrams === null ? t.currentNone : t.current(formatWeight(valueGrams))}
            {' · '}
            {t.step(formatWeight(stepGrams))}
          </p>
        </div>
        <button type="button" className="button button--primary" onClick={onClose}>
          {t.done}
        </button>
      </header>

      <div className="picker__type">
        <label className="field__label" htmlFor={inputId}>
          {t.typeLabel}
        </label>
        <input
          id={inputId}
          className={`field__input${invalid ? ' field__input--invalid' : ''}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={t.typePlaceholder}
          value={text ?? ''}
          aria-invalid={invalid}
          aria-describedby={invalid || warn ? errorId : undefined}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            const read = readWeightText(next);
            if (read.state === 'valid') onType(read.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onClose();
          }}
        />
        {(invalid || warn) && (
          <span id={errorId} className={invalid ? 'field__error' : 'field__warning'} role="status">
            {invalid
              ? `${field.fieldError[reading.error]} ${kept ? field.notSaved(kept) : field.notSavedBlank}`
              : field.overWeight}
          </span>
        )}
      </div>

      <div className="picker__tools">
        <button
          type="button"
          className="button picker__zero"
          onClick={() => {
            onSelect(0);
            onClose();
          }}
        >
          {t.bodyweight}
        </button>
        <div className="picker__jumps" role="group" aria-label={t.jumpsLabel}>
          {PICKER_JUMPS_GRAMS.map((delta) => (
            <button
              key={delta}
              type="button"
              className="button button--small picker__jump"
              onClick={() => setCenter((current) => jumpCenter(current, delta, stepGrams))}
            >
              {t.jump(delta / 1000)}
            </button>
          ))}
        </div>
      </div>

      <ul ref={listRef} className="picker__list" aria-label={t.listLabel}>
        {values.map((grams) => (
          <li key={grams}>
            <button
              type="button"
              className={`picker__value${grams === valueGrams ? ' picker__value--now' : ''}`}
              data-center={grams === center}
              aria-current={grams === valueGrams ? 'true' : undefined}
              onClick={() => {
                onSelect(grams);
                onClose();
              }}
            >
              <span>{formatWeight(grams)} kg</span>
              {grams === valueGrams && <span className="tag">{t.nowTag}</span>}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
