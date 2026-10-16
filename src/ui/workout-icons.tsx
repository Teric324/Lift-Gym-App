import type { SVGProps } from 'react';
import type { WorkoutIcon } from '../domain/types';

/** Same 24 px line style as the navigation icons; the stroke takes the text colour. */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

/** One picture per workout kind. Decorative: the name next to it carries the meaning. */
export function WorkoutIconView({ icon }: { icon: WorkoutIcon }) {
  const className = `workout-icon workout-icon--${icon}`;
  switch (icon) {
    case 'push': // barbell on the floor, arrow pushing up
      return (
        <Svg className={className}>
          <path d="M3 20h18M6 17v6M18 17v6M12 15V4M8 8l4-4 4 4" />
        </Svg>
      );
    case 'pull': // pull-up bar with an arrow pulling down
      return (
        <Svg className={className}>
          <path d="M3 4h18M7 4v3M17 4v3M12 9v11M8 16l4 4 4-4" />
        </Svg>
      );
    case 'legs': // a leg in profile: thigh, bent knee, shin and foot
      return (
        <Svg className={className}>
          <path d="M6 3l9 9-2 8h6" />
        </Svg>
      );
    case 'fullbody': // a standing figure, arms out
      return (
        <Svg className={className}>
          <circle cx="12" cy="4.5" r="2.5" />
          <path d="M12 9v6M5 11h14M12 15l-3.5 6M12 15l3.5 6" />
        </Svg>
      );
    case 'generic': // dumbbell
    default:
      return (
        <Svg className={className}>
          <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />
        </Svg>
      );
  }
}
