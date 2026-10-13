const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateStoreAssets() {
  const rootDir = path.join(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const outputDir = path.join(rootDir, 'store_assets');
  const screenshotsDir = path.join(outputDir, 'screenshots_android_1080x2400');
  const iosScreenshotsDir = path.join(outputDir, 'screenshots_ios_1290x2796');

  // Create directories
  [outputDir, screenshotsDir, iosScreenshotsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const logoPath = path.join(publicDir, 'Logo.webp');
  if (!fs.existsSync(logoPath)) {
    console.error('Master Logo.webp not found at:', logoPath);
    process.exit(1);
  }

  console.log('🌱 Starting Rimba Store Assets Generation...');

  // =========================================================================
  // 1. Google Play Store App Icon: 512x512 PNG (No transparency, #051F18 bg)
  // =========================================================================
  const icon512Path = path.join(outputDir, 'google_play_icon_512x512.png');
  const logo512Buffer = await sharp(logoPath)
    .resize(410, 410, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#051F18',
    },
  })
    .composite([{ input: logo512Buffer, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(icon512Path);
  console.log('✅ Generated Google Play Icon (512x512):', icon512Path);

  // =========================================================================
  // 2. Apple App Store App Icon: 1024x1024 PNG (No Alpha / No Transparency)
  // =========================================================================
  const icon1024Path = path.join(outputDir, 'app_store_icon_1024x1024.png');
  const logo1024Buffer = await sharp(logoPath)
    .resize(820, 820, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3, // RGB only, strips alpha channel per Apple Guideline
      background: '#051F18',
    },
  })
    .composite([{ input: logo1024Buffer, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(icon1024Path);
  console.log('✅ Generated App Store Icon (1024x1024, No Alpha):', icon1024Path);

  // =========================================================================
  // 3. Google Play Feature Graphic: 1024x500 PNG
  //    (Landscape banner for store header with scenic background & logo)
  // =========================================================================
  const featureGraphicPath = path.join(outputDir, 'google_play_feature_graphic_1024x500.png');
  const backdropSource = path.join(publicDir, 'onboarding-1-valley.webp');

  let bannerBackdrop;
  if (fs.existsSync(backdropSource)) {
    bannerBackdrop = await sharp(backdropSource)
      .resize(1024, 500, { fit: 'cover', position: 'center' })
      .modulate({ brightness: 0.85, saturation: 1.1 })
      .toBuffer();
  } else {
    bannerBackdrop = await sharp({
      create: {
        width: 1024,
        height: 500,
        channels: 4,
        background: '#0a2e23',
      },
    }).png().toBuffer();
  }

  // Soft emerald vignette and typography overlay
  const bannerOverlaySvg = Buffer.from(`
    <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#051F18" stop-opacity="0.3" />
          <stop offset="65%" stop-color="#051F18" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#051F18" stop-opacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#overlay)" />
      
      <!-- App Name & Subtitle -->
      <text x="512" y="380" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">
        RIMBA
      </text>
      <text x="512" y="425" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="#a7f3d0" text-anchor="middle" letter-spacing="1">
        Fokus Tenang · Tumbuhkan Suaka Alami
      </text>
    </svg>
  `);

  const logoSmallBuffer = await sharp(logoPath)
    .resize(180, 180, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp(bannerBackdrop)
    .composite([
      { input: bannerOverlaySvg, top: 0, left: 0 },
      { input: logoSmallBuffer, top: 130, left: 422 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(featureGraphicPath);
  console.log('✅ Generated Feature Graphic (1024x500):', featureGraphicPath);

  // =========================================================================
  // 4. Promotional Store Screenshots (5 Slides)
  //    Generates for:
  //    - Android: 1080x2400 (aspect ratio 20:9)
  //    - iOS: 1290x2796 (iPhone 15/16 Pro Max 6.7" standard)
  // =========================================================================
  const slides = [
    {
      id: '1_focus',
      image: 'onboarding-1-valley.webp',
      pill: '🌿 MINDFUL FOCUS GARDEN',
      title: 'Tumbuhkan Suaka Alami',
      desc: 'Selesaikan sesi fokusmu untuk memelihara pulau diorama 3D hidup',
    },
    {
      id: '2_zen',
      image: 'onboarding-5-twilight.webp',
      pill: '🎋 DISTRACTION-FREE ZEN',
      title: 'Hening Tanpa Gangguan',
      desc: 'Fokus mendalam dengan suara alam lembut dan musik lo-fi yang menenangkan',
    },
    {
      id: '3_workshop',
      image: 'sharecard.webp',
      pill: '🏞️ NATURE WORKSHOP',
      title: 'Bangun & Hias Duniamu',
      desc: 'Bebas tata pohon, kelokan sungai, jembatan kayu, dan fauna liar',
    },
    {
      id: '4_biomes',
      image: 'onboarding-6-lake.webp',
      pill: '🌸 4 SEASONAL BIOMES',
      title: 'Jelajahi 4 Tema Bioma',
      desc: 'Padang Rumput, Gugur Emas, Puncak Salju Zen, hingga Mata Air Teratai',
    },
    {
      id: '5_analytics',
      image: 'onboarding-3-cathedral.webp',
      pill: '📊 24-HOUR CIRCADIAN',
      title: 'Lacak Ritme Fokusmu',
      desc: 'Statistik sirkadian 24 jam & histori pencapaian yang tersimpan aman',
    },
  ];

  async function buildScreenshot(slide, width, height, targetPath) {
    const isPortrait = height > width;
    const imgSource = path.join(publicDir, slide.image);

    let baseImg;
    if (fs.existsSync(imgSource)) {
      baseImg = await sharp(imgSource)
        .resize(Math.round(width * 0.88), Math.round(height * 0.62), {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .toBuffer();
    } else {
      baseImg = await sharp({
        create: {
          width: Math.round(width * 0.88),
          height: Math.round(height * 0.62),
          channels: 4,
          background: '#0d3829',
        },
      }).png().toBuffer();
    }

    // Rounded corners for diorama card presentation
    const cardWidth = Math.round(width * 0.88);
    const cardHeight = Math.round(height * 0.62);
    const radius = Math.round(width * 0.04);

    const maskSvg = Buffer.from(`
      <svg width="${cardWidth}" height="${cardHeight}">
        <rect width="${cardWidth}" height="${cardHeight}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
      </svg>
    `);

    const roundedCard = await sharp(baseImg)
      .composite([{ input: maskSvg, blend: 'dest-in' }])
      .png()
      .toBuffer();

    function escapeXml(unsafe) {
      return String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    }

    // Typography header SVG
    const headerSvg = Buffer.from(`
      <svg width="${width}" height="${Math.round(height * 0.32)}" viewBox="0 0 ${width} ${Math.round(height * 0.32)}" xmlns="http://www.w3.org/2000/svg">
        <!-- Badge Pill -->
        <rect x="${width / 2 - 160}" y="70" width="320" height="42" rx="21" fill="#143e2e" stroke="#2dd4bf" stroke-width="1.5" stroke-opacity="0.5" />
        <text x="${width / 2}" y="97" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#5eead4" text-anchor="middle" letter-spacing="1.5">
          ${escapeXml(slide.pill)}
        </text>

        <!-- Main Title -->
        <text x="${width / 2}" y="175" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">
          ${escapeXml(slide.title)}
        </text>

        <!-- Subtitle / Tagline -->
        <text x="${width / 2}" y="222" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="#94a3b8" text-anchor="middle">
          ${escapeXml(slide.desc)}
        </text>
      </svg>
    `);

    // Canvas background with elegant dark emerald gradient
    const cardTop = Math.round(height * 0.32);
    const cardLeft = Math.round((width - cardWidth) / 2);

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: '#041711',
      },
    })
      .composite([
        { input: headerSvg, top: 0, left: 0 },
        { input: roundedCard, top: cardTop, left: cardLeft },
      ])
      .png({ compressionLevel: 8 })
      .toFile(targetPath);
  }

  for (const slide of slides) {
    // 1. Android Screenshot (1080x2400)
    const androidPath = path.join(screenshotsDir, `screenshot_${slide.id}_1080x2400.png`);
    await buildScreenshot(slide, 1080, 2400, androidPath);
    console.log(`✅ Generated Android Screenshot (${slide.id}):`, androidPath);

    // 2. iOS Screenshot (1290x2796)
    const iosPath = path.join(iosScreenshotsDir, `screenshot_${slide.id}_1290x2796.png`);
    await buildScreenshot(slide, 1290, 2796, iosPath);
    console.log(`✅ Generated iOS Screenshot (${slide.id}):`, iosPath);
  }

  console.log('✨ All Store Listing Assets successfully generated in:', outputDir);
}

generateStoreAssets().catch((err) => {
  console.error('Error generating store assets:', err);
  process.exit(1);
});
