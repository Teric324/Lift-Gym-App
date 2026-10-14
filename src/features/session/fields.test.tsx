// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepsField } from './RepsField';
import { WeightField } from './WeightField';

afterEach(cleanup);

const weight = () => screen.getByLabelText('Weight (kg)') as HTMLInputElement;
const reps = () => screen.getByLabelText('Reps') as HTMLInputElement;
const type = (input: HTMLInputElement, text: string) =>
  fireEvent.change(input, { target: { value: text } });

function renderWeight(valueGrams: number | null = 80000) {
  const onChange = vi.fn();
  render(
    <WeightField
      valueGrams={valueGrams}
      stepGrams={2500}
      lastGrams={valueGrams}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('WeightField', () => {
  it('shows the stored value formatted', () => {
    renderWeight(27250);
    expect(weight().value).toBe('27.25');
  });

  it('saves every valid value as it is typed, not only on blur or Enter', () => {
    const onChange = renderWeight(80000);
    type(weight(), '1');
    type(weight(), '10');
    type(weight(), '100');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1000, 10000, 100000]);
  });

  it('accepts a decimal comma and saves along the way', () => {
    const onChange = renderWeight(null);
    for (const text of ['2', '27', '27,', '27,5']) type(weight(), text);
    // "27," is still 27 kg, so it is not saved again.
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([2000, 27000, 27500]);
  });

  it('does not save an invalid value, and marks it with a note', () => {
    const onChange = renderWeight(80000);
    type(weight(), '80x');
    expect(onChange).not.toHaveBeenCalled();
    expect(weight().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('status').textContent).toMatch(/Keeping 80 kg/);
    // The typed text stays visible, even after leaving the field.
    fireEvent.blur(weight());
    expect(weight().value).toBe('80x');
    expect(weight().getAttribute('aria-invalid')).toBe('true');
  });

  it('too many decimals and negatives are not saved', () => {
    const onChange = renderWeight(80000);
    type(weight(), '80.256');
    type(weight(), '-5');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clearing the field does not save and does not mark an error', () => {
    const onChange = renderWeight(80000);
    type(weight(), '');
    expect(onChange).not.toHaveBeenCalled();
    expect(weight().getAttribute('aria-invalid')).toBe('false');
    // Leaving it empty shows the stored value again.
    fireEvent.blur(weight());
    expect(weight().value).toBe('80');
  });

  it('fixing an invalid text saves the valid value and clears the mark', () => {
    const onChange = renderWeight(80000);
    type(weight(), '82,x');
    type(weight(), '82,5');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(82500);
    expect(weight().getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('warns above 500 kg but still saves', () => {
    const onChange = renderWeight(80000);
    type(weight(), '501');
    expect(onChange).toHaveBeenCalledWith(501000);
    expect(screen.getByRole('status').textContent).toMatch(/Over 500 kg/);
    expect(weight().getAttribute('aria-invalid')).toBe('false');
  });

  it('does not save the same value again', () => {
    const onChange = renderWeight(80000);
    type(weight(), '80');
    type(weight(), '80.0');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('RepsField', () => {
  function renderReps(value: number | null = 5) {
    const onChange = vi.fn();
    render(<RepsField value={value} onChange={onChange} />);
    return onChange;
  }

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

  it('the - and + buttons change the value by one and stop at the limits', () => {
    const onChange = renderReps(5);
    fireEvent.click(screen.getByLabelText('One rep more'));
    fireEvent.click(screen.getByLabelText('One rep less'));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([6, 4]);
    cleanup();

    renderReps(1);
    expect((screen.getByLabelText('One rep less') as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    renderReps(100);
    expect((screen.getByLabelText('One rep more') as HTMLButtonElement).disabled).toBe(true);
  });

  it('+ on a blank row starts at 1', () => {
    const onChange = renderReps(null);
    fireEvent.click(screen.getByLabelText('One rep more'));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
