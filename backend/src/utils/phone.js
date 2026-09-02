// Sigue siendo específico de Perú (prefijo 51 para números de 9 dígitos) — aislado acá en
// vez de repetido en varios archivos, con este comentario como recordatorio: cuando existan
// tenants de otros países, esto necesita volverse configurable por tenant o migrar a una
// librería como libphonenumber en vez de esta heurística.
function formatPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) cleaned = '51' + cleaned;
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return cleaned.length >= 10 ? cleaned : null;
}

module.exports = { formatPhone };
