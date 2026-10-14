import { LiftDB } from './schema';

/** The app-wide database. Tests create their own `new LiftDB(name)` instead. */
export const db = new LiftDB();
