import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from '../db/instance';
import { requestPersistentStorage } from '../db/persist';
import { seedStarterExercises } from '../db/seed';
import { initPwaUpdates } from '../features/pwa/update';
import { App } from './App';
import { startAppHeight } from './app-height';
import './fonts.css';
import './theme.css';
import './layout.css';
import '../ui/ui.css';

// Set by the start-up safety net in index.html (shows a recovery screen if we never get ready).
declare global {
  interface Window {
    __liftBoot?: { ready(): void; fail(why: string): void };
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(resolve, ms))]);

/** Database start-up work. The screen is already up; screens read through live queries. */
async function prepareData() {
  // Loads the starter exercises on the very first run only (a flag in the database).
  await seedStarterExercises(db);
  // Ask the browser to keep our data; the answer is shown in Settings. A slow permission
  // prompt must not keep the app from opening.
  await withTimeout(requestPersistentStorage(db), 1500);
  // Another tab/window upgraded the database schema: this page's connection was closed, so
  // reload to run the same version as the database.
  db.onVersionChange = () => location.reload();
}

function start() {
  startAppHeight();
  // Render first: the app must never wait (and show nothing) on IndexedDB, which can be slow or
  // stuck right after an update on iOS. The start-up safety net reports if the database or the
  // service worker does not come up.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  prepareData().then(
    () => window.__liftBoot?.ready(),
    (error: unknown) =>
      window.__liftBoot?.fail(
        `Database: ${error instanceof Error ? error.message : String(error)}`,
      ),
  );
  try {
    initPwaUpdates();
  } catch {
    // Offline support is optional for the app to run; never let it stop the start.
  }
}

start();
