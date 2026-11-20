/**
 * Convierte el export WXR de WordPress en la content collection `blog`
 * y descarga las imágenes a public/blog/media (WebP, máx. 1600 px).
 *
 *   node scripts/importar-blog.mjs [ruta-al.wxr]
 *
 * No publica borradores. Los slugs publicados dejan de redirigir a Substack.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const WXR =
  process.argv[2] ||
  process.env.BLOG_WXR ||
  '/home/ubuntu/.cursor/projects/workspace/uploads/javiermorodo.WordPress.2026-11-17_2522.xml';
const DIR_POSTS = path.join(RAIZ, 'src/content/blog');
const DIR_MEDIA = path.join(RAIZ, 'public/blog/media');
const REDIRECTS = path.join(RAIZ, 'public/_redirects');

const RESERVADOS = new Set([
  'blog',
  'category',
  'feed',
  'pagina',
  'sitemap',
  'robots',
  '404',
  'index',
  'favicon',
  'fonts',
  '_astro',
]);

const PAGINAS = {
  conferencias: '/#conferencias',
  educacion: '/#educacion',
  contacto: '/#contacto',
  riqueza360: '/#libro',
  'riqueza-360-cuerpo-mente-y-espiritu': '/#libro',
  contenido: '/#contenido',
  podcasts: '/#podcast',
  inversiones: '/#inversiones',
  biografia: '/#sobre-javier',
  newsletter: '/#boletin',
  toolkit: '/',
  'bienvenido-wm': '/',
  'payment-failed': '/',
  'payment-confirmation': '/',
};

const HOSTS_LOCALES = new Set(['javiermorodo.wpcomstaging.com', 'javiermorodo.com', 'www.javiermorodo.com']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: false,
  processEntities: true,
  isArray: (tag) => tag === 'item' || tag === 'category' || tag === 'wp:postmeta',
});

function texto(valor) {
  if (valor == null) return '';
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor);
  if (typeof valor === 'object' && '#text' in valor) return String(valor['#text'] ?? '');
  return '';
}

function decodificar(valor) {
  return valor
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function plano(html) {
  return decodificar(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function yaml(valor) {
  return JSON.stringify(valor);
}

function clave(url) {
  const limpio = decodificar(url.trim());
  try {
    const u = new URL(limpio);
    u.hash = '';
    if (HOSTS_LOCALES.has(u.hostname) || u.pathname.includes('/wp-content/')) u.search = '';
    return u.toString();
  } catch {
    return limpio;
  }
}

function originalDe(url) {
  return url.replace(/-\d+x\d+(?=\.(?:jpe?g|png|gif|webp)$)/i, '');
}

function nombreArchivo(url, ext) {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
  const base = decodeURIComponent(url.split('/').pop() || 'imagen').replace(/\.[^.]+$/, '');
  const seguro = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${hash}-${seguro || 'imagen'}.${ext}`;
}

async function descargar(url) {
  let ultimo;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; javier-morodo-web/1.0; +https://javiermorodo.com)' },
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      ultimo = error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw ultimo;
}

async function optimizar(buf) {
  const imagen = sharp(buf, { failOn: 'none', animated: false, limitInputPixels: false }).rotate();
  const meta = await imagen.metadata();
  if (meta.format === 'svg') {
    return { ext: 'svg', buf, width: meta.width || 0, height: meta.height || 0 };
  }
  const salida = await imagen
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const info = await sharp(salida).metadata();
  return { ext: 'webp', buf: salida, width: info.width || 0, height: info.height || 0 };
}

function metaDe(item) {
  const mapa = {};
  for (const meta of item['wp:postmeta'] || []) {
    mapa[texto(meta['wp:meta_key'])] = texto(meta['wp:meta_value']);
  }
  return mapa;
}

function terminos(item, dominio) {
  return (item.category || [])
    .filter((c) => c['@_domain'] === dominio)
    .map((c) => ({ nombre: texto(c['#text'] || c).trim(), slug: (c['@_nicename'] || '').trim() }))
    .filter((c) => c.nombre && c.slug);
}

function asegurarParrafos(html) {
  return html
    .trim()
    .split(/\n{2,}/)
    .map((bloque) => {
      const t = bloque.trim();
      if (!t) return '';
      if (/<(?:p|ul|ol|h[1-6]|blockquote|figure|div|table|pre|hr|iframe)\b/i.test(t)) return t;
      return `<p>${t}</p>`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function limpiarHtml(html) {
  return html
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_, inner) => {
      const img = inner.match(/<img\b[^>]*>/i);
      const resto = plano(inner.replace(/<img\b[^>]*>/i, ''));
      if (!img) return inner;
      return `<figure>${img[0]}${resto ? `<figcaption>${resto}</figcaption>` : ''}</figure>`;
    })
    .replace(/\[embed\]([\s\S]*?)\[\/embed\]/gi, (_, url) => {
      const limpio = url.trim();
      const yt = limpio.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
      if (yt) {
        return `<figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video de YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>`;
      }
      return `<p><a href="${limpio}">${limpio}</a></p>`;
    })
    .replace(/\[\/?[a-z][^\]]*\]/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\s(?:srcset|sizes|data-src|data-srcset|data-lazy-src|data-orig-file|data-orig-size|data-medium-file|data-large-file)=("[^"]*"|'[^']*')/gi, '');
}

function atributo(etiqueta, nombre) {
  const m = etiqueta.match(new RegExp(`\\s${nombre}\\s*=\\s*("|\')([\\s\\S]*?)\\1`, 'i'));
  return m ? decodificar(m[2]) : '';
}

function reescribirEnlace(href, slugs, ids, medios) {
  const limpio = decodificar(href.trim());
  if (!limpio || limpio.startsWith('#') || limpio.startsWith('mailto:') || limpio.startsWith('tel:')) return limpio;
  let url;
  try {
    url = new URL(limpio, 'https://javiermorodo.wpcomstaging.com');
  } catch {
    return limpio;
  }
  if (!HOSTS_LOCALES.has(url.hostname)) return limpio;

  const medio = medios.get(clave(url.toString()));
  if (medio) return medio.src;

  const id = url.searchParams.get('p');
  if (id && ids.get(id)) return `/${ids.get(id)}/`;

  const partes = url.pathname.split('/').filter(Boolean);
  if (partes.length === 0) return '/';
  if (partes[0] === 'category' && partes[1]) return `/category/${partes[1]}/`;
  if (partes[0] === 'tag') return '/blog/';
  if (partes[0] === 'blog') return '/blog/';
  if (partes[0] === 'feed') return '/blog/feed.xml';

  const ultimo = partes.at(-1);
  if (slugs.has(ultimo)) return `/${ultimo}/`;
  if (partes.length === 2 && partes[0] === 'inversiones' && partes[1] === 'lista') return '/#inversiones';
  if (PAGINAS[ultimo]) return PAGINAS[ultimo];
  if (PAGINAS[partes[0]] && partes.length === 1) return PAGINAS[partes[0]];
  return '/blog/';
}

function bloqueLista(nombre, filas) {
  if (!filas.length) return [`${nombre}: []`];
  return [`${nombre}:`, ...filas];
}

function frontmatter(post) {
  const lineas = [
    '---',
    `title: ${yaml(post.title)}`,
    `description: ${yaml(post.description)}`,
    `date: ${yaml(post.date)}`,
    `slug: ${yaml(post.slug)}`,
    `wpId: ${post.wpId}`,
    ...bloqueLista(
      'categories',
      post.categories.flatMap((c) => [`  - nombre: ${yaml(c.nombre)}`, `    slug: ${yaml(c.slug)}`]),
    ),
    ...bloqueLista(
      'tags',
      post.tags.map((t) => `  - ${yaml(t)}`),
    ),
  ];
  if (post.image) {
    lineas.push(`image: ${yaml(post.image.src)}`);
    if (post.image.alt) lineas.push(`imageAlt: ${yaml(post.image.alt)}`);
    if (post.image.width) lineas.push(`imageWidth: ${post.image.width}`);
    if (post.image.height) lineas.push(`imageHeight: ${post.image.height}`);
  }
  lineas.push('---', '');
  return `${lineas.join('\n')}\n`;
}

async function main() {
  const xml = await readFile(WXR, 'utf8');
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item || [];
  console.log(`WXR: ${items.length} ítems`);

  const adjuntos = new Map();
  const publicaciones = [];
  let borradores = 0;

  for (const item of items) {
    const tipo = texto(item['wp:post_type']);
    const estado = texto(item['wp:status']);
    if (tipo === 'attachment') {
      const id = texto(item['wp:post_id']);
      const url = texto(item['wp:attachment_url']);
      const alt = metaDe(item)._wp_attachment_image_alt || texto(item.title);
      if (id && url) adjuntos.set(id, { url, alt });
      continue;
    }
    if (tipo !== 'post') continue;
    if (estado !== 'publish') {
      borradores += 1;
      continue;
    }
    const slug = texto(item['wp:post_name']).trim();
    if (!slug || RESERVADOS.has(slug)) throw new Error(`Slug no utilizable: ${slug || '(vacío)'}`);
    const meta = metaDe(item);
    const categorias = terminos(item, 'category');
    const etiquetas = terminos(item, 'post_tag').map((t) => t.nombre);
    const titulo = plano(texto(item.title)) || slug;
    const yoast = plano(meta._yoast_wpseo_metadesc || '');
    const extracto = plano(texto(item['excerpt:encoded']));
    const htmlCrudo = texto(item['content:encoded']);
    const html = asegurarParrafos(limpiarHtml(htmlCrudo));
    const descripcion = (yoast || extracto || plano(html)).slice(0, yoast ? 300 : 180).trim();
    const fecha = texto(item['wp:post_date']).trim().replace(' ', 'T');
    publicaciones.push({
      slug,
      title: titulo,
      description: descripcion || titulo,
      date: fecha,
      wpId: Number(texto(item['wp:post_id'])),
      categories: categorias,
      tags: etiquetas,
      html,
      thumbId: meta._thumbnail_id || '',
    });
  }

  if (publicaciones.length !== 186) {
    throw new Error(`Se esperaban 186 publicados y hay ${publicaciones.length}`);
  }

  const slugs = new Set(publicaciones.map((p) => p.slug));
  const ids = new Map(publicaciones.map((p) => [String(p.wpId), p.slug]));

  const urls = new Set();
  for (const post of publicaciones) {
    const thumb = adjuntos.get(post.thumbId);
    if (thumb) urls.add(clave(thumb.url));
    for (const src of post.html.matchAll(/<img\b[^>]*\ssrc\s*=\s*("([^"]+)"|'([^']+)')/gi)) {
      urls.add(clave(src[2] || src[3]));
    }
    for (const href of post.html.matchAll(/href\s*=\s*("([^"]+)"|'([^']+)')/gi)) {
      const destino = decodificar(href[2] || href[3]);
      if (/\/wp-content\/uploads\//.test(destino)) urls.add(clave(destino));
    }
  }

  await mkdir(DIR_MEDIA, { recursive: true });
  await mkdir(DIR_POSTS, { recursive: true });

  const medios = new Map();
  const fallidas = [];
  const lista = [...urls];
  let hechas = 0;

  async function una(url) {
    const alternativas = [url];
    const sinMedida = originalDe(url);
    if (sinMedida !== url) alternativas.push(sinMedida);
    let ultimo;
    for (const candidato of alternativas) {
      try {
        const buf = await descargar(candidato);
        const esImagen = /\.(?:jpe?g|png|gif|webp|svg|avif)(?:$|\?)/i.test(candidato) || buf[0] === 0xff || buf[0] === 0x89;
        if (!esImagen && !/\.(?:jpe?g|png|gif|webp|svg)/i.test(candidato)) {
          const ext = (candidato.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
          const nombre = nombreArchivo(candidato, ext);
          await writeFile(path.join(DIR_MEDIA, nombre), buf);
          const ref = { src: `/blog/media/${nombre}`, width: 0, height: 0, alt: '' };
          medios.set(url, ref);
          medios.set(candidato, ref);
          return;
        }
        const out = await optimizar(buf);
        const nombre = nombreArchivo(url, out.ext);
        await writeFile(path.join(DIR_MEDIA, nombre), out.buf);
        const ref = { src: `/blog/media/${nombre}`, width: out.width, height: out.height, alt: '' };
        medios.set(url, ref);
        medios.set(candidato, ref);
        return;
      } catch (error) {
        ultimo = error;
      }
    }
    fallidas.push({ url, error: String(ultimo?.message || ultimo) });
  }

  const cola = [...lista];
  const trabajadores = Array.from({ length: 6 }, async () => {
    while (cola.length) {
      const url = cola.shift();
      if (!url) break;
      await una(url);
      hechas += 1;
      if (hechas % 25 === 0) console.log(`medios ${hechas}/${lista.length}`);
    }
  });
  await Promise.all(trabajadores);
  console.log(`medios listos ${medios.size} claves, fallidas ${fallidas.length}`);

  for (const [id, adj] of adjuntos) {
    const ref = medios.get(clave(adj.url));
    if (ref && adj.alt) ref.alt = adj.alt;
    void id;
  }

  for (const post of publicaciones) {
    const thumb = adjuntos.get(post.thumbId);
    post.image = thumb ? medios.get(clave(thumb.url)) : undefined;
    if (post.image && thumb?.alt) post.image = { ...post.image, alt: thumb.alt };

    let html = post.html.replace(/<img\b[^>]*>/gi, (etiqueta) => {
      const src = atributo(etiqueta, 'src');
      const ref = medios.get(clave(src));
      if (!ref) {
        if (HOSTS_LOCALES.has(safeHost(src))) return '';
        return etiqueta;
      }
      const alt = atributo(etiqueta, 'alt') || post.image?.alt || '';
      const ancho = ref.width ? ` width="${ref.width}"` : '';
      const alto = ref.height ? ` height="${ref.height}"` : '';
      return `<img src="${ref.src}"${ancho}${alto} alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async">`;
    });

    html = html.replace(/href=(["'])([\s\S]*?)\1/gi, (m, q, href) => {
      const nuevo = reescribirEnlace(href, slugs, ids, medios);
      return `href=${q}${nuevo}${q}`;
    });
    html = html.replace(/\sdata-(?:id|type)="[^"]*"/gi, '');
    html = html.replace(/https?:\/\/(?:www\.)?javiermorodo\.wpcomstaging\.com\/([a-z0-9-]+)\/?/gi, (m, slug) =>
      slugs.has(slug) ? `/${slug}/` : '/blog/',
    );
    html = html.replace(/https?:\/\/(?:www\.)?javiermorodo\.wpcomstaging\.com[^"'\s<)]*/gi, '/blog/');

    const cuerpo = `${frontmatter(post)}\n${html.trim()}\n`;
    await writeFile(path.join(DIR_POSTS, `${post.slug}.md`), cuerpo);
  }

  const redirects = await readFile(REDIRECTS, 'utf8');
  const quitar = new Set(['/blog', '/blog/']);
  for (const slug of slugs) {
    quitar.add(`/${slug}`);
    quitar.add(`/${slug}/`);
  }
  const lineas = redirects.split('\n').flatMap((linea) => {
    const limpia = linea.trim();
    if (limpia.startsWith('/category/*')) return [];
    if (limpia.startsWith('# Blog')) {
      return [
        '# Artículos publicados: páginas en /{slug}/. Lo que queda aquí son borradores o slugs que no están en el archivo.',
      ];
    }
    const origen = limpia.split(/\s+/)[0];
    if (origen && quitar.has(origen)) return [];
    return [linea];
  });
  await writeFile(REDIRECTS, `${lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);

  const manifest = {
    generado: new Date().toISOString(),
    publicados: publicaciones.length,
    borradoresOmitidos: borradores,
    medios: lista.length,
    mediosFallidos: fallidas,
  };
  await writeFile(path.join(RAIZ, 'src/data/blog-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ publicados: publicaciones.length, borradores, fallidas: fallidas.length }, null, 2));
  if (fallidas.length) console.log(fallidas.slice(0, 15));
}

function safeHost(url) {
  try {
    return new URL(decodificar(url), 'https://javiermorodo.wpcomstaging.com').hostname;
  } catch {
    return '';
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
