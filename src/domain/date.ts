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
