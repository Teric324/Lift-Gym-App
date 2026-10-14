export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported';

type ShareNavigator = Pick<Navigator, 'share' | 'canShare'>;

/**
 * Sharing a file opens the share sheet (Files, iCloud Drive, ...). That is far more reliable on
 * iPhone than a download from an installed web app, so it is the preferred way to export.
 */
export function canShareFile(file: File, nav: Partial<ShareNavigator> = navigator): boolean {
  return (
    typeof nav.share === 'function' &&
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: [file] })
  );
}

/**
 * Must be called straight from a tap handler, with the file already prepared (an `await` before
 * it can make iOS refuse the share). "cancelled" means the user closed the sheet. Any other
 * failure is reported as "unsupported" so the caller falls back to a download link.
 */
export async function shareFile(
  file: File,
  title: string,
  nav: Partial<ShareNavigator> = navigator,
): Promise<ShareOutcome> {
  if (!canShareFile(file, nav)) return 'unsupported';
  try {
    await nav.share!({ files: [file], title });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}
