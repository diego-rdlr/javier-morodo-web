const DIA = 86_400_000;

/** "2026-10-25" → "Hace 4 días" (relativo a `ahora`). Lo usan el build y el navegador. */
export function haceCuanto(fechaIso: string, ahora = Date.now()): string {
  const dias = Math.max(0, Math.floor((ahora - Date.parse(`${fechaIso}T12:00:00Z`)) / DIA));
  const plural = (n: number, uno: string, varios: string) => `Hace ${n} ${n === 1 ? uno : varios}`;
  if (dias === 0) return 'Hoy';
  if (dias < 14) return plural(dias, 'día', 'días');
  if (dias < 60) return plural(Math.floor(dias / 7), 'semana', 'semanas');
  if (dias < 365) return plural(Math.floor(dias / 30), 'mes', 'meses');
  return plural(Math.floor(dias / 365), 'año', 'años');
}
