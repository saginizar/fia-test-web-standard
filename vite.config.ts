import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served from GitHub Pages as a project site: https://saginizar.github.io/fia-test-web-standard/
  base: '/fia-test-web-standard/',
});
