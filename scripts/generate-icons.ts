import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#181c28"/>
      <stop offset="50%" stop-color="#0e111a"/>
      <stop offset="100%" stop-color="#06070a"/>
    </linearGradient>

    <!-- Main GS Orange / Amber Flame Gradient -->
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7e33"/>
      <stop offset="45%" stop-color="#f26822"/>
      <stop offset="85%" stop-color="#d84315"/>
      <stop offset="100%" stop-color="#b71c1c"/>
    </linearGradient>

    <!-- Inner Plate Highlight -->
    <linearGradient id="plateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff9d5c" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#f26822"/>
      <stop offset="100%" stop-color="#bf360c"/>
    </linearGradient>

    <!-- Border Glow -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffab70" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#f26822" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1"/>
    </linearGradient>

    <!-- Filter for 3D Drop Shadow -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#f26822" flood-opacity="0.35"/>
    </filter>

    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="8" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Outer Dark App Icon Squircle Background -->
  <rect x="32" y="32" width="960" height="960" rx="220" ry="220" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="8"/>

  <!-- Inner Vibrant GS Shield / Badge Plate -->
  <g filter="url(#dropShadow)">
    <rect x="128" y="128" width="768" height="768" rx="180" ry="180" fill="url(#plateGrad)" stroke="#ffffff" stroke-width="4" stroke-opacity="0.25"/>
  </g>

  <!-- Inner Highlight Sheen on Top of Badge -->
  <path d="M 148 270 C 148 185, 210 148, 290 148 L 734 148 C 814 148, 876 185, 876 270 C 876 340, 750 440, 512 440 C 274 440, 148 340, 148 270 Z" fill="#ffffff" opacity="0.15" />

  <!-- Bold Monolithic 'GS' Typography -->
  <g filter="url(#textShadow)">
    <text 
      x="512" 
      y="635" 
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
      font-size="440" 
      font-weight="900" 
      letter-spacing="-22" 
      fill="#ffffff" 
      text-anchor="middle"
      style="text-shadow: 0 10px 30px rgba(0,0,0,0.6);"
    >GS</text>
  </g>

  <!-- Bottom Mini Accent Line -->
  <rect x="384" y="740" width="256" height="12" rx="6" fill="#ffffff" opacity="0.4" />
</svg>`;

async function generate() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Save SVG
  const svgPath = path.join(publicDir, 'logo.svg');
  const faviconSvgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, svgContent);
  fs.writeFileSync(faviconSvgPath, svgContent);
  console.log('Saved SVG logos');

  const svgBuffer = Buffer.from(svgContent);

  // 2. 1024x1024 PNG (Recommended size for WebIntoApp / App Builders)
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-1024x1024.png'));
  console.log('Saved 1024x1024 PNG icon');

  // Copy as main app icon
  fs.copyFileSync(
    path.join(publicDir, 'icon-1024x1024.png'),
    path.join(publicDir, 'app-icon.png')
  );

  // 3. 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512x512.png'));

  // 4. 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192x192.png'));

  // 5. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Favicon 64x64 & 32x32
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
