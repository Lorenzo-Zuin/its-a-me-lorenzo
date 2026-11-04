// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Sito statico: ogni pagina è HTML pronto, le isole React si caricano solo dove servono.
export default defineConfig({
  site: 'https://lorenzozuin.com',
  output: 'static',
  integrations: [react()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
