// Genera los íconos PNG de la PWA a partir de SVG. Uso: node scripts/icon/generate.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const ACCENT = "#2a78d6";

/**
 * Check blanco sobre el color de acento. `padding` achica el dibujo: los
 * íconos "maskable" necesitan que lo importante quede dentro del 80 % central,
 * porque cada sistema los recorta con su propia forma.
 */
function svg({ rounded, scale }) {
  const r = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${r}" fill="${ACCENT}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M140 270 L222 350 L376 168" fill="none" stroke="#fff"
      stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const outputs = [
  // Íconos "any": esquinas redondeadas, el dibujo ocupa casi todo.
  { file: "public/icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "public/icon-512.png", size: 512, rounded: true, scale: 1 },
  // Maskable: fondo a sangre y dibujo más chico (zona segura).
  {
    file: "public/icon-maskable-512.png",
    size: 512,
    rounded: false,
    scale: 0.75,
  },
  // iOS ignora el manifest y usa apple-touch-icon; él mismo redondea.
  { file: "src/app/apple-icon.png", size: 180, rounded: false, scale: 0.85 },
];

for (const { file, size, ...opts } of outputs) {
  const png = await sharp(Buffer.from(svg(opts)))
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(file, png);
  console.log(`${file} (${size}×${size})`);
}
