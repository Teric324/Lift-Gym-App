import { plainLetters } from '../domain/display-text';

interface DisplayTitleProps {
  /** The title text. Shown without diacritics: the display font cannot draw them. */
  children: string;
  className?: string;
}

/**
 * A page title (the only element set in the display font, Black Ops One). Use it instead of a
 * bare `<h1>`, so the text is always shown in plain letters.
 */
export function DisplayTitle({ children, className }: DisplayTitleProps) {
  return <h1 className={className}>{plainLetters(children)}</h1>;
}

/**
 * A major name inside a card (a workout on the Workouts screen) in the display font. Like
 * `DisplayTitle` it shows plain letters; keep it for names, never for body text.
 */
export function DisplayText({ children, className = '' }: DisplayTitleProps) {
  return <span className={`display-text ${className}`.trim()}>{plainLetters(children)}</span>;
}
