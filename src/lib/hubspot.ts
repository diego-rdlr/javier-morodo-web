// Envío de formularios de HubSpot (Forms API v3, sin autenticación) desde el navegador.
// El dominio javiermorodo.com está registrado en HubSpot (Seguimiento > Dominios de sitio
// adicionales); sin eso, HubSpot responde 200 pero manda el envío a Spam.
const PORTAL = '51345487';

export async function enviarFormularioHubspot(formGuid: string, campos: Record<string, string>) {
  const hutk = document.cookie.match(/(?:^|; )hubspotutk=([^;]+)/)?.[1];
  const respuesta = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL}/${formGuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: Object.entries(campos)
        .filter(([, valor]) => valor.trim() !== '')
        .map(([name, valor]) => ({ objectTypeId: '0-1', name, value: valor.trim() })),
      context: { pageUri: location.href, pageName: document.title, ...(hutk ? { hutk } : {}) },
    }),
  });
  if (!respuesta.ok) {
    // HubSpot explica el rechazo en `errors` (campo faltante, correo bloqueado, consentimiento, etc.)
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`HubSpot respondió ${respuesta.status}: ${detalle}`);
  }
}
