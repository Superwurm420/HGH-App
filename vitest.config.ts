import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // configDefaults dazunehmen — ein eigenes exclude ersetzt sie sonst,
    // und Tests aus node_modules landen im Lauf.
    exclude: [...configDefaults.exclude, '.next/**', '.open-next/**', '.wrangler/**'],
  },
});
