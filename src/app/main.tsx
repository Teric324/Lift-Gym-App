import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { db } from '../db/instance';
import { seedStarterExercises } from '../db/seed';
import { App } from './App';
import './index.css';

async function start() {
  // Loads the starter exercises on the very first run only (a flag in the database).
  await seedStarterExercises(db);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
