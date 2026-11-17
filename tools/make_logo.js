// Turns the 3 Year Gift Survey form's chest-logo image (white KX mountains logo on navy) into
// assets/logo-mask.png: white with transparency, cropped tight, so the page can tint it any print color.
const fs = require('fs'), path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');
(async () => {
  const b64 = fs.readFileSync(path.join(__dirname, 'form-logo.jpg')).toString('base64');
  const browser = await puppeteer.launch({ headless: 'new' }); const page = await browser.newPage();
  const out = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const im = x.getImageData(0, 0, W, H), d = im.data;
    const bgL = 0.3 * d[0] + 0.59 * d[1] + 0.11 * d[2];
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const L = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      const a = Math.max(0, Math.min(1, (L - bgL - 25) / (235 - bgL - 25)));
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
      if (a > 0.5) { const px = p % W, py = (p / W) | 0; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
    }
    x.putImageData(im, 0, 0);
    const pad = 6, cw = maxX - minX + 1 + pad * 2, chh = maxY - minY + 1 + pad * 2;
    const o = document.createElement('canvas'); const scale = Math.min(1, 1000 / cw);
    o.width = Math.round(cw * scale); o.height = Math.round(chh * scale);
    o.getContext('2d').drawImage(c, minX - pad, minY - pad, cw, chh, 0, 0, o.width, o.height);
    return { png: o.toDataURL('image/png').split(',')[1], w: o.width, h: o.height };
  }, b64);
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'logo-mask.png'), Buffer.from(out.png, 'base64'));
  console.log('logo-mask.png', out.w + 'x' + out.h);
  await browser.close();
})();
