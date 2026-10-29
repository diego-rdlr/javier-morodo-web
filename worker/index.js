// Dominio canónico: todo lo que llegue por un alias redirige 301 a javiermorodo.com.
// Las URLs *.workers.dev (producción y previews) y localhost se sirven tal cual.
const CANONICO = 'javiermorodo.com';
const ALIAS = new Set(['www.javiermorodo.com', 'web.javiermorodo.com', 'javiermorodo.revolution.inc']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (ALIAS.has(url.hostname)) {
      url.hostname = CANONICO;
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
