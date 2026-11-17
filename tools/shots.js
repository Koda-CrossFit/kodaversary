// Screenshots of the page for checking the mockup: each garment's preview, then the full page at phone and
// desktop width. Nothing is submitted.
//   node shots.js <out dir>
const fs = require('fs'), path = require('path'), http = require('http');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');
const out = process.argv[2];
const SITE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  // Served over http like GitHub Pages: browsers refuse CSS masks (the logo) on file:// pages.
  const server = http.createServer((q, s) => {
    const f = path.join(SITE, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!f.startsWith(SITE) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
  }).listen(0);
  const page_ = `http://localhost:${server.address().port}/`;
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(page_, { waitUntil: 'networkidle0' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const [i, g] of ['Hoodie', 'Crewneck', 'Long Sleeve'].entries()) {
    await page.evaluate(n => [...document.querySelectorAll('.garment')].find(b => b.querySelector('b').textContent === n).click(), g);
    await new Promise(r => setTimeout(r, 600));
    const stage = await page.$('.stage');
    await stage.screenshot({ path: path.join(out, `stage-${i}-${g.replace(' ', '')}.png`) });
  }
  await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(out, 'phone.png'), fullPage: true });
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  server.close();
})();
