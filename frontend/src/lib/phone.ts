// Numéros de téléphone gabonais pour le Mobile Money.
// Accepte « 074 82 60 61 », « 74826061 », « +241 074 82 60 61 »…
// Renvoie le format international sans espace, ou null si invalide.

export function normalizeGabonPhone(raw: string): string | null {
  let digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('00241')) digits = digits.slice(5);
  else if (digits.startsWith('241') && digits.length >= 11) digits = digits.slice(3);
  if (!/^0?[1-9]\d{7}$/.test(digits)) return null;
  return `+241${digits}`;
}

/** « +241 074 82 60 61 » pour l'affichage. */
export function formatGabonPhone(e164: string): string {
  const local = e164.replace(/^\+241/, '');
  const groups =
    local.length === 9
      ? [local.slice(0, 3), local.slice(3, 5), local.slice(5, 7), local.slice(7)]
      : (local.match(/.{1,2}/g) ?? [local]);
  return `+241 ${groups.join(' ')}`;
}
