import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ordenar } from '../../lib/blog';

function escapeXml(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rfc822(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 15, 0, 0)).toUTCString();
}

export const GET: APIRoute = async () => {
  const entradas = ordenar(await getCollection('blog')).slice(0, 40);
  const items = entradas
    .map((entrada) => {
      const link = new URL(`/${entrada.data.slug}/`, 'https://javiermorodo.com').toString();
      const imagen = entrada.data.image
        ? `\n      <enclosure url="${escapeXml(new URL(entrada.data.image, 'https://javiermorodo.com').toString())}" type="image/webp" />`
        : '';
      return `    <item>
      <title>${escapeXml(entrada.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(entrada.data.date)}</pubDate>
      <description>${escapeXml(entrada.data.description)}</description>${imagen}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog de Javier Morodo</title>
    <link>https://javiermorodo.com/blog/</link>
    <description>Ideas, tesis y análisis de mercado.</description>
    <language>es-mx</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
