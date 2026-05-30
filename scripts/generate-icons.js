#!/usr/bin/env node
/**
 * Generate PWA icons from SVG
 * Run: node scripts/generate-icons.js
 * Requires: npm i -g sharp
 */

const fs = require('fs')
const path = require('path')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const OUTPUT_DIR = path.join(__dirname, '../public/icons')

// Simple SVG icon for AIVANA
const SVG_ICON = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#7C3AED"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="900" 
        text-anchor="middle" fill="white">AI</text>
</svg>`

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  try {
    const sharp = require('sharp')
    
    const inputBuffer = Buffer.from(SVG_ICON)
    
    for (const size of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)
      
      await sharp(inputBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath)
      
      console.log(`✅ Generated ${size}x${size} icon`)
    }

    // Generate apple touch icon
    await sharp(inputBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'))
    console.log('✅ Generated apple-touch-icon')

    // Generate badge icon (72x72)
    await sharp(Buffer.from(SVG_ICON))
      .resize(72, 72)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'badge-72x72.png'))
    console.log('✅ Generated badge icon')

    console.log('\n🎉 All icons generated in public/icons/')
    
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  sharp not installed. Creating placeholder icons...')
      
      // Create placeholder SVG icons
      SIZES.forEach(size => {
        const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#7C3AED"/>
  <text x="${size/2}" y="${size * 0.65}" font-family="Arial" font-size="${size * 0.5}" 
        font-weight="900" text-anchor="middle" fill="white">AI</text>
</svg>`
        fs.writeFileSync(
          path.join(OUTPUT_DIR, `icon-${size}x${size}.svg`),
          svgContent
        )
      })
      
      console.log('✅ Created SVG placeholder icons')
      console.log('For PNG icons, run: npm install sharp && node scripts/generate-icons.js')
    } else {
      console.error('Error generating icons:', err)
    }
  }
}

generateIcons()
