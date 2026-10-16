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
