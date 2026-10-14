import { useEffect, useRef, useState, type FormEvent } from 'react';
import { en } from '../i18n/en';

interface TextPromptProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  /** Return an error message to keep the dialog open, or null when the value is fine. */
  validate?: (value: string) => Promise<string | null> | string | null;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
}

/** Asks for one line of text (a name). */
export function TextPrompt({
  open,
  title,
  label,
  initialValue = '',
  confirmLabel,
  validate,
  onSubmit,
  onCancel,
}: TextPromptProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setValue(initialValue);
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialValue]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '') {
      setError(en.common.nameRequired);
      return;
    }
    setBusy(true);
    try {
      const problem = validate ? await validate(trimmed) : null;
      if (problem) {
        setError(problem);
        return;
      }
      await onSubmit(trimmed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} className="dialog" onCancel={onCancel} aria-labelledby="prompt-title">
      <form onSubmit={(e) => void submit(e)}>
        <h2 id="prompt-title">{title}</h2>
        <label className="field">
          <span className="field__label">{label}</span>
          <input
            className="field__input"
            type="text"
            value={value}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
          />
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
        </label>
        <div className="dialog__actions">
          <button type="button" className="button" onClick={onCancel}>
            {en.common.cancel}
          </button>
          <button type="submit" className="button button--primary" disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
