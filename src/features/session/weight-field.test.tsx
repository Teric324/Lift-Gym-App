// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeightField } from './WeightField';

afterEach(cleanup);

const box = () => screen.getByLabelText('Weight (kg)') as HTMLInputElement;
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });

function renderWeight(valueGrams: number | null = 80_000) {
  const onChange = vi.fn();
  render(<WeightField valueGrams={valueGrams} onChange={onChange} />);
  return onChange;
}

describe('WeightField: a plain input in the row', () => {
  it('shows the stored weight, or an empty box when the row is blank, with the unit after it', () => {
    renderWeight(27_250);
    expect(box().value).toBe('27.25');
    expect(document.body.textContent).toMatch(/kg$/);
    cleanup();
    renderWeight(null);
    expect(box().value).toBe('');
  });

  it('is a decimal text input with a Done key, and has no picker, step list or jump buttons', () => {
    renderWeight();
    expect(box().tagName).toBe('INPUT');
    expect(box().getAttribute('inputmode')).toBe('decimal');
    expect(box().getAttribute('enterkeyhint')).toBe('done');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('selects the whole text when it gets focus, so typing replaces it', () => {
    renderWeight(12_500);
    fireEvent.focus(box());
    expect(box().selectionStart).toBe(0);
    expect(box().selectionEnd).toBe(4);
  });

  it('the keyboard Done key (Enter) leaves the field', () => {
    renderWeight();
    box().focus();
    expect(document.activeElement).toBe(box());
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(document.activeElement).not.toBe(box());
  });

  it('shows the over-500 kg note for a stored heavy weight', () => {
    renderWeight(501_000);
    expect(screen.getByRole('status').textContent).toMatch(/Over 500 kg/);
  });

  it('does not save anything by itself', () => {
    const onChange = renderWeight();
    fireEvent.focus(box());
    fireEvent.blur(box());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('WeightField: free typing', () => {
  it('saves every valid value as it is typed', () => {
    const onChange = renderWeight();
    type('1');
    type('10');
    type('100');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1000, 10_000, 100_000]);
  });

  it('accepts decimals with . or , such as 12.4 and 27,3, a trailing separator and kg', () => {
    const onChange = renderWeight(null);
    for (const text of ['12', '12.', '12.4', '27,3', '30 kg']) type(text);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([12_000, 12_400, 27_300, 30_000]);
  });

  it('0 kg is valid', () => {
    const onChange = renderWeight();
    type('0');
    expect(onChange).toHaveBeenCalledWith(0);
    expect(box().getAttribute('aria-invalid')).toBe('false');
  });

  it('does not save an invalid value and marks it, with a note of what is kept', () => {
    const onChange = renderWeight();
    type('80x');
    expect(onChange).not.toHaveBeenCalled();
    expect(box().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('status').textContent).toMatch(/Keeping 80 kg/);
  });

  it('too many decimals and negatives are not saved', () => {
    const onChange = renderWeight();
    type('80.256');
    type('-5');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clearing the field does not save and is not an error', () => {
    const onChange = renderWeight();
    type('8');
    type('');
    expect(onChange).toHaveBeenCalledTimes(1); // only the "8"
    expect(box().getAttribute('aria-invalid')).toBe('false');
  });

  it('fixing a typo saves the valid value and clears the mark', () => {
    const onChange = renderWeight();
    type('82,x');
    type('82,5');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(82_500);
    expect(box().getAttribute('aria-invalid')).toBe('false');
  });

  it('warns above 500 kg but still saves', () => {
    const onChange = renderWeight();
    type('501');
    expect(onChange).toHaveBeenCalledWith(501_000);
    expect(screen.getByRole('status').textContent).toMatch(/Over 500 kg/);
    expect(box().getAttribute('aria-invalid')).toBe('false');
  });

  it('does not save the value that is already stored', () => {
    const onChange = renderWeight();
    type('80');
    type('80.0');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaving the field with a valid text shows the stored value again', () => {
    renderWeight();
    type('27,30');
    fireEvent.blur(box());
    expect(box().value).toBe('80'); // the prop is the stored value (the parent has not updated)
  });

  it('leaving the field with an invalid text keeps it on screen, marked', () => {
    renderWeight();
    type('abc');
    fireEvent.blur(box());
    expect(box().value).toBe('abc');
    expect(box().getAttribute('aria-invalid')).toBe('true');
  });
});
