# javier-morodo-web

Sitio de **Javier Morodo** (javiermorodo.com). Astro estático servido por el Worker
`javier-morodo-web` de Cloudflare (static assets).

- Diseño: [Figma · sitioweb-javier-morodo](https://www.figma.com/design/NR6yhNFUePRWlj1MgYWSmz/sitioweb-javier-morodo--Copy-?node-id=0-1)
- Una sola página (`src/pages/index.astro`) armada con 17 secciones en `src/components/sections/`,
  numeradas igual que los frames del Figma (`01-Hero.astro` … `17-Footer.astro`).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera ./dist
npm run preview    # build + wrangler dev (igual que en Cloudflare)
```

## Deploy (Cloudflare Workers)

`wrangler.jsonc` apunta al Worker `javier-morodo-web` y sirve `./dist` como assets.

- **Automático (recomendado):** en el dashboard de Cloudflare → Workers → `javier-morodo-web`
  → Settings → Builds, conecta este repo con
  - Build command: `npm run build`
  - Deploy command: `npx wrangler deploy`
  - Rama de producción: `main` (las demás ramas generan versiones de preview).
  - Node: **22.22.0+** (lo exige Astro 7). Cloudflare lo toma de `.node-version`.
- **Manual:** `npx wrangler login && npm run deploy`.

## Dominios

- Canónico: **javiermorodo.com**. `worker/index.js` redirige con 301 los alias
  (`www.`, `web.javiermorodo.com`, `javiermorodo.revolution.inc`) al canónico; `*.workers.dev` se sirve tal cual.
- `public/_redirects` manda las URLs del WordPress anterior a su sección (`/conferencias/` → `/#conferencias`)
  y los posts del blog a Substack, para no perder el SEO.
- SEO: metadatos, Open Graph (`public/og.jpg`, 1200×630) y JSON-LD en `src/layouts/Base.astro`;
  `public/robots.txt` y `public/sitemap.xml`.

## Episodios del podcast

El panel "Últimos episodios" sale de `src/data/episodios.json`. La GitHub Action
`.github/workflows/episodios.yml` corre a diario (6:17 am CDMX) `npm run episodios`, que lee el playlist
público "Revolución de la Riqueza PODCAST" en YouTube y, si algo cambió, hace commit a `main`; eso dispara el deploy.
También se puede correr a mano desde la pestaña *Actions* (*Run workflow*) o localmente con `npm run episodios`.

## Estructura

```
src/
  styles/global.css        tokens del Figma (colores, tipografía, layout) + utilidades
  layouts/Base.astro       <head>, SEO, fuentes
  components/ui/           Boton, Chip, EncabezadoSeccion (componentes del Figma)
  components/sections/     una sección por archivo, en orden del Figma
  assets/img/              imágenes exportadas del Figma (Astro las optimiza a WebP)
public/                    favicon, og.jpg, _headers, _redirects, robots.txt, sitemap.xml
worker/index.js            redirección de dominios alias → javiermorodo.com
```

## Tipografía

- Titulares: **Feature Display Light** (Commercial Type), en `public/fonts/` como WOFF2 con subset latino,
  generado de los TTF del Drive de Revolution (carpeta *Fuentes › Feature*).
- Texto: **Geist** y **Geist Mono**; serif de apoyo: **Source Serif 4** (vía `@fontsource-variable`).
