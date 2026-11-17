// Picks the flat FRONT photo for every color and (re)writes assets/<garment>/<color>.jpg.
// Bella+Canvas doesn't number views the same way for every color (front/back flats and model shots move
// around), so: list each color's photos by selecting it on the product page (select2 event), then compare
// every photo's thumbnail to a known front flat and a known back flat of that garment (edge-map
// correlation) and keep the one that looks most like the front and least like the back.
//   node pick_fronts.js            all garments
//   node pick_fronts.js hoodie     one garment
const fs = require('fs'), path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');
const SITE = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const B = 'https://www.bellacanvas.com/bella/product/';
const PRODUCTS = [
  // front/back = Black (hoodie: cords + pocket; crewneck: neck tag) and Solid White Blend (long sleeve) flats
  { id: 'hoodie', style: '3719', url: 'https://www.bellacanvas.com/product/3719/Unisex-Sponge-Fleece-Pullover-Hoodie.html', front: '37190155_1.jpg', back: '37190166_1.jpg' },
  { id: 'crewneck', style: '3945', url: 'https://www.bellacanvas.com/product/3945/Unisex-Sponge-Fleece-Drop-Shoulder-Sweatshirt.html', front: '39450111_1.jpg', back: '39450122_1.jpg' },
  { id: 'longsleeve', style: '3501CVC', url: 'https://www.bellacanvas.com/product/3501CVC/Unisex-Heather-CVC-Long-Sleeve-Tee.html', front: '3501CVC0012355_1.jpg', back: '3501CVC0012366_1.jpg' },
];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://www.bellacanvas.com/' } }); return r.ok && /image/.test(r.headers.get('content-type') || '') ? Buffer.from(await r.arrayBuffer()) : null; };

(async () => {
  const only = process.argv[2];
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1400, height: 1000 });
  const work = await browser.newPage();
  // Edge map of a thumbnail, normalized: garment silhouette details (cords, pocket, neck tag) dominate it.
  const edges = b64 => work.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const W = 72, H = 90, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data, g = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    const e = [];
    for (let y = 1; y < H - 1; y++) for (let k = 1; k < W - 1; k++) {
      const i = y * W + k, gx = g[i + 1] - g[i - 1], gy = g[i + W] - g[i - W];
      e.push(Math.sqrt(gx * gx + gy * gy));
    }
    const m = e.reduce((a, b) => a + b, 0) / e.length, s = Math.sqrt(e.reduce((a, b) => a + (b - m) ** 2, 0) / e.length) || 1;
    // Flat product shots have plain background along the bottom; model shots have legs/pants there.
    const bg = [d[0], d[1], d[2]]; let plain = 0, n = 0;
    for (let y = Math.floor(H * 0.9); y < H; y++) for (let k = 0; k < W; k++, n++) {
      const i = (y * W + k) * 4;
      if (Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) < 18) plain++;
    }
    return { e: e.map(v => (v - m) / s), flat: plain / n > 0.85 };
  }, b64);
  const corr = (a, b) => a.e.reduce((t, v, i) => t + v * b.e[i], 0) / a.e.length;
  const resize = (buf, w, q) => work.evaluate(async (b64, w, q) => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = Math.round(img.naturalHeight * w / img.naturalWidth);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q).split(',')[1];
  }, buf.toString('base64'), w, q);

  const report = [];
  for (const p of PRODUCTS.filter(p => !only || p.id === only)) {
    const refFront = await edges((await get(B + 'thumb/' + p.front)).toString('base64'));
    const refBack = await edges((await get(B + 'thumb/' + p.back)).toString('base64'));
    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('#mainColorSwatchSelect', { timeout: 30000 });
    const names = await page.evaluate(() => [...document.querySelectorAll('#mainColorSwatchSelect option')].map(o => o.textContent.trim()));
    for (const name of names) {
      // Wait until the gallery shows this color's photos (file names carry <style><color code>).
      const views = await page.evaluate(async (name, style) => {
        const $ = window.jQuery; const sel = $('#mainColorSwatchSelect');
        const opt = [...sel[0].options].find(o => o.textContent.trim() === name);
        sel.val(opt.value).trigger('change'); sel.trigger({ type: 'select2:select', params: { data: { id: opt.value, element: opt } } });
        const mine = () => [...new Set([...document.querySelectorAll('img')].map(i => i.src).filter(s => s.includes('/hires/')))]
          .map(u => u.split('/').pop()).filter(f => f.toLowerCase().startsWith((style + opt.value).toLowerCase()));
        // The gallery fills in over a second or two: wait until the list stops growing (up to ~12 s).
        let last = -1, still = 0;
        for (let t = 0; t < 48 && still < 6; t++) {
          await new Promise(r => setTimeout(r, 250));
          const n = mine().length;
          still = n && n === last ? still + 1 : 0; last = n;
        }
        // A few colors name their files differently; then take whatever the gallery shows.
        return mine().length ? mine() : [...new Set([...document.querySelectorAll('img')].map(i => i.src).filter(s => s.includes('/hires/')))].map(u => u.split('/').pop());
      }, name, p.style);
      let best = null;
      for (const f of views) {
        const t = await get(B + 'thumb/' + f); if (!t) continue;
        const e = await edges(t.toString('base64'));
        const score = corr(refFront, e) - corr(refBack, e) + (e.flat ? 10 : 0); // any flat beats any model shot
        if (!best || score > best.score) best = { f, score };
      }
      if (!best) { report.push(p.id + ' ' + name + ': NO PHOTO'); continue; }
      const hi = await get(B + 'hires/' + best.f);
      fs.writeFileSync(path.join(SITE, 'assets', p.id, slug(name) + '.jpg'), Buffer.from(await resize(hi, 640, 0.82), 'base64'));
      report.push(`${p.id} ${name}: ${best.f} (${best.score.toFixed(2)}) of ${views.length}`);
      process.stdout.write('.');
    }
    console.log('\n' + p.id + ' done');
  }
  fs.writeFileSync(path.join(__dirname, 'fronts.txt'), report.join('\n') + '\n');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
