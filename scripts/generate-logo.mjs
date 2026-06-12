// Generiert alle MieterPlus-Logo-Assets aus einem SVG-Master.
// Design: Navy abgerundetes Quadrat, weißes Dach mit Haken, weißes Plus.
// Aufruf:  node scripts/generate-logo.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const NAVY = '#1e3a5f';

// Master-SVG 1024×1024 — Dach mit Haken links, Plus rechts unten
function masterSvg({ background = NAVY, rounded = true, pad = 0 } = {}) {
  const rx = rounded ? 220 : 0;
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${background ? `<rect x="0" y="0" width="1024" height="1024" rx="${rx}" fill="${background}"/>` : ''}
  <g transform="translate(${pad},${pad}) scale(${(1024 - 2 * pad) / 1024})">
    <!-- Haken (kleiner Schenkel links) -->
    <path d="M 255 300
             L 255 425
             L 175 505
             L 255 585
             L 360 480"
          fill="none" stroke="white" stroke-width="86" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
    <!-- Dachform: links unten → Spitze → rechts unten -->
    <path d="M 165 585
             L 480 290
             L 660 440"
          fill="none" stroke="white" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Schornstein/Haken links der Spitze -->
    <path d="M 300 310
             L 300 430"
          fill="none" stroke="white" stroke-width="88" stroke-linecap="round"/>
    <!-- Plus rechts unten -->
    <path d="M 740 470 L 740 730 M 610 600 L 870 600"
          fill="none" stroke="white" stroke-width="92" stroke-linecap="round"/>
  </g>
</svg>`;
}

const outputs = [
  // Mobile (Expo) Assets
  { file: 'apps/mobile/assets/icon.png', size: 1024, opts: { background: NAVY, rounded: false } },
  { file: 'apps/mobile/assets/adaptive-icon.png', size: 1024, opts: { background: null, pad: 160 } },
  { file: 'apps/mobile/assets/splash.png', size: 1024, opts: { background: NAVY, rounded: true, pad: 120 } },
  { file: 'apps/mobile/assets/favicon.png', size: 48, opts: { background: NAVY, rounded: true } },
  { file: 'apps/mobile/assets/notification-icon.png', size: 96, opts: { background: null, pad: 100 } },
  { file: 'apps/mobile/assets/logo.png', size: 512, opts: { background: NAVY, rounded: true } },
  // Web Assets
  { file: 'apps/web/public/logo.png', size: 512, opts: { background: NAVY, rounded: true } },
  { file: 'apps/web/public/favicon.png', size: 64, opts: { background: NAVY, rounded: true } },
  { file: 'apps/web/src/app/icon.png', size: 256, opts: { background: NAVY, rounded: true } },
];

// Splash extra: großes Canvas mit zentriertem Logo (Expo skaliert "contain")
async function run() {
  for (const out of outputs) {
    const svg = masterSvg(out.opts);
    const dest = join(root, out.file);
    mkdirSync(dirname(dest), { recursive: true });
    await sharp(Buffer.from(svg)).resize(out.size, out.size).png().toFile(dest);
    console.log(`OK ${out.file} (${out.size}px)`);
  }

  // SVG-Master auch ablegen (für Web-Komponenten & Docs)
  const svgDest = join(root, 'apps/web/public/logo.svg');
  writeFileSync(svgDest, masterSvg({ background: NAVY, rounded: true }));
  console.log('OK apps/web/public/logo.svg');

  const svgMobile = join(root, 'pictures/mieterplus-logo.svg');
  mkdirSync(dirname(svgMobile), { recursive: true });
  writeFileSync(svgMobile, masterSvg({ background: NAVY, rounded: true }));
  console.log('OK pictures/mieterplus-logo.svg');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
