# javier-morodo-web

Sitio de Javier Morodo. Astro 7 estático → Worker de Cloudflare `javier-morodo-web` (ver README).

- Fuente de verdad del diseño: Figma `NR6yhNFUePRWlj1MgYWSmz`, página `JavierMorodo_SitioWeb`,
  frame `2:2` (1440 px, márgenes de 80). Cada sección de `src/components/sections/` lleva en su
  comentario el node id del frame del Figma.
- Sin Tailwind ni frameworks de UI: CSS con scope por componente y los tokens de `src/styles/global.css`
  (nombres alineados a las variables del Figma). Reusa `components/ui/` antes de crear algo nuevo.
- Copy en español de México, con acentos; textos tal cual el Figma salvo que se pida cambiarlos.
- Imágenes en `src/assets/img/` vía `astro:assets` `<Image>`; nunca URLs temporales de figma.com.
- Antes de dar algo por terminado: `npm run build` sin errores y revisar a 1440 y 390 px.
- `main` despliega a producción: trabaja en rama y abre PR.
