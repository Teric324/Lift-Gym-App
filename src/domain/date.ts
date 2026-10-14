/**
 * Local calendar date "YYYY-MM-DD" for an epoch-ms timestamp. Built from the local components,
 * not `toISOString()` (which is UTC and gives the wrong day around midnight).
 */
export function localDateString(ms: number): string {
  const d = new Date(ms);
  const year = String(d.getFullYear()).padStart(4, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local time "HH:MM" (24 h) for an epoch-ms timestamp. */
export function localTimeString(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Mon 12 Oct" for a "YYYY-MM-DD" date, in English. Uses the date parts, not time zones. */
export function formatSessionDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const weekday = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${months[m - 1]}`;
}
