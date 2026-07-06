import { defineConfig } from 'vite';

// base: './' keeps asset paths relative so the build works on GitHub Pages
// project subpaths without extra configuration.
export default defineConfig({
  base: './',
});
