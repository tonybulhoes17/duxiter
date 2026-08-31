import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/icons";
await mkdir(OUT, { recursive: true });

// Duxiter mark, centered. Pin = brand red, headphones/waves = light navy.
function markSvg({ size, pad, bg }) {
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${inner / 64})">
    <g fill="none" stroke="#7C93E8" stroke-width="3" stroke-linecap="round" opacity="0.95">
      <path d="M12 22c-3 4-3 12 0 16"/><path d="M6 17c-5 7-5 21 0 28"/>
      <path d="M52 22c3 4 3 12 0 16"/><path d="M58 17c5 7 5 21 0 28"/>
    </g>
    <path d="M32 6c-9.4 0-17 7.4-17 16.6 0 11.6 13.9 24.9 16.1 26.9a1.4 1.4 0 0 0 1.8 0C37.1 47.5 51 34.2 51 22.6 51 13.4 43.4 6 32 6Z" fill="#E53935"/>
    <circle cx="32" cy="22" r="6.5" fill="${bg}"/>
    <path d="M18 24a14 14 0 0 1 28 0" fill="none" stroke="#7C93E8" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="14.5" y="22" width="7" height="11" rx="3.5" fill="#7C93E8"/>
    <rect x="42.5" y="22" width="7" height="11" rx="3.5" fill="#7C93E8"/>
  </g>
</svg>`;
}

const jobs = [
  { file: "icon-192.png", size: 192, pad: 24, bg: "#0F0F18" },
  { file: "icon-512.png", size: 512, pad: 64, bg: "#0F0F18" },
  { file: "maskable-512.png", size: 512, pad: 110, bg: "#0F0F18" },
  { file: "apple-touch-icon.png", size: 180, pad: 20, bg: "#0F0F18" },
];

for (const j of jobs) {
  await sharp(Buffer.from(markSvg(j)))
    .png()
    .toFile(`${OUT}/${j.file}`);
  console.log("wrote", j.file);
}

// favicon
await sharp(Buffer.from(markSvg({ size: 64, pad: 6, bg: "#0F0F18" })))
  .png()
  .toFile("src/app/icon.png");
console.log("wrote src/app/icon.png");
