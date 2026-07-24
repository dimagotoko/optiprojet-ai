// "Berri-UQAM, Rue Sainte-Catherine Est, Montréal, QC, Canada" → "Berri-UQAM, Montréal"
export function shortAddress(full: string): string {
  const parts = full.split(", ").map((s) => s.trim());
  const filtered = parts.filter((p) => p !== "Canada" && !/^[A-Z]{2}$/.test(p));
  if (filtered.length <= 1) return filtered[0] ?? full;
  if (filtered.length === 2) return filtered.join(", ");
  return `${filtered[0]}, ${filtered[filtered.length - 1]}`;
}

/**
 * Libellé court pour l'affichage dashboard — itinéraires.
 * structured_formatting (Places API) n'est pas persisté en Firestore ;
 * on découpe la chaîne complète stockée dans trip.origin / trip.destination.
 *
 * Filtre : "Canada", codes province 2 lettres (QC, ON…), codes postaux CA.
 * Résultat : "Premier segment, Ville" ou "Ville" si le segment = la ville.
 */
export function formatShortLocation(full: string): string {
  if (!full) return full;
  const parts = full.split(", ").map((s) => s.trim());
  const filtered = parts.filter(
    (p) =>
      p !== "Canada" &&
      !/^[A-Z]{2}$/.test(p) &&
      !/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(p),
  );
  if (filtered.length <= 1) return filtered[0] ?? full;
  const first = filtered[0];
  const city = filtered[filtered.length - 1];
  if (first.toLowerCase() === city.toLowerCase()) return city;
  return `${first}, ${city}`;
}
