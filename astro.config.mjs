// @ts-check
import { defineConfig } from 'astro/config';

// Sitio 100% estático: `astro build` genera ./dist y el Worker
// `javier-morodo-web` lo sirve como static assets (ver wrangler.jsonc).
export default defineConfig({
  site: 'https://javiermorodo.com',
  build: { inlineStylesheets: 'auto' },
});
