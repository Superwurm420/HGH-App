import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    '.next/**',
    '.open-next/**',
    'build/**',
    'next-env.d.ts',
    // von scripts/prebuild.mjs erzeugt bzw. aus node_modules kopiert
    'public/pdfjs/**',
    'public/sw.js',
  ]),
]);
