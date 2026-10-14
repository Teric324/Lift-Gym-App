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
