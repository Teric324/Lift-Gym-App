import { describe, expect, it, vi } from 'vitest';
import { canShareFile, shareFile } from './share';

const file = new File(['{}'], 'lift-backup-2026-10-14.json', { type: 'application/json' });

describe('canShareFile', () => {
  it('is false when the browser has no share or canShare', () => {
    expect(canShareFile(file, {})).toBe(false);
    expect(canShareFile(file, { share: vi.fn() })).toBe(false);
  });

  it('is false when the browser cannot share files (desktop Chrome on http)', () => {
    expect(canShareFile(file, { share: vi.fn(), canShare: () => false })).toBe(false);
  });

  it('is true when it can share this file', () => {
    expect(canShareFile(file, { share: vi.fn(), canShare: () => true })).toBe(true);
  });
});

describe('shareFile', () => {
  it('shares the file with a title', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const outcome = await shareFile(file, 'Lift backup', { share, canShare: () => true });
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Lift backup' });
  });

  it('reports unsupported without calling share', async () => {
    const share = vi.fn();
    expect(await shareFile(file, 't', { share, canShare: () => false })).toBe('unsupported');
    expect(share).not.toHaveBeenCalled();
  });

  it('reports cancelled when the user closes the sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    expect(await shareFile(file, 't', { share, canShare: () => true })).toBe('cancelled');
  });

  it('falls back to unsupported on other errors', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('no gesture', 'NotAllowedError'));
    expect(await shareFile(file, 't', { share, canShare: () => true })).toBe('unsupported');
  });
});
