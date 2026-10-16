// The display font (Black Ops One) has no accented letters, so text set in it is shown without
// diacritics. Only the displayed text changes; the stored data keeps its diacritics.

/** Letters that Unicode decomposition does not split into base letter + mark. */
const EXTRA: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ø: 'o',
  Ø: 'O',
  đ: 'd',
  Đ: 'D',
  ð: 'd',
  Ð: 'D',
  ł: 'l',
  Ł: 'L',
  ħ: 'h',
  Ħ: 'H',
  ı: 'i',
};

const EXTRA_PATTERN = new RegExp(`[${Object.keys(EXTRA).join('')}]`, 'g');

/**
 * `Școală țării` -> `Scoala tarii`: letters without diacritics, for text in the display font.
 * Covers the comma and cedilla forms of ș ț (ş ţ), ă â î, and any other combining mark.
 */
export function plainLetters(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(EXTRA_PATTERN, (letter) => EXTRA[letter] ?? letter)
    .normalize('NFC');
}
