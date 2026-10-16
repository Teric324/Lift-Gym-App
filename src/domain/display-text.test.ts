import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { plainLetters } from './display-text';

describe('plainLetters', () => {
  it('strips the Romanian diacritics, comma and cedilla forms alike', () => {
    expect(plainLetters('ș ț ă î â Ș Ț Ă Î Â')).toBe('s t a i a S T A I A');
    expect(plainLetters('ş ţ Ş Ţ')).toBe('s t S T'); // cedilla forms
    expect(plainLetters('Împingere cu bară, tracțiuni și îndreptări')).toBe(
      'Impingere cu bara, tractiuni si indreptari',
    );
  });

  it('works on decomposed input too', () => {
    expect(plainLetters('șțăî')).toBe('stai');
  });

  it('strips other combining marks and handles letters Unicode does not decompose', () => {
    expect(plainLetters('Crème brûlée ñ ü ö é')).toBe('Creme brulee n u o e');
    expect(plainLetters('Straße Øl Łódź Đ œ')).toBe('Strasse Ol Lodz D oe');
  });

  it('leaves plain text, digits, punctuation and emoji alone', () => {
    expect(plainLetters('Bench press 2.5 kg - Push/Pull!')).toBe('Bench press 2.5 kg - Push/Pull!');
    expect(plainLetters('')).toBe('');
    expect(plainLetters('Day 💪')).toBe('Day 💪');
  });
});

describe('display font usage', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
    });
  }

  it('only the page titles (h1 in theme.css) use the display font', () => {
    const cssFiles = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return cssFiles(path);
        return name.endsWith('.css') ? [path] : [];
      });
    const users = cssFiles('src')
      .filter((file) => /--font-display|Black Ops One/.test(readFileSync(file, 'utf8')))
      .sort();
    expect(users).toEqual(['src/app/fonts.css', 'src/app/theme.css']);
    const theme = readFileSync('src/app/theme.css', 'utf8');
    expect(theme.match(/font-family: var\(--font-display\)/g)).toHaveLength(1);
    expect(theme).toMatch(/h1 \{[^}]*font-family: var\(--font-display\)/);
  });

  it('every page title goes through DisplayTitle: no raw <h1> in the screens', () => {
    const offenders = sourceFiles('src')
      .filter((file) => !file.endsWith('DisplayTitle.tsx'))
      .filter((file) => /<h1[\s>]/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
