import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRightIcon } from './icons';

interface BackLinkProps {
  to: string;
  children: ReactNode;
}

/** The "‹ Back" control at the top of a screen: a quiet pill, no underline, yellow when pressed. */
export function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link className="back-link" to={to}>
      <span className="back-link__chevron" aria-hidden="true">
        <ChevronRightIcon />
      </span>
      {children}
    </Link>
  );
}
