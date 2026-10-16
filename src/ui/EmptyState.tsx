import type { ReactNode } from 'react';

/** A short, quiet message in the middle of an empty list, with an optional icon above it. */
export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-state__icon">{icon}</span>}
      <p>{children}</p>
    </div>
  );
}
