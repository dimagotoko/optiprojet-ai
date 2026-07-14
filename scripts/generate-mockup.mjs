import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../scripts/tripcard-mockup.png");

const CW = 330; // card width
const AX = 20; // avant x
const PX = 370; // après x
const CY = 52; // card top y
const AH = 318; // avant card height (with tall image)
const PH = 270; // après card height (compact gradient)
const H = Math.max(AH, PH) + CY + 24; // canvas height

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${H}">
<defs>
  <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#14b8a6"/>
    <stop offset="100%" stop-color="#3b82f6"/>
  </linearGradient>
  <filter id="sh" x="-8%" y="-8%" width="116%" height="130%">
    <feDropShadow dx="0" dy="3" stdDeviation="7" flood-color="#0f172a" flood-opacity="0.13"/>
  </filter>
  <clipPath id="ca"><rect x="${AX}" y="${CY}" width="${CW}" height="${AH}" rx="12"/></clipPath>
  <clipPath id="cp"><rect x="${PX}" y="${CY}" width="${CW}" height="${PH}" rx="12"/></clipPath>
</defs>

<!-- Canvas -->
<rect width="720" height="${H}" fill="#f1f5f9"/>

<!-- Etiquettes -->
<text x="${AX + CW / 2}" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11.5" fill="#94a3b8" font-weight="500">AVANT — picsum.photos (service externe)</text>
<text x="${PX + CW / 2}" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11.5" fill="#14b8a6" font-weight="700">APRES — gradient deterministe (zero reseau)</text>

<!-- ─── CARTE AVANT ─── -->
<rect x="${AX}" y="${CY}" width="${CW}" height="${AH}" rx="12" fill="white" filter="url(#sh)"/>
<g clip-path="url(#ca)">
  <!-- Header route + prix -->
  <text x="${AX + 16}" y="${CY + 29}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#1e293b">Montreal</text>
  <text x="${AX + 101}" y="${CY + 29}" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">-&gt;</text>
  <text x="${AX + 117}" y="${CY + 29}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#1e293b">Quebec</text>
  <rect x="${AX + CW - 58}" y="${CY + 13}" width="42" height="22" rx="5" fill="#f1f5f9"/>
  <text x="${AX + CW - 37}" y="${CY + 28}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12.5" font-weight="700" fill="#1e293b">25 $</text>
  <!-- Separateur -->
  <line x1="${AX}" y1="${CY + 48}" x2="${AX + CW}" y2="${CY + 48}" stroke="#e2e8f0" stroke-width="1"/>
  <!-- Placeholder image grise (h-48 = ~140px) -->
  <rect x="${AX + 16}" y="${CY + 64}" width="${CW - 32}" height="138" rx="8" fill="#e2e8f0"/>
  <rect x="${AX + 16 + 80}" y="${CY + 96}" width="126" height="74" rx="5" fill="#d1d5db"/>
  <text x="${AX + CW / 2}" y="${CY + 137}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#9ca3af">Photo de paysage aleatoire</text>
  <text x="${AX + CW / 2}" y="${CY + 153}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#9ca3af">picsum.photos</text>
  <text x="${AX + CW / 2}" y="${CY + 168}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#c4b5b5">(1 requete reseau / carte)</text>
  <!-- Date -->
  <rect x="${AX + 16}" y="${CY + 218}" width="13" height="13" rx="2" fill="none" stroke="#94a3b8" stroke-width="1.4"/>
  <line x1="${AX + 21}" y1="${CY + 216}" x2="${AX + 21}" y2="${CY + 220}" stroke="#94a3b8" stroke-width="1.4"/>
  <line x1="${AX + 26}" y1="${CY + 216}" x2="${AX + 26}" y2="${CY + 220}" stroke="#94a3b8" stroke-width="1.4"/>
  <line x1="${AX + 16}" y1="${CY + 224}" x2="${AX + 29}" y2="${CY + 224}" stroke="#94a3b8" stroke-width="0.8"/>
  <text x="${AX + 36}" y="${CY + 228}" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">sam. 20 juil. a 08h30</text>
  <!-- Conducteur -->
  <circle cx="${AX + 26}" cy="${CY + 254}" r="12" fill="#e0f2fe"/>
  <text x="${AX + 26}" y="${CY + 258}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="600" fill="#0284c7">JM</text>
  <text x="${AX + 44}" y="${CY + 258}" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">Jean-Luc M.</text>
  <text x="${AX + 155}" y="${CY + 258}" font-family="system-ui,sans-serif" font-size="12" fill="#f59e0b">&#9733;</text>
  <text x="${AX + 168}" y="${CY + 258}" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">4.8</text>
  <rect x="${AX + 196}" y="${CY + 247}" width="46" height="17" rx="3" fill="none" stroke="#6ee7b7" stroke-width="1"/>
  <text x="${AX + 219}" y="${CY + 259}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#059669">Verifie</text>
  <!-- Footer -->
  <line x1="${AX}" y1="${CY + AH - 44}" x2="${AX + CW}" y2="${CY + AH - 44}" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${AX + CW - 16}" y="${CY + AH - 18}" text-anchor="end" font-family="system-ui,sans-serif" font-size="12.5" fill="#14b8a6" font-weight="500">Voir details -&gt;</text>
</g>

<!-- ─── CARTE APRES ─── -->
<rect x="${PX}" y="${CY}" width="${CW}" height="${PH}" rx="12" fill="white" filter="url(#sh)"/>
<g clip-path="url(#cp)">
  <!-- Header route + prix -->
  <text x="${PX + 16}" y="${CY + 29}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#1e293b">Montreal</text>
  <text x="${PX + 101}" y="${CY + 29}" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">-&gt;</text>
  <text x="${PX + 117}" y="${CY + 29}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#1e293b">Quebec</text>
  <rect x="${PX + CW - 58}" y="${CY + 13}" width="42" height="22" rx="5" fill="#f1f5f9"/>
  <text x="${PX + CW - 37}" y="${CY + 28}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12.5" font-weight="700" fill="#1e293b">25 $</text>
  <!-- Separateur -->
  <line x1="${PX}" y1="${CY + 48}" x2="${PX + CW}" y2="${CY + 48}" stroke="#e2e8f0" stroke-width="1"/>
  <!-- GRADIENT BANNER (h-28 ~ 100px) -->
  <rect x="${PX + 16}" y="${CY + 64}" width="${CW - 32}" height="100" rx="8" fill="url(#g)"/>
  <rect x="${PX + 16}" y="${CY + 64}" width="${CW - 32}" height="100" rx="8" fill="black" opacity="0.18"/>
  <!-- Cercles decoratifs -->
  <circle cx="${PX + CW - 24}" cy="${CY + 78}" r="38" fill="white" opacity="0.11"/>
  <circle cx="${PX + 24}" cy="${CY + 150}" r="22" fill="white" opacity="0.09"/>
  <!-- Texte overlay route -->
  <text x="${PX + 30}" y="${CY + 150}" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="white">Montreal -&gt; Quebec</text>
  <!-- Date -->
  <rect x="${PX + 16}" y="${CY + 180}" width="13" height="13" rx="2" fill="none" stroke="#94a3b8" stroke-width="1.4"/>
  <line x1="${PX + 21}" y1="${CY + 178}" x2="${PX + 21}" y2="${CY + 182}" stroke="#94a3b8" stroke-width="1.4"/>
  <line x1="${PX + 26}" y1="${CY + 178}" x2="${PX + 26}" y2="${CY + 182}" stroke="#94a3b8" stroke-width="1.4"/>
  <line x1="${PX + 16}" y1="${CY + 186}" x2="${PX + 29}" y2="${CY + 186}" stroke="#94a3b8" stroke-width="0.8"/>
  <text x="${PX + 36}" y="${CY + 190}" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">sam. 20 juil. a 08h30</text>
  <!-- Conducteur -->
  <circle cx="${PX + 26}" cy="${CY + 216}" r="12" fill="#e0f2fe"/>
  <text x="${PX + 26}" y="${CY + 220}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="600" fill="#0284c7">JM</text>
  <text x="${PX + 44}" y="${CY + 220}" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">Jean-Luc M.</text>
  <text x="${PX + 155}" y="${CY + 220}" font-family="system-ui,sans-serif" font-size="12" fill="#f59e0b">&#9733;</text>
  <text x="${PX + 168}" y="${CY + 220}" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">4.8</text>
  <rect x="${PX + 196}" y="${CY + 209}" width="46" height="17" rx="3" fill="none" stroke="#6ee7b7" stroke-width="1"/>
  <text x="${PX + 219}" y="${CY + 221}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#059669">Verifie</text>
  <!-- Footer -->
  <line x1="${PX}" y1="${CY + PH - 44}" x2="${PX + CW}" y2="${CY + PH - 44}" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${PX + CW - 16}" y="${CY + PH - 18}" text-anchor="end" font-family="system-ui,sans-serif" font-size="12.5" fill="#14b8a6" font-weight="500">Voir details -&gt;</text>
</g>

<!-- Badge compact -->
<rect x="${PX + CW - 120}" y="${CY + PH + 8}" width="120" height="20" rx="4" fill="#dcfce7"/>
<text x="${PX + CW - 60}" y="${CY + PH + 21}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" fill="#16a34a" font-weight="600">48px plus compact</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log("Mockup genere :", OUT);
