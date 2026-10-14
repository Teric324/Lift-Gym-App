import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from '../db/instance';
import { requestPersistentStorage } from '../db/persist';
import { seedStarterExercises } from '../db/seed';
import { initPwaUpdates } from '../features/pwa/update';
import { App } from './App';
import './index.css';

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(resolve, ms))]);

async function start() {
  // Loads the starter exercises on the very first run only (a flag in the database).
  await seedStarterExercises(db);
  // Ask the browser to keep our data; the answer is shown in Settings. A slow permission
  // prompt must not keep the app from opening.
  await withTimeout(requestPersistentStorage(db), 1500);
  initPwaUpdates();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
