import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface BackLinkProps {
  to: string;
  children: ReactNode;
}

/** The "‹ Back" control at the top of a screen: plain text, no underline, yellow when pressed. */
export function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link className="back-link" to={to}>
      <span className="back-link__chevron" aria-hidden="true">
        ‹
      </span>
      {children}
    </Link>
  );
}
