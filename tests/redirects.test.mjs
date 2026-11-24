import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PATH_REDIRECTS, SHORTLINKS } from '../worker/redirects-data.js';
import { pathRedirect, resolveRedirect } from '../worker/redirects.js';
import worker from '../worker/index.js';

const publishedSlugs = new Set();
for (const archivo of readdirSync(new URL('../src/content/blog', import.meta.url)).filter((f) => f.endsWith('.md'))) {
  const cuerpo = readFileSync(new URL(`../src/content/blog/${archivo}`, import.meta.url), 'utf8');
  const slug = cuerpo.match(/^slug: "([^"]+)"/m)?.[1];
  assert.ok(slug, archivo);
  publishedSlugs.add(slug);
}
assert.equal(publishedSlugs.size, 186);
assert.equal(Object.keys(SHORTLINKS).length, 186);

test('ningún slug canónico vigente está en el mapa de redirecciones', () => {
  for (const slug of publishedSlugs) {
    assert.equal(PATH_REDIRECTS[`/${slug}`], undefined, slug);
    assert.equal(pathRedirect(`/${slug}/`, new URLSearchParams()), null, slug);
    assert.equal(pathRedirect(`/${slug}`, new URLSearchParams()), null, slug);
  }
});

test('public/_redirects no reescribe slugs canónicos ni /blog', async () => {
  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  assert.equal(/^\/blog\s/m.test(redirects), false);
  for (const slug of publishedSlugs) {
    assert.equal(new RegExp(`^/${slug}/?\\s`, 'm').test(redirects), false, slug);
  }
});

test('slugs antiguos, páginas, feeds y sitemaps redirigen al destino correcto', () => {
  const casos = [
    ['/filosofia-y-codigo/', '/aristoteles-smartphone/'],
    ['/filosofia-y-codigo', '/aristoteles-smartphone/'],
    ['/crypto', '/crypto-internet-valor/'],
    ['/los-libros-que-definieron-mi-2024/', '/los-libros-que-definieron-mi-2025/'],
    ['/LOS-LIBROS-QUE-DEFINIERON-MI-2024/', '/los-libros-que-definieron-mi-2025/'],
    ['/conferencias/', '/#conferencias'],
    ['/conferencias', '/#conferencias'],
    ['/riqueza360/', '/#libro'],
    ['/inversiones/lista', '/#inversiones'],
    ['/toolkit/', '/'],
    ['/feed/', '/blog/feed.xml'],
    ['/feed', '/blog/feed.xml'],
    ['/comments/feed/', '/blog/feed.xml'],
    ['/sitemap_index.xml', '/sitemap.xml'],
    ['/post-sitemap.xml', '/sitemap.xml'],
    ['/wp-sitemap.xml', '/sitemap.xml'],
    ['/blog/page/2/', '/blog/pagina/2/'],
    ['/blog/page/2', '/blog/pagina/2/'],
    ['/page/3/', '/blog/pagina/3/'],
    ['/page/1/', '/blog/'],
    ['/blog/page/1', '/blog/'],
    ['/category/inversion/page/2/', '/category/inversion/pagina/2/'],
    ['/category/inversion/page/1/', '/category/inversion/'],
    ['/tag/dinero/', '/blog/'],
    ['/tag/dinero', '/blog/'],
    ['/tag/', '/blog/'],
    ['/author/javiermtzmorodo/', '/blog/'],
    ['/author/Jess', '/blog/'],
    ['/author/', '/blog/'],
  ];
  for (const [from, to] of casos) {
    assert.equal(pathRedirect(from, new URLSearchParams()), to, from);
  }
});

test('shortlinks /?p=ID redirigen al slug y no se aplican sobre un post', () => {
  assert.equal(pathRedirect('/', new URLSearchParams('p=272')), '/trabajo-inteligente/');
  assert.equal(pathRedirect('/', new URLSearchParams('p=5443')), '/los-libros-que-definieron-mi-2025/');
  assert.equal(pathRedirect('/', new URLSearchParams('p=3363')), null);
  assert.equal(pathRedirect('/trabajo-inteligente/', new URLSearchParams('p=272')), null);
});

test('todos los shortlinks publicados tienen destino canónico', () => {
  for (const [id, slug] of Object.entries(SHORTLINKS)) {
    assert.equal(publishedSlugs.has(slug), true, `${id} ${slug}`);
    assert.equal(pathRedirect('/', new URLSearchParams(`p=${id}`)), `/${slug}/`);
  }
});

test('en preview se conserva el host; en www se unifica al canónico', () => {
  const preview = resolveRedirect(new URL('https://javier-morodo-web-preview.romeo-8d3.workers.dev/conferencias/'));
  assert.equal(preview, 'https://javier-morodo-web-preview.romeo-8d3.workers.dev/#conferencias');

  const www = resolveRedirect(new URL('https://www.javiermorodo.com/conferencias/'));
  assert.equal(www, 'https://javiermorodo.com/#conferencias');

  const wwwPost = resolveRedirect(new URL('https://www.javiermorodo.com/trabajo-inteligente/'));
  assert.equal(wwwPost, 'https://javiermorodo.com/trabajo-inteligente/');

  const canonPost = resolveRedirect(new URL('https://javiermorodo.com/trabajo-inteligente/'));
  assert.equal(canonPost, null);

  const shortWww = resolveRedirect(new URL('https://www.javiermorodo.com/?p=272'));
  assert.equal(shortWww, 'https://javiermorodo.com/trabajo-inteligente/');
});

test('el Worker responde 301 y deja pasar el resto a ASSETS', async () => {
  const assets = {
    fetch: async () => new Response('ok', { status: 200, headers: { 'x-assets': '1' } }),
  };
  const redir = await worker.fetch(new Request('https://javiermorodo.com/feed/'), { ASSETS: assets });
  assert.equal(redir.status, 301);
  assert.equal(redir.headers.get('location'), 'https://javiermorodo.com/blog/feed.xml');

  const passthrough = await worker.fetch(new Request('https://javiermorodo.com/trabajo-inteligente/'), { ASSETS: assets });
  assert.equal(passthrough.status, 200);
  assert.equal(passthrough.headers.get('x-assets'), '1');
  assert.equal(await passthrough.text(), 'ok');
});
