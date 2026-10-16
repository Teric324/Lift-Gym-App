import { useId, type SVGProps } from 'react';
import type { WorkoutIcon } from '../domain/types';

/** Filled pictograms on a 48 grid; the fill and strokes take the text colour. */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="28"
      height="28"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** One picture per workout kind. Decorative: the name next to it carries the meaning. */
export function WorkoutIconView({ icon }: { icon: WorkoutIcon }) {
  // Masks need ids that are unique on the page, since several icons can be shown at once.
  const maskId = useId();
  const className = `workout-icon workout-icon--${icon}`;
  switch (icon) {
    case 'push': // a hand pushing to the right, motion lines behind it
      return (
        <Svg className={className}>
          <path
            fill="currentColor"
            d="M2 28H12C14.5 28 16 26 16 23.5V11C16 8 22 8 22 11V20C23 19 26 19.5 26 22.5C26 25 24.5 26 23.2 26.5L23 30C23 34 20 36.5 16 36.5H2Z"
          />
          <path {...line} strokeWidth="3" d="M31 22H44M39 17L44 22L39 27" />
          <path {...line} strokeWidth="2.4" d="M5 14H11M3 19.5H10M6 24H11" />
        </Svg>
      );
    case 'pull': // a fist on a handle, the arrow curving back to it
      return (
        <Svg className={className}>
          <defs>
            <mask id={maskId}>
              <rect width="48" height="48" fill="#fff" />
              <path
                d="M22 23.5H25.5M22 28H25.5M22 32.5H25.5"
                stroke="#000"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </mask>
          </defs>
          <path fill="currentColor" d="M2 27H12V37H2Z" />
          <rect
            fill="currentColor"
            x="11"
            y="19"
            width="15"
            height="18.5"
            rx="5"
            mask={`url(#${maskId})`}
          />
          <path {...line} strokeWidth="3" d="M19 11V17M19 40V45" />
          <path {...line} strokeWidth="3" d="M45 36C45 26 40 22 31 22M35.5 17.5L31 22L35.5 26.5" />
        </Svg>
      );
    case 'legs': // a figure on a leg press, weight plate on the sled
      return (
        <Svg className={className}>
          <path {...line} strokeWidth="3.5" d="M3 42H45M6 10L26 42M12 19.6L18 15.8M31 42L44 30" />
          <path {...line} strokeWidth="5.5" d="M38 28L31 36" />
          <path {...line} strokeWidth="4.5" d="M31 36L26 24L19.5 17" />
          <circle fill="currentColor" cx="41.5" cy="21.5" r="4" />
          <circle {...line} strokeWidth="3" cx="9" cy="29" r="4.5" />
        </Svg>
      );
    case 'fullbody': // a bodybuilder flexing both arms
      return (
        <Svg className={className}>
          <defs>
            <mask id={maskId}>
              <rect width="48" height="48" fill="#fff" />
              <path
                fill="none"
                stroke="#000"
                strokeWidth="1.3"
                strokeLinecap="round"
                d="M24 21V29M17 27C20 30 22 29.5 24 29C26 29.5 28 30 31 27M21 33H27M22 37H26M15 21C13 23 13.5 25 15 27M33 21C35 23 34.5 25 33 27"
              />
            </mask>
          </defs>
          <g fill="currentColor" mask={`url(#${maskId})`}>
            <path d="M16 25C12 25 7 25 5 22C3 19 4 13 5 9L6 6C6 4 11 4 11 6L11 9C10 12 10 14 11 15C13 12 17 13 18 17Z" />
            <path d="M32 25C36 25 41 25 43 22C45 19 44 13 43 9L42 6C42 4 37 4 37 6L37 9C38 12 38 14 37 15C35 12 31 13 30 17Z" />
            <path d="M14 19C18 17 20 18 24 18C28 18 30 17 34 19L35 26C33 32 28 38 24 44C20 38 15 32 13 26Z" />
            <ellipse cx="24" cy="12.5" rx="4.5" ry="5.5" />
          </g>
        </Svg>
      );
    case 'generic': // dumbbell
    default:
      return (
        <Svg className={className}>
          <path {...line} strokeWidth="4" d="M13 13V35M35 13V35M6 19V29M42 19V29M13 24H35" />
        </Svg>
      );
  }
}
