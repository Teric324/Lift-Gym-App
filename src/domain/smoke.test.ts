import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';

describe('test setup', () => {
  it('runs and resolves modules', () => {
    expect(en.appName).toBe('Lift');
  });
});
