// Dominio canónico: los alias (www, etc.) redirigen 301 a javiermorodo.com.
// Las URLs *.workers.dev (previews) y localhost se sirven en el mismo host.
// Las redirecciones SEO del WordPress viven aquí porque public/_redirects
// no se aplica con run_worker_first + ASSETS.fetch en este Worker.
// Solo el handler por defecto: workerd rechaza otros exports en el módulo principal
// ("Incorrect type for map entry") y el Worker no arranca.
import { resolveRedirect } from './redirects.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const destino = resolveRedirect(url);
    if (destino) {
      return Response.redirect(destino, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
