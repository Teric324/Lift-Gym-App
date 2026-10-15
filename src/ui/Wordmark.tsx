import { useId } from 'react';
import { en } from '../i18n/en';

/** The lightning bolt, drawn in a 100 x 100 box between x 14 and x 88. */
export const BOLT_PATH = 'M46 0H78L58 36H88L30 100L44 58H14Z';

interface WordmarkProps {
  /** Height in px (or any CSS length); the width follows. */
  height?: number | string;
  className?: string;
}

/**
 * The LIFT wordmark: heavy white letters with the lit yellow bolt standing where the I is.
 * Decorative text is in the SVG, so the app name is announced once through the label.
 */
export function Wordmark({ height = 22, className }: WordmarkProps) {
  // `useId` gives ":r1:"; keep it simple for url(#...) references.
  const id = `wm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      className={className}
      viewBox="-6 -6 296 112"
      height={height}
      role="img"
      aria-label={en.appName.toUpperCase()}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff27a" />
          <stop offset="0.42" stopColor="#ffd60a" />
          <stop offset="1" stopColor="#e29a00" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={BOLT_PATH} />
        </clipPath>
      </defs>

      <g fill="#f5f5f6">
        <path d="M0 0H22V78H54V100H0Z" />
        <path transform="translate(152 0)" d="M0 0H54V22H22V38H46V58H22V100H0Z" />
        <path transform="translate(218 0)" d="M0 0H66V22H44V100H22V22H0Z" />
      </g>

      <g transform="translate(52 0)">
        <path d={BOLT_PATH} fill={`url(#${id}-fill)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="100" height="62" fill={`url(#${id}-gloss)`} />
          <path
            d="M46 0L14 58"
            stroke="#fffbd0"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />
        </g>
      </g>
    </svg>
  );
}
