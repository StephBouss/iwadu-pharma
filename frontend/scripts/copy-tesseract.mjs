// Copie le moteur de lecture de texte (Tesseract) et la langue française dans
// public/tesseract : servis par le site lui-même (« worker-src 'self' »),
// téléchargés une seule fois par le téléphone, et seulement quand un patient
// fait lire une photo. Aucun service extérieur. Lancé avant `dev` et `build`.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../public/tesseract');

const tesseractDir = dirname(require.resolve('tesseract.js/package.json'));
const coreDir = dirname(
  createRequire(resolve(tesseractDir, 'package.json')).resolve('tesseract.js-core/package.json'),
);
const langDir = resolve(
  dirname(require.resolve('@tesseract.js-data/fra/package.json')),
  '4.0.0_best_int',
);

mkdirSync(resolve(target, 'lang'), { recursive: true });
copyFileSync(resolve(tesseractDir, 'dist/worker.min.js'), resolve(target, 'worker.min.js'));
// Moteur LSTM seul (le mode utilisé), dans ses variantes selon le processeur.
for (const file of readdirSync(coreDir)) {
  if (
    /^tesseract-core.*-lstm\.(js|wasm|wasm\.js)$/.test(file) ||
    /^tesseract-core-lstm\./.test(file)
  ) {
    copyFileSync(resolve(coreDir, file), resolve(target, file));
  }
}
copyFileSync(resolve(langDir, 'fra.traineddata.gz'), resolve(target, 'lang/fra.traineddata.gz'));
