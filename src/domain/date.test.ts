import { afterEach, describe, expect, it } from 'vitest';
import { localDateString } from './date';

const originalTZ = process.env.TZ;

afterEach(() => {
  if (originalTZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalTZ;
});

describe('localDateString', () => {
  it('formats with zero padding', () => {
    expect(localDateString(new Date(2026, 0, 5, 12, 0).getTime())).toBe('2026-01-05');
    expect(localDateString(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31');
  });

  it('00:30 local stays on the local day, in zones ahead of and behind UTC', () => {
    // In Bucharest (UTC+2/+3) 00:30 local is still the previous day in UTC, so toISOString()
    // would say 2026-10-13. In Los Angeles 23:30 local is already the next day in UTC.
    for (const tz of ['Europe/Bucharest', 'Pacific/Auckland', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = tz;
      expect(localDateString(new Date(2026, 9, 14, 0, 30).getTime())).toBe('2026-10-14');
      expect(localDateString(new Date(2026, 9, 14, 23, 30).getTime())).toBe('2026-10-14');
    }
  });

  it('differs from toISOString() when the zone is ahead of UTC (why we do not use it)', () => {
    process.env.TZ = 'Europe/Bucharest';
    const ms = new Date(2026, 9, 14, 0, 30).getTime();
    expect(new Date(ms).toISOString().slice(0, 10)).toBe('2026-10-13');
    expect(localDateString(ms)).toBe('2026-10-14');
  });
});
