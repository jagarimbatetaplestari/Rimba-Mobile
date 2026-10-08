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

  // 1. AppIcon 1024x1024 (Solid Opaque per Apple App Store requirements)
  const appIconDest = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  
  // Resize logo with high quality padding
  const logoResizedForIcon = await sharp(sourcePath)
    .resize(860, 860, { fit: 'contain', background: { r: 7, g: 21, b: 14, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 6, g: 18, b: 12, alpha: 1 } // #06120C rich dark forest emerald
    }
  })
    .composite([{ input: logoResizedForIcon, gravity: 'center' }])
    .removeAlpha() // Standard iOS AppIcon must NOT have alpha channel
    .png()
    .toFile(appIconDest);

  console.log('Generated AppIcon-512@2x.png (1024x1024)');

  // 2. Splash Screens (2732x2732)
  const splashDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  const splashFiles = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'];

  const logoForSplash = await sharp(sourcePath)
    .resize(920, 920, { fit: 'contain', background: { r: 4, g: 13, b: 8, alpha: 0 } })
    .toBuffer();

  for (const fileName of splashFiles) {
    const dest = path.join(splashDir, fileName);
    await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: { r: 4, g: 13, b: 8, alpha: 1 } // #040D08 deep night sanctuary backdrop
      }
    })
      .composite([{ input: logoForSplash, gravity: 'center' }])
      .png()
      .toFile(dest);
    console.log(`Generated Splash image: ${fileName}`);
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
