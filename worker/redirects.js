import { PATH_REDIRECTS, SHORTLINKS } from './redirects-data.js';

export const CANONICO = 'javiermorodo.com';
export const ALIAS = new Set([
  'www.javiermorodo.com',
  'web.javiermorodo.com',
  'javiermorodo.revolution.inc',
]);

const PAGE_RE = /^\/page\/(\d+)$/;
const BLOG_PAGE_RE = /^\/blog\/page\/(\d+)$/;
const CATEGORY_PAGE_RE = /^\/category\/([^/]+)\/page\/(\d+)$/;
const TAG_RE = /^\/tag(?:\/.*)?$/;
const AUTHOR_RE = /^\/author(?:\/.*)?$/;

/** Quita el slash final, salvo la raíz. */
export function normalizePath(pathname) {
  if (!pathname) return '/';
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // si el path viene mal codificado, se usa tal cual
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Devuelve la ruta de destino (path + hash) o null si no hay redirección de path.
 * Nunca reescribe un slug canónico vigente.
 */
export function pathRedirect(pathname, searchParams) {
  const path = normalizePath(pathname);
  const lowered = path.toLowerCase();

  // Shortlinks de WordPress: solo en la raíz, para no tocar URLs de posts.
  if (lowered === '/') {
    const id = searchParams?.get?.('p') ?? (searchParams && searchParams.get('p'));
    if (id && Object.prototype.hasOwnProperty.call(SHORTLINKS, String(id))) {
      return `/${SHORTLINKS[String(id)]}/`;
    }
  }

  if (Object.prototype.hasOwnProperty.call(PATH_REDIRECTS, lowered)) {
    return PATH_REDIRECTS[lowered];
  }

  let m = lowered.match(BLOG_PAGE_RE);
  if (m) {
    const n = Number(m[1]);
    return n <= 1 ? '/blog/' : `/blog/pagina/${n}/`;
  }
  m = lowered.match(PAGE_RE);
  if (m) {
    const n = Number(m[1]);
    return n <= 1 ? '/blog/' : `/blog/pagina/${n}/`;
  }
  m = lowered.match(CATEGORY_PAGE_RE);
  if (m) {
    const [, slug, page] = m;
    const n = Number(page);
    return n <= 1 ? `/category/${slug}/` : `/category/${slug}/pagina/${n}/`;
  }

  if (TAG_RE.test(lowered) || AUTHOR_RE.test(lowered)) {
    return '/blog/';
  }

  return null;
}

/**
 * URL absoluta de redirección 301, o null si el request debe servirse tal cual.
 * En aliases (www, etc.) se unifica host + path en un solo 301 hacia el canónico.
 * En preview (*.workers.dev) y localhost se conserva el host.
 */
export function resolveRedirect(url) {
  const destPath = pathRedirect(url.pathname, url.searchParams);
  const isAlias = ALIAS.has(url.hostname);

  if (!destPath && !isAlias) return null;

  const dest = new URL(url.href);
  if (isAlias) {
    dest.hostname = CANONICO;
    dest.protocol = 'https:';
    dest.port = '';
  }

  if (destPath) {
    const target = new URL(destPath, dest);
    dest.pathname = target.pathname;
    dest.hash = target.hash;
    dest.search = '';
  }

  return dest.toString();
}
