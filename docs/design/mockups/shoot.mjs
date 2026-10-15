// Renders the mockup pages to PNG with headless Edge. Run: node shoot.mjs [name ...]
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
mkdirSync(join(dir, 'shots'), { recursive: true });

const pages = {
  workouts: [375, 880],
  workout: [375, 1350],
  picker: [375, 812],
  'picker-landscape': [812, 375],
  history: [375, 1000],
  exercises: [375, 1000],
  palette: [1120, 1560],
  brand: [1120, 1230],
  specimen: [1060, 1230],
  'lift-prototype': [520, 900],
};

const only = process.argv.slice(2);
for (const [name, [w, h]] of Object.entries(pages)) {
  if (only.length && !only.includes(name)) continue;
  const out = join(dir, 'shots', `${name}.png`);
  execFileSync(edge, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${join(dir, 'edge-profile')}`,
    '--force-device-scale-factor=2',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    pathToFileURL(join(dir, `${name}.html`)).href,
  ], { stdio: 'pipe' });
  console.log('ok', name);
}
