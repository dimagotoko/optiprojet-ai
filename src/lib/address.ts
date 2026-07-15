// "Berri-UQAM, Rue Sainte-Catherine Est, Montréal, QC, Canada" → "Berri-UQAM, Montréal"
export function shortAddress(full: string): string {
  const parts = full.split(", ").map((s) => s.trim());
  const filtered = parts.filter((p) => p !== "Canada" && !/^[A-Z]{2}$/.test(p));
  if (filtered.length <= 1) return filtered[0] ?? full;
  if (filtered.length === 2) return filtered.join(", ");
  return `${filtered[0]}, ${filtered[filtered.length - 1]}`;
}
