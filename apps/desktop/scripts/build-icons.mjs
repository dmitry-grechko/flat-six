/**
 * Rasterize app/icon.svg → PNG / ICO / ICNS for Electron window + electron-builder.
 * Source SVG is kept in sync with app/icon.svg (FLAT·SIX brand mark).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const png2icons = require('png2icons');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, '..', 'build');
const svgPath = path.join(buildDir, 'icon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('Missing build/icon.svg');
  process.exit(1);
}

const svg = fs.readFileSync(svgPath, 'utf8');

function renderPng(size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

const png1024 = renderPng(1024);
const pngPath = path.join(buildDir, 'icon.png');
fs.writeFileSync(pngPath, png1024);

const ico = png2icons.createICO(png1024, png2icons.BILINEAR, 0, true, true);
if (!ico) {
  console.error('Failed to build icon.ico');
  process.exit(1);
}
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);

const icns = png2icons.createICNS(png1024, png2icons.BILINEAR, 0);
if (!icns) {
  console.error('Failed to build icon.icns');
  process.exit(1);
}
fs.writeFileSync(path.join(buildDir, 'icon.icns'), icns);

console.log('Desktop icons → build/icon.png, icon.ico, icon.icns');
