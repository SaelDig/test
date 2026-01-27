#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates PNG icons from SVG for Chrome/Edge extension
 *
 * Usage:
 *   npm install sharp
 *   node scripts/generate-icons.js
 *
 * Or manually convert src/icons/icon.svg to PNG using:
 *   - https://cloudconvert.com/svg-to-png
 *   - Inkscape: inkscape -w 128 -h 128 icon.svg -o icon128.png
 *   - ImageMagick: convert -background none icon.svg -resize 128x128 icon128.png
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Sharp not installed. Install with: npm install sharp');
    console.log('Or use one of these alternatives to convert SVG to PNG:');
    console.log('  - https://cloudconvert.com/svg-to-png');
    console.log('  - Inkscape: inkscape -w SIZE -h SIZE icon.svg -o iconSIZE.png');
    console.log('  - ImageMagick: convert -background none icon.svg -resize SIZExSIZE iconSIZE.png');
    process.exit(1);
  }

  const sizes = [16, 32, 48, 128];
  const svgPath = path.join(__dirname, '..', 'src', 'icons', 'icon.svg');
  const outputDir = path.join(__dirname, '..', 'src', 'icons');

  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon${size}.png`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
