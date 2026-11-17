// Makes a flat-front photo for a color Bella+Canvas only shows on a model, by recoloring a similar color's
// flat: per-channel scaling so the base flat's chest color becomes the model photo's chest color.
// The light background stays as it is.
//   node recolor_flat.js <garment> <base color slug> <target color slug> <model photo url>
const fs = require('fs'), path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');
const [garment, baseSlug, targetSlug, modelUrl] = process.argv.slice(2);
const dir = path.join(__dirname, '..', 'assets', garment);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

(async () => {
  const model = Buffer.from(await (await fetch(modelUrl, { headers: { 'User-Agent': UA, Referer: 'https://www.bellacanvas.com/' } })).arrayBuffer());
  const base = fs.readFileSync(path.join(dir, baseSlug + '.jpg'));
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const out = await page.evaluate(async (baseB64, modelB64) => {
    const load = async b64 => { const i = new Image(); i.src = 'data:image/jpeg;base64,' + b64; await i.decode(); return i; };
    const [b, m] = [await load(baseB64), await load(modelB64)];
    const median = (img, fx, fy, fw, fh) => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(Math.round(c.width * fx), Math.round(c.height * fy), Math.round(c.width * fw), Math.round(c.height * fh)).data;
      const ch = [[], [], []]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
      return ch.map(a => a.sort((p, q) => p - q)[a.length >> 1]);
    };
    const from = median(b, 0.42, 0.40, 0.16, 0.12);   // flat: middle of the chest
    const to = median(m, 0.44, 0.34, 0.12, 0.10);     // model photo: center chest
    const c = document.createElement('canvas'); c.width = b.naturalWidth; c.height = b.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(b, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data, bg = [d[0], d[1], d[2]];
    for (let i = 0; i < d.length; i += 4) {
      if (Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) < 10) continue;
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * to[k] / Math.max(1, from[k]));
    }
    x.putImageData(im, 0, 0);
    return { b64: c.toDataURL('image/jpeg', 0.85).split(',')[1], from, to };
  }, base.toString('base64'), model.toString('base64'));
  fs.writeFileSync(path.join(dir, targetSlug + '.jpg'), Buffer.from(out.b64, 'base64'));
  console.log('recolored', baseSlug, out.from, '->', targetSlug, out.to);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
