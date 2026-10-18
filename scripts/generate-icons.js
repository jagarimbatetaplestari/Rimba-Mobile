const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateAssets() {
  const sourcePath = path.join(__dirname, '..', 'public', 'Logo.webp');
  if (!fs.existsSync(sourcePath)) {
    console.error('Source Logo.webp not found at:', sourcePath);
    process.exit(1);
  }

  console.log('Generating iOS and Web icons from:', sourcePath);

  // 1. AppIcon 1024x1024 Full-Bleed (Solid Opaque per Apple App Store requirements)
  const appIconDest = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');

  await sharp(sourcePath)
    .resize(1024, 1024, { fit: 'cover' })
    .flatten({ background: { r: 22, g: 86, b: 67 } })
    .removeAlpha() // Standard iOS AppIcon must NOT have alpha channel
    .png({ compressionLevel: 9 })
    .toFile(appIconDest);

  console.log('Generated full-bleed AppIcon-512@2x.png (1024x1024)');

  // 2. Modern & Minimalist Splash Screens (2732x2732)
  const splashDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  const splashFiles = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'];

  const modernSplashSvg = Buffer.from(`
    <svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="halo" cx="50%" cy="42%" r="42%">
          <stop offset="0%" stop-color="#185641" stop-opacity="0.55"/>
          <stop offset="65%" stop-color="#051F18" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#051F18" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6EE7B7"/>
          <stop offset="100%" stop-color="#10B981"/>
        </linearGradient>
        <linearGradient id="leafGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#34D399"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#34D399"/>
          <stop offset="100%" stop-color="#0D4734"/>
        </linearGradient>
      </defs>

      <!-- Ambient Glow Halo -->
      <circle cx="500" cy="420" r="360" fill="url(#halo)" />

      <!-- Minimal Concentric Aura Rings -->
      <circle cx="500" cy="420" r="150" fill="none" stroke="#256F4F" stroke-width="2.5" stroke-opacity="0.5" />
      <circle cx="500" cy="420" r="185" fill="none" stroke="#1B533A" stroke-width="1.8" stroke-opacity="0.32" stroke-dasharray="8 6" />

      <!-- Minimalist Botanical Zen Sprout -->
      <g transform="translate(500, 420) scale(4.2)">
        <!-- Ground Line -->
        <path d="M -22 18 C -10 16 10 16 22 18" stroke="#2D7A57" stroke-width="2" stroke-linecap="round" fill="none"/>
        <!-- Central Stem -->
        <path d="M 0 17 L 0 -10" stroke="url(#stemGrad)" stroke-width="2.4" stroke-linecap="round"/>
        <!-- Right Delicate Leaf -->
        <path d="M 0 -2 C 6 -12 20 -12 22 -2 C 18 2 8 4 0 -2 Z" fill="url(#leafGrad1)" fill-opacity="0.9" />
        <!-- Left Delicate Leaf -->
        <path d="M 0 4 C -6 -5 -18 -4 -20 5 C -15 8 -7 7 0 4 Z" fill="url(#leafGrad2)" fill-opacity="0.85" />
        <!-- Crown Bud -->
        <circle cx="0" cy="-12" r="2.2" fill="#A7F3D0" />
      </g>

      <!-- Typography: Sleek Modern Branding -->
      <text x="500" y="660" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="700" letter-spacing="14" fill="#F0FDF4">
        RIMBA
      </text>
      <text x="500" y="704" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="500" letter-spacing="6" fill="#86AA96">
        SUAKA FOKUS &amp; KETENANGAN
      </text>
    </svg>
  `);

  const splashEmblem = await sharp(modernSplashSvg)
    .resize(1100, 1100, { fit: 'contain' })
    .png()
    .toBuffer();

  for (const fileName of splashFiles) {
    const dest = path.join(splashDir, fileName);
    await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: { r: 5, g: 31, b: 24, alpha: 1 } // #051F18 deep night sanctuary backdrop
      }
    })
      .composite([{ input: splashEmblem, gravity: 'center' }])
      .png({ compressionLevel: 8 })
      .toFile(dest);
    console.log(`Generated Modern Minimalist Splash image: ${fileName}`);
  }

  // 3. Web Apple Touch Icon & PWA icons in public/
  const publicDir = path.join(__dirname, '..', 'public');
  await sharp(appIconDest).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(appIconDest).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(appIconDest).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated Web icons (apple-touch-icon.png, icon-192.png, icon-512.png)');
}

generateAssets().catch((err) => {
  console.error('Failed generating assets:', err);
  process.exit(1);
});
