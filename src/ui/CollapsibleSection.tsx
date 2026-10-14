import type { ReactNode } from 'react';

/** A section that starts closed (used for the "Archived" lists). */
export function CollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="section">
      <summary>{title}</summary>
      {children}
    </details>
  );
}
