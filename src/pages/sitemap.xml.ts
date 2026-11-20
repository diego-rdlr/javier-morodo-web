import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { categoriasDe, ordenar, totalPaginas } from '../lib/blog';

function loc(ruta: string) {
  return new URL(ruta, 'https://javiermorodo.com').toString();
}

function url(ruta: string, opts: { lastmod?: string; priority: string }) {
  const lastmod = opts.lastmod ? `\n    <lastmod>${opts.lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc(ruta)}</loc>${lastmod}\n    <priority>${opts.priority}</priority>\n  </url>`;
}

export const GET: APIRoute = async () => {
  const entradas = ordenar(await getCollection('blog'));
  const bloques = [
    url('/', { priority: '1.0' }),
    url('/blog/', { priority: '0.8', lastmod: entradas[0]?.data.date }),
  ];

  const paginasBlog = totalPaginas(entradas.length);
  for (let n = 2; n <= paginasBlog; n++) bloques.push(url(`/blog/pagina/${n}/`, { priority: '0.5' }));

  for (const cat of categoriasDe(entradas)) {
    const deLaCat = entradas.filter((e) => e.data.categories.some((c) => c.slug === cat.slug));
    bloques.push(url(`/category/${cat.slug}/`, { priority: '0.4', lastmod: deLaCat[0]?.data.date }));
    const paginas = totalPaginas(deLaCat.length);
    for (let n = 2; n <= paginas; n++) bloques.push(url(`/category/${cat.slug}/pagina/${n}/`, { priority: '0.3' }));
  }

  for (const entrada of entradas) {
    bloques.push(url(`/${entrada.data.slug}/`, { priority: '0.6', lastmod: entrada.data.date }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${bloques.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
