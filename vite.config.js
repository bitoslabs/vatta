import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Both pages are real entry points. Keeping the lab in the build catches broken
// character imports before shipping and leaves it usable on the production site.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        lab: resolve(import.meta.dirname, 'character-lab.html'),
      },
    },
  },
});
