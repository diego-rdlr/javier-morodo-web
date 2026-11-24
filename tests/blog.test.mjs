import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

test('el archivo trae los 186 artículos publicados y no depende del staging', async () => {
  const manifiesto = JSON.parse(await readFile(new URL('../src/data/blog-manifest.json', import.meta.url), 'utf8'));
  const archivos = (await readdir(new URL('../src/content/blog', import.meta.url))).filter((f) => f.endsWith('.md'));
  assert.equal(archivos.length, 186);
  assert.equal(manifiesto.publicados, 186);
  assert.equal(manifiesto.borradoresOmitidos, 4);

  const slugs = new Set();
  for (const archivo of archivos) {
    const cuerpo = await readFile(new URL(`../src/content/blog/${archivo}`, import.meta.url), 'utf8');
    assert.equal(cuerpo.includes('wpcomstaging.com'), false, archivo);
    const slug = cuerpo.match(/^slug: "([^"]+)"/m)?.[1];
    assert.ok(slug, archivo);
    slugs.add(slug);
    assert.equal(cuerpo.includes('title:'), true);
    assert.equal(cuerpo.includes('date:'), true);
  }
  assert.equal(slugs.size, 186);

  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  assert.equal(/^\/blog\s/m.test(redirects), false);
  for (const slug of slugs) {
    assert.equal(new RegExp(`^/${slug}/?\\s`, 'm').test(redirects), false, slug);
  }
});
