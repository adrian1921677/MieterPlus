/**
 * Marketing-Screenshots für den Play Store erzeugen.
 *
 * Eingabe:  store/raw/01.png, 02.png, … (Roh-Screenshots vom Handy, beliebige Größe)
 * Ausgabe:  store/marketing/01.png, …   (1080×1920, Markenhintergrund + Überschrift + Geräterahmen)
 *
 * Ausführen (sharp liegt in apps/web):
 *   node store/frame-screenshots.cjs        (aus apps/mobile)
 * Falls sharp nicht gefunden wird:
 *   cd ../web && node ../mobile/store/frame-screenshots.cjs
 */
const path = require('path');
const fs = require('fs');
let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require(path.join(__dirname, '../../web/node_modules/sharp'));
}

const RAW_DIR = path.join(__dirname, 'raw');
const OUT_DIR = path.join(__dirname, 'marketing');

// Überschriften in Reihenfolge der Dateien (01,02,03,…). Anpassbar.
const HEADLINES = [
  'Alles rund um\ndeine Wohnung',
  'Mängel in Sekunden\nmelden – mit Foto',
  'Status jeder Meldung\nlive verfolgen',
  'Dokumente & Termine\nan einem Ort',
  'Sicher & DSGVO-konform',
  'Für Mieter\n& Vermieter',
];

const W = 1080;
const H = 1920;

function headlineSvg(text) {
  const lines = text.split('\n');
  const startY = 175;
  const lh = 92;
  const tspans = lines
    .map(
      (ln, i) =>
        `<text x='${W / 2}' y='${startY + i * lh}' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='74' font-weight='800' fill='#ffffff'>${escapeXml(
          ln,
        )}</text>`,
    )
    .join('');
  return `<svg width='${W}' height='${H}' xmlns='http://www.w3.org/2000/svg'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#2563a8'/><stop offset='55%' stop-color='#1d4f8c'/><stop offset='100%' stop-color='#0ea5e9'/>
    </linearGradient></defs>
    <rect width='${W}' height='${H}' fill='url(#g)'/>
    ${tspans}
    <text x='${W / 2}' y='${H - 70}' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='30' font-weight='600' fill='#cfeafe'>Mieter +  ·  Eine App von ADB</text>
  </svg>`;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function frameOne(file, headline, outName) {
  const src = path.join(RAW_DIR, file);
  const meta = await sharp(src).metadata();
  // In maximale Box einpassen (Breite ≤ 620, Höhe ≤ 1280)
  const maxW = 620;
  const maxH = 1280;
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const sw = Math.round(meta.width * scale);
  const sh = Math.round(meta.height * scale);
  const radius = 44;

  // Screenshot mit abgerundeten Ecken
  const shot = await sharp(src)
    .resize(sw, sh)
    .composite([
      {
        input: Buffer.from(
          `<svg width='${sw}' height='${sh}'><rect width='${sw}' height='${sh}' rx='${radius}' ry='${radius}'/></svg>`,
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  // Dunkle Bezel hinter dem Screenshot
  const bezelPad = 16;
  const bw = sw + bezelPad * 2;
  const bh = sh + bezelPad * 2;
  const bezel = await sharp({
    create: { width: bw, height: bh, channels: 4, background: { r: 11, g: 18, b: 32, alpha: 1 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width='${bw}' height='${bh}'><rect width='${bw}' height='${bh}' rx='${radius + bezelPad}' ry='${radius + bezelPad}'/></svg>`,
        ),
        blend: 'dest-in',
      },
      { input: shot, left: bezelPad, top: bezelPad },
    ])
    .png()
    .toBuffer();

  const bgBuf = await sharp(Buffer.from(headlineSvg(headline))).png().toBuffer();
  const left = Math.round((W - bw) / 2);
  const top = 470;

  await sharp(bgBuf)
    .composite([{ input: bezel, left, top }])
    .png()
    .toFile(path.join(OUT_DIR, outName));
  console.log('✓', outName, `(${sw}×${sh})`);
}

(async () => {
  if (!fs.existsSync(RAW_DIR)) {
    console.error('Bitte Roh-Screenshots nach store/raw/ legen (01.png, 02.png, …)');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();
  if (files.length === 0) {
    console.error('Keine Bilder in store/raw/ gefunden.');
    process.exit(1);
  }
  for (let i = 0; i < files.length; i++) {
    const out = String(i + 1).padStart(2, '0') + '.png';
    await frameOne(files[i], HEADLINES[i] ?? 'Mieter +', out);
  }
  console.log(`\nFertig — ${files.length} Marketing-Screenshots in store/marketing/`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
