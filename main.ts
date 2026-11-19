// Neon Coast Cover Lab — entrypoint for the make.fun dossier build.
// Node 22+ standard library only. Copies app/ and screenshots/ into the
// output directory, then writes dossier.json with the kit's buildDossier.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const ROOT = resolve(import.meta.dirname);
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// The dossier caps come from the competition's gate (see kit RULES.txt):
// text at most 160 KiB, at most 4 screenshots of 256 KiB each, app at most
// 993 files / 48 MiB, every path at most 1000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTree(name: string): void {
  const from = join(ROOT, name);
  const to = join(OUT, name);
  if (!existsSync(from)) {
    throw new Error(`missing ${name}/ — nothing to copy into the output`);
  }
  cpSync(from, to, { recursive: true });
}

mkdirSync(OUT, { recursive: true });
copyTree('app');
copyTree('screenshots');

// Light validation before the dossier is built: the gate needs 3–4
// screenshots, each at most 256 KiB, or the entry is rejected outright.
import { readdirSync, statSync } from 'node:fs';
const shotDir = join(OUT, 'screenshots');
const shots = readdirSync(shotDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3–4 screenshots, found ${shots.length}`);
}
for (const f of shots) {
  const bytes = statSync(join(shotDir, f)).size;
  if (bytes > 262144) throw new Error(`screenshot ${f} is ${bytes} bytes (max 262144)`);
}
console.log(`screenshots ok: ${shots.length} files (${shots.join(', ')})`);

const dossier = buildDossier(OUT, CAPS);
writeFileSync(join(OUT, 'dossier.json'), dossier);
console.log(`dossier written: ${join(OUT, 'dossier.json')} (${dossier.length} bytes)`);
