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
          <path d="M2 18h20M5 15v6M19 15v6M12 13V3M8 7l4-4 4 4" />
        </Svg>
      );
    case 'pull': // a figure hanging from a pull-up bar
      return (
        <Svg className={className}>
          <path d="M2 3h20M8 3l2 5M16 3l-2 5" />
          <circle cx="12" cy="9.5" r="2" />
          <path d="M12 11.5v5M12 16.5l-2.5 4.5M12 16.5l2.5 4.5" />
        </Svg>
      );
    case 'legs': // a figure in a squat
      return (
        <Svg className={className}>
          <circle cx="13" cy="3.5" r="2" />
          <path d="M12.5 6l-3 6.5 5.5 2-2 6.5h3.5M11.5 8.5l5.5 1.5" />
        </Svg>
      );
    case 'fullbody': // a standing figure, arms raised
      return (
        <Svg className={className}>
          <circle cx="12" cy="4" r="2" />
          <path d="M12 6.5v7.5M6 4.5l6 3.5 6-3.5M12 14l-4 7M12 14l4 7" />
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
