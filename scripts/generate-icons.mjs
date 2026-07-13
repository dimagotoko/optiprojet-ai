/**
 * Génère les icônes PWA depuis le SVG du logo (voiture cyan sur fond blanc).
 * viewBox="-4 -4 32 32" → logo à 75 % de l'icône, marge 12,5 % de chaque côté.
 * La marge (12,5 %) > zone de sécurité maskable (10 %), donc un seul fichier
 * 512 suffit pour les deux purposes (any + maskable).
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "../public");
const CYAN = "#53C8DF";

function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-4 -4 32 32">
  <rect x="-4" y="-4" width="32" height="32" fill="#ffffff"/>
  <g fill="none" stroke="${CYAN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/>
    <path d="M9 17h6"/>
    <circle cx="17" cy="17" r="2"/>
  </g>
</svg>`;
}

for (const size of [192, 512]) {
  const dest = `${PUBLIC}/icon-${size}.png`;
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(dest);
  console.log(`✓ icon-${size}.png`);
}
