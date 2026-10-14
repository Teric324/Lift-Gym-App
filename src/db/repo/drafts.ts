import type { DraftItem, SessionDraft } from '../../domain/types';
import type { LiftDB } from '../schema';

export function getDraft(db: LiftDB, sessionId: string): Promise<SessionDraft | undefined> {
  return db.drafts.get(sessionId);
}

/** Saves the working state of an active session (order, added/replaced/skipped exercises). */
export async function saveDraft(
  db: LiftDB,
  sessionId: string,
  items: readonly DraftItem[],
  now: number = Date.now(),
): Promise<SessionDraft> {
  return db.transaction('rw', db.drafts, db.sessions, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.finishedAt !== null) throw new Error('Session is already finished');
    const draft: SessionDraft = {
      sessionId,
      items: items.map((item) => ({ ...item })),
      updatedAt: now,
    };
    await db.drafts.put(draft);
    return draft;
  });
}

export function deleteDraft(db: LiftDB, sessionId: string): Promise<void> {
  return db.drafts.delete(sessionId);
}
