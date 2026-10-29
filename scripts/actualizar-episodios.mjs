// Actualiza src/data/episodios.json con los últimos episodios del playlist del podcast en YouTube.
// Lee la página pública del playlist (no necesita API key). Lo corre a diario la GitHub Action
// `.github/workflows/episodios.yml`; también se puede correr a mano: `npm run episodios`.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const PLAYLIST = 'PLwdXcQkLGge8nBTD_FmeCFv1z6Z-s7few';
const ARCHIVO = new URL('../src/data/episodios.json', import.meta.url);
const CUANTOS = 6;
const DIA = 86_400_000;

/** "24 k" | "1.5 K" | "980" | "1,2 M" → "24 K" | "1.5 K" | "980" | "1.2 M" */
export function normalizarVistas(texto) {
  const m = texto.replace(/\s/g, ' ').match(/([\d.,]+)\s*(k|m|mil|mill\.?)?/i);
  if (!m) return null;
  const numero = m[1].replace(',', '.');
  const sufijo = { k: ' K', mil: ' K', m: ' M', 'mill.': ' M', mill: ' M' }[(m[2] ?? '').toLowerCase()] ?? '';
  return numero + sufijo;
}

/** "hace 4 días" | "hace 2 sem." | "hace 1 m" (mes) | "hace 1 a" | "3 days ago" → milisegundos de antigüedad (aproximada) */
export function antiguedad(texto) {
  const t = texto.toLowerCase().replace(/\s/g, ' ');
  const m = t.match(/(\d+)\s*(min|minutos?|minutes?|h|horas?|hours?|d|días?|dias?|days?|sem\.?|semanas?|weeks?|m|mes(?:es)?|months?|a|años?|years?)(?![a-zñ])/);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2];
  if (/^min/.test(u)) return n * 60_000;
  if (/^(h|hora|hour)/.test(u)) return n * 3_600_000;
  if (/^(d|día|dia|day)/.test(u)) return n * DIA;
  if (/^(sem|week)/.test(u)) return n * 7 * DIA;
  if (/^(m|mes|month)/.test(u)) return n * 30 * DIA; // "m" sola = mes; los minutos vienen como "min"
  return n * 365 * DIA;
}

function buscar(objeto, clave, encontrados = []) {
  if (Array.isArray(objeto)) objeto.forEach((v) => buscar(v, clave, encontrados));
  else if (objeto && typeof objeto === 'object') {
    if (clave in objeto) encontrados.push(objeto[clave]);
    Object.values(objeto).forEach((v) => buscar(v, clave, encontrados));
  }
  return encontrados;
}

/** Extrae los episodios (en el orden del playlist: el más nuevo primero) del HTML de la página. */
export function extraerEpisodios(html, ahora = Date.now()) {
  const json = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1];
  if (!json) throw new Error('No encontré ytInitialData en la página del playlist');
  const lockups = buscar(JSON.parse(json), 'lockupViewModel');
  return lockups
    .map((l) => {
      const md = l.metadata?.lockupMetadataViewModel ?? {};
      const textos = buscar(md.metadata ?? {}, 'content').filter((c) => typeof c === 'string');
      const vistas = textos.map(normalizarVistas).find((v, i) => v && i > 0 && /\d/.test(textos[i]) && !antiguedad(textos[i]));
      const edad = textos.map(antiguedad).find((v) => v !== null);
      return {
        id: l.contentId,
        titulo: md.title?.content?.trim(),
        vistas: vistas ?? null,
        publicado: edad != null ? new Date(ahora - edad).toISOString().slice(0, 10) : null,
      };
    })
    .filter((e) => e.id && e.titulo);
}

async function main() {
  const res = await fetch(`https://www.youtube.com/playlist?list=${PLAYLIST}&hl=es-419&gl=MX`, {
    headers: { 'accept-language': 'es-MX,es;q=0.9', 'user-agent': 'Mozilla/5.0 (compatible; javiermorodo.com)' },
  });
  if (!res.ok) throw new Error(`YouTube respondió ${res.status}`);
  const nuevos = extraerEpisodios(await res.text()).slice(0, CUANTOS);
  if (nuevos.length < CUANTOS) throw new Error(`Solo encontré ${nuevos.length} episodios; no actualizo`);

  const anterior = JSON.parse(await readFile(ARCHIVO, 'utf8').catch(() => '{"episodios":[]}'));
  // La fecha que da YouTube es relativa ("hace 2 sem."): conservamos la primera que vimos de cada video.
  const fechas = new Map(anterior.episodios.map((e) => [e.id, e.publicado]));
  const episodios = nuevos.map((e) => ({ ...e, publicado: fechas.get(e.id) ?? e.publicado }));

  if (JSON.stringify(episodios) === JSON.stringify(anterior.episodios)) {
    console.log('Sin cambios en los episodios.');
    return;
  }
  const datos = { playlist: PLAYLIST, actualizado: new Date().toISOString().slice(0, 10), episodios };
  await writeFile(ARCHIVO, JSON.stringify(datos, null, 2) + '\n');
  console.log(`Episodios actualizados:\n${episodios.map((e) => `- ${e.titulo}`).join('\n')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
