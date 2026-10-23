# javier-morodo-web

Sitio de **Javier Morodo** (javiermorodo.revolution.inc). Astro estático servido por el Worker
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
- **Manual:** `npx wrangler login && npm run deploy`.

## Estructura

```
src/
  styles/global.css        tokens del Figma (colores, tipografía, layout) + utilidades
  layouts/Base.astro       <head>, SEO, fuentes
  components/ui/           Boton, Chip, EncabezadoSeccion (componentes del Figma)
  components/sections/     una sección por archivo, en orden del Figma
  assets/img/              imágenes exportadas del Figma (Astro las optimiza a WebP)
public/                    favicon, _headers
```

## Tipografía

- Titulares: **Feature Display Light** (Commercial Type), en `public/fonts/` como WOFF2 con subset latino,
  generado de los TTF del Drive de Revolution (carpeta *Fuentes › Feature*).
- Texto: **Geist** y **Geist Mono**; serif de apoyo: **Source Serif 4** (vía `@fontsource-variable`).
