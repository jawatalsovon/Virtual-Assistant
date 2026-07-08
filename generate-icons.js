const sharp = require('sharp');

const svg = `<svg width="1024" height="1024" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fbcfe8;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#c4b5fd;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#93c5fd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)" />
  <g transform="translate(256, 256)">
    <rect x="-55" y="-45" width="40" height="90" rx="20" ry="20" fill="white" />
    <rect x="15" y="-45" width="40" height="90" rx="20" ry="20" fill="white" />
  </g>
</svg>`;

sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .png()
  .toFile('assets/icon.png')
  .then(() => sharp(Buffer.from(svg))
    .resize(2732, 2732)
    .png()
    .toFile('assets/splash.png'))
  .then(() => console.log('success'))
  .catch(console.error);
