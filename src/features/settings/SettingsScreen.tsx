import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  backupFileName,
  exportBackup,
  getBackupStatus,
  hasUserData,
  importBackup,
  parseBackupText,
  recordExport,
  serializeBackup,
  summarizeBackup,
  type BackupFile,
  type BackupSummary,
} from '../../db/backup';
import { db } from '../../db/instance';
import { getPersistRecord, type PersistRecord } from '../../db/persist';
import { localDateString } from '../../domain/date';
import { en } from '../../i18n/en';
import { canShareFile, shareFile } from './share';
import { ViewportInfo } from './ViewportInfo';

const t = en.settings;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Prepared {
  file: File;
  name: string;
}

interface Status {
  lastExportAt: number | null;
  reminderDue: boolean;
  now: number;
}

type ImportState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'confirm';
      backup: BackupFile;
      summary: BackupSummary;
      hasData: boolean;
      copySaved: boolean;
      message?: string;
    }
  | { kind: 'done'; message: string };

function errorMessage(result: ReturnType<typeof parseBackupText> & { ok: false }): string {
  switch (result.error) {
    case 'not-json':
      return t.backupError.notJson;
    case 'not-a-backup':
      return t.backupError.notABackup;
    case 'unsupported-version':
      return t.backupError.unsupportedVersion(result.version ?? 0);
    case 'invalid-structure':
      return t.backupError.invalidStructure(result.detail ?? '');
  }
}

async function prepareExport(): Promise<Prepared> {
  const now = Date.now();
  const backup = await exportBackup(db, now);
  const name = backupFileName(now);
  const file = new File([serializeBackup(backup)], name, { type: 'application/json' });
  return { file, name };
}

export function SettingsScreen() {
  const [status, setStatus] = useState<Status | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [forceLink, setForceLink] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [persist, setPersist] = useState<PersistRecord | null | undefined>(undefined);

  // Loads the status and prepares the export file ahead of the tap: the share sheet has to be
  // opened straight from the tap handler on iOS.
  const refresh = useCallback(async () => {
    const now = Date.now();
    const [backupStatus, file] = await Promise.all([getBackupStatus(db, now), prepareExport()]);
    setStatus({ ...backupStatus, now });
    setPrepared(file);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getBackupStatus(db, Date.now()), prepareExport()]).then(([s, file]) => {
      if (cancelled) return;
      setStatus({ ...s, now: Date.now() });
      setPrepared(file);
    });
    void getPersistRecord(db).then((record) => {
      if (!cancelled) setPersist(record);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canShare = prepared !== null && !forceLink && canShareFile(prepared.file);

  const downloadUrl = useMemo(
    () => (prepared ? URL.createObjectURL(prepared.file) : null),
    [prepared],
  );
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  async function markExported() {
    await recordExport(db, Date.now());
    await refresh();
  }

  async function onExportShare() {
    if (!prepared) return;
    setExportMessage(null);
    const outcome = await shareFile(prepared.file, t.exportShareTitle);
    if (outcome === 'shared') {
      await markExported();
      setExportMessage(t.exportDone);
    } else if (outcome === 'unsupported') {
      setForceLink(true);
      setExportMessage(t.exportFailed);
    }
  }

  async function onDownloadClick() {
    await markExported();
    setExportMessage(t.exportDone);
  }

  async function onFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const picked = input.files?.[0];
    if (!picked) return;
    setImportState({ kind: 'reading' });
    try {
      const result = parseBackupText(await picked.text());
      if (!result.ok) {
        setImportState({ kind: 'error', message: errorMessage(result) });
        return;
      }
      setImportState({
        kind: 'confirm',
        backup: result.backup,
        summary: summarizeBackup(result.backup),
        hasData: await hasUserData(db),
        copySaved: false,
      });
    } catch {
      setImportState({ kind: 'error', message: t.backupError.notJson });
    } finally {
      input.value = ''; // allow picking the same file again
    }
  }

  async function runImport(backup: BackupFile) {
    setBusy(true);
    try {
      const summary = await importBackup(db, backup);
      await refresh();
      setImportState({ kind: 'done', message: t.importDone(t.importSummary(summary)) });
    } catch {
      setImportState({ kind: 'error', message: t.importFailed });
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmReplace() {
    if (importState.kind !== 'confirm' || !prepared) return;
    const { backup, hasData, copySaved } = importState;

    if (hasData && !copySaved) {
      // Save a copy of the current data first. Nothing is replaced unless this succeeds.
      const outcome = await shareFile(prepared.file, t.exportShareTitle);
      if (outcome === 'shared') {
        await recordExport(db, Date.now());
      } else {
        setImportState({
          ...importState,
          message: outcome === 'cancelled' ? t.importAbortedNoBackup : t.exportFailed,
        });
        if (outcome === 'unsupported') setForceLink(true);
        return;
      }
    }
    await runImport(backup);
  }

  const shareMode = canShare;
  const lastExport = status?.lastExportAt ?? null;
  const daysSince =
    lastExport === null || status === null ? null : Math.floor((status.now - lastExport) / DAY_MS);

  return (
    <section className="settings">
      <h1>{t.title}</h1>

      <h2>{t.backupHeading}</h2>
      <p>{t.backupIntro}</p>

      {status === null || prepared === null ? (
        <p>{t.loading}</p>
      ) : (
        <>
          <p>
            {lastExport === null
              ? t.lastBackupNever
              : t.lastBackup(localDateString(lastExport), daysSince ?? 0)}
          </p>
          {status.reminderDue && <p className="notice">{t.reminder(daysSince)}</p>}

          {shareMode ? (
            <button type="button" className="button" onClick={() => void onExportShare()}>
              {t.exportButton}
            </button>
          ) : (
            <a
              className="button"
              href={downloadUrl ?? undefined}
              download={prepared.name}
              onClick={() => void onDownloadClick()}
            >
              {t.exportLink}
            </a>
          )}
          {exportMessage && <p role="status">{exportMessage}</p>}
        </>
      )}

      <h2>{t.storageHeading}</h2>
      {persist !== undefined && (
        <p>{persist === null ? t.storage.unknown : t.storage[persist.status]}</p>
      )}

      <h2>{t.importHeading}</h2>
      <p>{t.importIntro}</p>

      {(importState.kind === 'idle' ||
        importState.kind === 'error' ||
        importState.kind === 'done') && (
        <label className="button">
          {t.importButton}
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onFilePicked(e)}
          />
        </label>
      )}

      {importState.kind === 'reading' && <p>{t.importReading}</p>}
      {importState.kind === 'error' && <p role="alert">{importState.message}</p>}
      {importState.kind === 'done' && <p role="status">{importState.message}</p>}

      {importState.kind === 'confirm' && (
        <div className="panel" role="alertdialog" aria-labelledby="import-confirm-title">
          <h3 id="import-confirm-title">{t.importConfirmHeading}</h3>
          <p>{t.importSummary(importState.summary)}</p>
          <p>{t.importExportedOn(localDateString(importState.backup.exportedAt))}</p>

          {importState.hasData && <p>{shareMode ? t.importHasData : t.importHasDataLink}</p>}
          {importState.hasData && !shareMode && prepared && (
            <a
              className="button"
              href={downloadUrl ?? undefined}
              download={prepared.name}
              onClick={() => {
                void recordExport(db, Date.now());
                setImportState({ ...importState, copySaved: true, message: undefined });
              }}
            >
              {t.importSaveCurrent}
            </a>
          )}
          {importState.message && <p role="alert">{importState.message}</p>}

          <div className="screen__actions">
            <button
              type="button"
              className="button button--danger"
              disabled={busy || (importState.hasData && !shareMode && !importState.copySaved)}
              onClick={() => void onConfirmReplace()}
            >
              {t.importConfirm}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setImportState({ kind: 'idle' })}
            >
              {t.importCancel}
            </button>
          </div>
        </div>
      )}

      <p className="muted app-version">{t.version(__APP_BUILD__)}</p>
      <ViewportInfo />
    </section>
  );
}
