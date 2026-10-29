import { test } from 'node:test';
import assert from 'node:assert/strict';
import { antiguedad, normalizarVistas, extraerEpisodios } from '../scripts/actualizar-episodios.mjs';

const DIA = 86_400_000;

test('entiende la antigüedad que muestra YouTube', () => {
  assert.equal(antiguedad('hace 4 días'), 4 * DIA);
  assert.equal(antiguedad('hace 2 sem.'), 14 * DIA);
  assert.equal(antiguedad('hace 1 m'), 30 * DIA);
  assert.equal(antiguedad('hace 3 meses'), 90 * DIA);
  assert.equal(antiguedad('hace 1 a'), 365 * DIA);
  assert.equal(antiguedad('hace 30 min'), 30 * 60_000);
  assert.equal(antiguedad('Javier Morodo'), null);
});

test('normaliza las vistas', () => {
  assert.equal(normalizarVistas('24 k'), '24 K');
  assert.equal(normalizarVistas('1.5 K'), '1.5 K');
  assert.equal(normalizarVistas('1,2 M'), '1.2 M');
});

test('extrae los episodios del HTML del playlist', () => {
  const lockup = (id, titulo, ...textos) => ({
    lockupViewModel: {
      contentId: id,
      metadata: {
        lockupMetadataViewModel: {
          title: { content: titulo },
          metadata: { filas: textos.map((content) => ({ content })) },
        },
      },
    },
  });
  const datos = { contents: [lockup('a1', 'Uno', 'Javier Morodo', '24 k', 'hace 4 días'), lockup('b2', 'Dos', 'Javier Morodo', 'y Invitado', '9.4 K', 'hace 1 m')] };
  const html = `<script>var ytInitialData = ${JSON.stringify(datos)};</script>`;
  const ahora = Date.parse('2026-10-29T00:00:00Z');
  assert.deepEqual(extraerEpisodios(html, ahora), [
    { id: 'a1', titulo: 'Uno', vistas: '24 K', publicado: '2026-10-25' },
    { id: 'b2', titulo: 'Dos', vistas: '9.4 K', publicado: '2026-09-29' },
  ]);
});
