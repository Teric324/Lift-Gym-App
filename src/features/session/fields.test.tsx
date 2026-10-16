// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepsField } from './RepsField';

afterEach(cleanup);

const reps = () => screen.getByLabelText('Reps') as HTMLInputElement;
const type = (input: HTMLInputElement, text: string) =>
  fireEvent.change(input, { target: { value: text } });

describe('RepsField', () => {
  function renderReps(value: number | null = 5) {
    const onChange = vi.fn();
    render(<RepsField value={value} onChange={onChange} />);
    return onChange;
  }

  it('is a plain numeric input, with no - and + buttons', () => {
    renderReps(5);
    expect(reps().getAttribute('inputmode')).toBe('numeric');
    expect(reps().getAttribute('pattern')).toBe('[0-9]*');
    expect(reps().getAttribute('enterkeyhint')).toBe('done');
    expect(screen.queryByLabelText('One rep more')).toBeNull();
    expect(screen.queryByLabelText('One rep less')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('selects the whole text when it gets focus, so typing replaces it', () => {
    renderReps(12);
    fireEvent.focus(reps());
    expect(reps().selectionStart).toBe(0);
    expect(reps().selectionEnd).toBe(2);
  });

  it('the keyboard Done key (Enter) leaves the field', () => {
    renderReps(12);
    reps().focus();
    expect(document.activeElement).toBe(reps());
    fireEvent.keyDown(reps(), { key: 'Enter' });
    expect(document.activeElement).not.toBe(reps());
  });

  it('saves 10, 12 and 100 and rejects 0 and 101 with the range message', () => {
    const onChange = renderReps(8);
    for (const text of ['10', '12', '100']) type(reps(), text);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([10, 12, 100]);
    onChange.mockClear();
    type(reps(), '0');
    expect(screen.getByRole('status').textContent).toMatch(/from 1 to 100/);
    type(reps(), '101');
    expect(screen.getByRole('status').textContent).toMatch(/from 1 to 100/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('saves every valid value as it is typed', () => {
    const onChange = renderReps(5);
    type(reps(), '1');
    type(reps(), '12');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 12]);
  });

  it('does not save 0, 101 or non-numbers, and keeps the last valid value', () => {
    const onChange = renderReps(8);
    type(reps(), '0');
    type(reps(), '101');
    type(reps(), '5.5');
    type(reps(), 'abc');
    expect(onChange).not.toHaveBeenCalled();
    expect(reps().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('status').textContent).toMatch(/Keeping 8/);
  });
});
