const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateAndroidAssets() {
  const sourcePath = path.join(__dirname, '..', 'public', 'Logo.webp');
  if (!fs.existsSync(sourcePath)) {
    console.error('Source Logo.webp not found at:', sourcePath);
    process.exit(1);
  }

  const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(resDir)) {
    console.error('Android res directory not found at:', resDir);
    process.exit(1);
  }

  console.log('Generating Android icons and splash screens from:', sourcePath);

  // 1. Update ic_launcher_background.xml to Rimba Emerald #051F18
  const bgXmlPath = path.join(resDir, 'values', 'ic_launcher_background.xml');
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#051F18</color>
</resources>
`;
  fs.writeFileSync(bgXmlPath, bgXmlContent, 'utf-8');
  console.log('Updated ic_launcher_background.xml -> #051F18');

  // 2. Android Density Configurations for Mipmaps
  // Standard icon size is 48dp (mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192)
  // Adaptive foreground size is 108dp (mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432)
  const mipmapDensities = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  for (const { dir, iconSize, fgSize } of mipmapDensities) {
    const targetDir = path.join(resDir, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard square launcher icon
    await sharp(sourcePath)
      .resize(iconSize, iconSize, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher icon (circular mask)
    const radius = iconSize / 2;
    const circleSvg = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#ffffff"/></svg>`
    );
    const roundIconBuffer = await sharp(sourcePath)
      .resize(iconSize, iconSize, { fit: 'cover' })
      .png()
      .toBuffer();

    await sharp(roundIconBuffer)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Adaptive icon foreground (centered within 72dp safe zone of 108dp canvas)
    const logoInnerSize = Math.round(fgSize * 0.66);
    const logoBuffer = await sharp(sourcePath)
      .resize(logoInnerSize, logoInnerSize, { fit: 'contain' })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated mipmap icons for ${dir}`);
  }

  // 3. Splash Screens for Portrait & Landscape
  const splashDensities = [
    { dir: 'drawable-port-mdpi', width: 320, height: 480 },
    { dir: 'drawable-port-hdpi', width: 480, height: 800 },
    { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
    { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
    { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
    { dir: 'drawable-land-mdpi', width: 480, height: 320 },
    { dir: 'drawable-land-hdpi', width: 800, height: 480 },
    { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
    { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
    { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
  ];

  for (const { dir, width, height } of splashDensities) {
    const targetDir = path.join(resDir, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const minDim = Math.min(width, height);
    const logoSplashSize = Math.min(Math.round(minDim * 0.45), 450);

    const zenSvg = Buffer.from(`
      <svg width="${logoSplashSize}" height="${logoSplashSize}" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="120" cy="98" r="62" stroke="#2D6049" stroke-width="2" stroke-opacity="0.6"/>
        <circle cx="120" cy="98" r="52" stroke="#458A6A" stroke-width="1.5" stroke-opacity="0.4"/>
        <path d="M96 130C112 128 128 128 144 130" stroke="#3A6C53" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M120 128V88C120 80 120 76 120 70" stroke="#52A379" stroke-width="3" stroke-linecap="round"/>
        <path d="M120 92C126 80 140 80 142 92C136 94 126 96 120 92Z" fill="#3D8361" fill-opacity="0.35" stroke="#52A379" stroke-width="2"/>
        <path d="M120 100C112 90 98 92 98 104C104 106 114 104 120 100Z" fill="#52A379" fill-opacity="0.45" stroke="#52A379" stroke-width="2"/>
        <text x="120" y="184" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" letter-spacing="6" fill="#E8F1EC">RIMBA</text>
        <text x="120" y="201" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="500" letter-spacing="3" fill="#6E9E83">SANCTUARY</text>
      </svg>
    `);

    const logoBuffer = await sharp(zenSvg)
      .resize(logoSplashSize, logoSplashSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 5, g: 31, b: 24, alpha: 1 } // #051F18 Deep Sanctuary Emerald
      }
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png({ compressionLevel: 8 })
      .toFile(path.join(targetDir, 'splash.png'));

    console.log(`Generated splash for ${dir} (${width}x${height})`);
  }

  // Universal fallback drawable/splash.png (1080x1920)
  const defaultDrawableDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(defaultDrawableDir)) {
    fs.mkdirSync(defaultDrawableDir, { recursive: true });
  }

  const universalZenSvg = Buffer.from(`
    <svg width="480" height="480" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="98" r="62" stroke="#2D6049" stroke-width="2" stroke-opacity="0.6"/>
      <circle cx="120" cy="98" r="52" stroke="#458A6A" stroke-width="1.5" stroke-opacity="0.4"/>
      <path d="M96 130C112 128 128 128 144 130" stroke="#3A6C53" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M120 128V88C120 80 120 76 120 70" stroke="#52A379" stroke-width="3" stroke-linecap="round"/>
      <path d="M120 92C126 80 140 80 142 92C136 94 126 96 120 92Z" fill="#3D8361" fill-opacity="0.35" stroke="#52A379" stroke-width="2"/>
      <path d="M120 100C112 90 98 92 98 104C104 106 114 104 120 100Z" fill="#52A379" fill-opacity="0.45" stroke="#52A379" stroke-width="2"/>
      <text x="120" y="184" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" letter-spacing="6" fill="#E8F1EC">RIMBA</text>
      <text x="120" y="201" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="500" letter-spacing="3" fill="#6E9E83">SANCTUARY</text>
    </svg>
  `);

  const universalLogoBuffer = await sharp(universalZenSvg)
    .resize(480, 480)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 5, g: 31, b: 24, alpha: 1 } // #051F18
    }
  })
    .composite([{ input: universalLogoBuffer, gravity: 'center' }])
    .png({ compressionLevel: 8 })
    .toFile(path.join(defaultDrawableDir, 'splash.png'));

  console.log('Generated universal drawable/splash.png');
  console.log('✅ Android assets successfully generated!');
}

generateAndroidAssets().catch((err) => {
  console.error('Failed generating Android assets:', err);
  process.exit(1);
});
