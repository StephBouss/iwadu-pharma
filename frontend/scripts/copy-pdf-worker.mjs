// Copie le « worker » de pdf.js dans public/ : il est servi par le site
// lui-même (politique de sécurité « worker-src 'self' ») et chargé seulement
// quand un patient importe un PDF. Lancé avant `dev` et `build`.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(
  dirname(require.resolve('pdfjs-dist/package.json')),
  'build/pdf.worker.min.mjs',
);
const target = resolve(here, '../public/pdfjs/pdf.worker.min.mjs');
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
