// @vitest-environment jsdom
import '../../test/jsdom-dialog';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeightField } from './WeightField';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const rowButton = () => screen.getByRole('button', { name: 'Weight (kg)' });
const openPicker = () => fireEvent.click(rowButton());
const dialog = () => document.querySelector('dialog[open]') as HTMLDialogElement | null;
const typeBox = () => screen.getByLabelText('Type a weight (kg)') as HTMLInputElement;
const type = (text: string) => fireEvent.change(typeBox(), { target: { value: text } });
const listValues = () =>
  within(dialog()!)
    .getAllByRole('listitem')
    .map((li) => li.textContent?.replace(/\s+/g, ' ').replace(/now$/, '').trim());
const valueButton = (kg: string) =>
  within(dialog()!).getByRole('button', { name: new RegExp(`^${kg} kg`) });
const centerText = () => dialog()!.querySelector('[data-center="true"]')?.textContent;

function renderWeight({
  valueGrams = 80000,
  stepGrams = 2500,
  lastGrams = valueGrams,
}: { valueGrams?: number | null; stepGrams?: number; lastGrams?: number | null } = {}) {
  const onChange = vi.fn();
  render(
    <WeightField
      valueGrams={valueGrams}
      stepGrams={stepGrams}
      lastGrams={lastGrams}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('WeightField: the button in the row', () => {
  it('shows the stored weight, or a prompt when the row is blank', () => {
    renderWeight({ valueGrams: 27250 });
    expect(rowButton().textContent).toMatch(/^27\.25\s+kg$/);
    cleanup();
    renderWeight({ valueGrams: null, lastGrams: null });
    expect(rowButton().textContent).toBe('Set weight');
  });

  it('opens the picker on tap and does not save anything by itself', () => {
    const onChange = renderWeight();
    expect(dialog()).toBeNull();
    openPicker();
    expect(dialog()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the over-500 kg note in the row for a stored heavy weight', () => {
    renderWeight({ valueGrams: 501_000 });
    expect(screen.getByRole('status').textContent).toMatch(/Over 500 kg/);
  });
});

describe('WeightField: the step list', () => {
  it('opens centred on the current weight and marks it, without selecting anything', () => {
    const onChange = renderWeight({ valueGrams: 82_500 });
    openPicker();
    expect(centerText()).toMatch(/^82\.5 kg/);
    const now = within(dialog()!).getByRole('button', { current: true });
    expect(now.textContent).toMatch(/^82\.5 kg/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lists multiples of the step: 2.5 kg step shows 77.5, 80, 82.5, 85 ...', () => {
    renderWeight({ valueGrams: 82_500, stepGrams: 2500 });
    openPicker();
    const values = listValues();
    expect(values).toContain('77.5 kg');
    expect(values).toContain('80 kg');
    expect(values).toContain('85 kg');
    expect(values).not.toContain('81 kg');
  });

  it('follows the exercise step: 1.25 kg and 0.25 kg give exact values', () => {
    renderWeight({ valueGrams: 5000, stepGrams: 1250 });
    openPicker();
    expect(listValues()).toEqual(expect.arrayContaining(['3.75 kg', '5 kg', '6.25 kg']));
    cleanup();

    renderWeight({ valueGrams: 1000, stepGrams: 250 });
    openPicker();
    expect(listValues()).toEqual(expect.arrayContaining(['0.25 kg', '0.75 kg', '1 kg', '1.25 kg']));
  });

  it('starts near the last weight when the row is blank', () => {
    renderWeight({ valueGrams: null, lastGrams: 60_000 });
    openPicker();
    expect(centerText()).toMatch(/^60 kg/);
    expect(within(dialog()!).queryByRole('button', { current: true })).toBeNull();
  });

  it('starts at the first step when there is no weight at all', () => {
    renderWeight({ valueGrams: null, lastGrams: null });
    openPicker();
    expect(centerText()).toMatch(/^2\.5 kg/);
    expect(listValues()[0]).toBe('2.5 kg');
  });

  it('a weight that is not a multiple of the step is shown as current, list centred near it', () => {
    renderWeight({ valueGrams: 27_250, stepGrams: 2500 });
    openPicker();
    expect(dialog()!.textContent).toMatch(/Current: 27\.25 kg/);
    expect(centerText()).toMatch(/^27\.5 kg/);
  });

  it('tapping a value applies it once and closes the picker', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    fireEvent.click(valueButton('85'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(85_000);
    expect(dialog()).toBeNull();
  });

  it('tapping the current value changes nothing and closes', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    fireEvent.click(valueButton('80'));
    expect(onChange).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it('0 kg bodyweight is one tap', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '0 kg · bodyweight' }));
    expect(onChange).toHaveBeenCalledWith(0);
    expect(dialog()).toBeNull();
  });
});

describe('WeightField: jump buttons', () => {
  it('+25 and +10 move the list towards 100 kg without changing the weight', () => {
    const onChange = renderWeight({ valueGrams: 60_000 });
    openPicker();
    expect(centerText()).toMatch(/^60 kg/);

    fireEvent.click(screen.getByRole('button', { name: '+25 kg' }));
    expect(centerText()).toMatch(/^85 kg/);
    fireEvent.click(screen.getByRole('button', { name: '+10 kg' }));
    expect(centerText()).toMatch(/^95 kg/);
    fireEvent.click(screen.getByRole('button', { name: '+10 kg' }));
    expect(centerText()).toMatch(/^105 kg/);

    // 100 kg is on the list now; nothing was saved by moving.
    expect(listValues()).toContain('100 kg');
    expect(onChange).not.toHaveBeenCalled();
    expect(dialog()).toBeTruthy();

    fireEvent.click(valueButton('100'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(100_000);
  });

  it('-10 and -25 move back and stop at the first step', () => {
    renderWeight({ valueGrams: 20_000 });
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '−25 kg' }));
    expect(centerText()).toMatch(/^2\.5 kg/);
    expect(listValues()[0]).toBe('2.5 kg');
  });

  it('keeps marking the current value while it is in the visible part of the list', () => {
    renderWeight({ valueGrams: 60_000 });
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '+25 kg' }));
    // 60 kg is still inside the window around 85 kg, and still marked.
    expect(within(dialog()!).getByRole('button', { current: true }).textContent).toMatch(/^60 kg/);

    // Far enough away it leaves the window; nothing is marked then.
    fireEvent.click(screen.getByRole('button', { name: '+25 kg' }));
    fireEvent.click(screen.getByRole('button', { name: '+25 kg' }));
    fireEvent.click(screen.getByRole('button', { name: '+25 kg' }));
    expect(within(dialog()!).queryByRole('button', { current: true })).toBeNull();
  });
});

describe('WeightField: free typing in the picker', () => {
  it('saves every valid value as it is typed and keeps the picker open', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('1');
    type('10');
    type('100');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1000, 10_000, 100_000]);
    expect(dialog()).toBeTruthy();
  });

  it('accepts a decimal comma, a trailing separator and kg', () => {
    const onChange = renderWeight({ valueGrams: null, lastGrams: null });
    openPicker();
    for (const text of ['2', '27', '27,', '27,5', '30 kg']) type(text);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([2000, 27_000, 27_500, 30_000]);
  });

  it('does not save an invalid value and marks it, with a note of what is kept', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('80x');
    expect(onChange).not.toHaveBeenCalled();
    expect(typeBox().getAttribute('aria-invalid')).toBe('true');
    expect(within(dialog()!).getByRole('status').textContent).toMatch(/Keeping 80 kg/);
  });

  it('too many decimals and negatives are not saved', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('80.256');
    type('-5');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clearing the field does not save and is not an error', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('8');
    type('');
    expect(onChange).toHaveBeenCalledTimes(1); // only the "8"
    expect(typeBox().getAttribute('aria-invalid')).toBe('false');
  });

  it('fixing a typo saves the valid value and clears the mark', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('82,x');
    type('82,5');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(82_500);
    expect(typeBox().getAttribute('aria-invalid')).toBe('false');
  });

  it('warns above 500 kg but still saves', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('501');
    expect(onChange).toHaveBeenCalledWith(501_000);
    expect(within(dialog()!).getByRole('status').textContent).toMatch(/Over 500 kg/);
    expect(typeBox().getAttribute('aria-invalid')).toBe('false');
  });

  it('does not save the value that is already stored', () => {
    const onChange = renderWeight({ valueGrams: 80_000 });
    openPicker();
    type('80');
    type('80.0');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not open the keyboard by itself (the field is not focused on open)', () => {
    renderWeight();
    openPicker();
    expect(document.activeElement).not.toBe(typeBox());
  });
});

describe('WeightField: closing', () => {
  it('Done closes without changing the weight', () => {
    const onChange = renderWeight();
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(dialog()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter in the typing field closes the picker; the typed value was already saved', () => {
    const onChange = renderWeight();
    openPicker();
    type('90');
    fireEvent.keyDown(typeBox(), { key: 'Enter' });
    expect(dialog()).toBeNull();
    expect(onChange).toHaveBeenCalledWith(90_000);
  });

  it('Escape (the dialog cancel event) closes it', () => {
    renderWeight();
    openPicker();
    fireEvent(dialog()!, new Event('cancel', { cancelable: true }));
    expect(dialog()).toBeNull();
  });

  it('a tap on the backdrop closes it', () => {
    renderWeight();
    openPicker();
    fireEvent.click(dialog()!);
    expect(dialog()).toBeNull();
  });

  it('opens fresh next time: centred near the (new) weight, not where it was moved to', () => {
    renderWeight({ valueGrams: 60_000 });
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '+25 kg' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    openPicker();
    expect(centerText()).toMatch(/^60 kg/);
  });
});

describe('WeightField: sized to the visible screen (iOS keyboard)', () => {
  function fakeVisualViewport(height: number, offsetTop = 0) {
    const target = new EventTarget() as EventTarget & { height: number; offsetTop: number };
    target.height = height;
    target.offsetTop = offsetTop;
    vi.stubGlobal('visualViewport', target);
    Object.defineProperty(window, 'visualViewport', { value: target, configurable: true });
    return target;
  }

  it('takes its height and top from the visual viewport and follows it when the keyboard opens', () => {
    const viewport = fakeVisualViewport(700);
    renderWeight();
    openPicker();
    const el = dialog()!;
    expect(el.style.getPropertyValue('--vv-height')).toBe('700px');
    expect(el.style.getPropertyValue('--vv-top')).toBe('0px');

    // The keyboard comes up: the visible area shrinks and may be scrolled.
    act(() => {
      viewport.height = 330;
      viewport.offsetTop = 12;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(el.style.getPropertyValue('--vv-height')).toBe('330px');
    expect(el.style.getPropertyValue('--vv-top')).toBe('12px');
  });

  it('stops listening when the picker closes', () => {
    const viewport = fakeVisualViewport(700);
    renderWeight();
    openPicker();
    const el = dialog()!;
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    act(() => {
      viewport.height = 100;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(el.style.getPropertyValue('--vv-height')).toBe('700px');
  });
});
