import { en } from '../../i18n/en';

// Replaced by the real home screen (workout list) in a later step.
export function HomePlaceholder() {
  return (
    <section>
      <h1>{en.home.title}</h1>
      <p>{en.home.placeholder}</p>
    </section>
  );
}
