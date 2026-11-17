// QA: every downloaded flat-front photo on one sheet.
//   node qa_sheet.js <out.png> [garment] [thumb width]
const fs = require('fs'), path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');
const SITE = path.join(__dirname, '..');
const C = new Function(fs.readFileSync(path.join(SITE, 'colors.js'), 'utf8') + '\nreturn GARMENT_COLORS;')();
const url = f => 'file:///' + path.join(SITE, f).split(path.sep).join('/');
const only = process.argv[3], W = Number(process.argv[4] || 96);

(async () => {
  const html = Object.entries(C).filter(([g]) => !only || g === only).map(([g, cs]) => `<h4>${g}</h4>` + cs.map(c =>
    `<figure style="display:inline-block;margin:2px;width:${W}px;text-align:center"><img src="${url(c.img)}" style="width:${W}px">` +
    `<figcaption style="font-size:9px">${c.name}</figcaption></figure>`).join('')).join('');
  const sheet = path.join(__dirname, '_qa.html');
  fs.writeFileSync(sheet, `<body style="font:11px sans-serif;margin:4px">${html}</body>`);
  const browser = await puppeteer.launch({ headless: 'new' }); const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 800 });
  await page.goto('file:///' + sheet.split(path.sep).join('/'), { waitUntil: 'load' });
  await page.screenshot({ path: process.argv[2], fullPage: true }); await browser.close();
  fs.unlinkSync(sheet);
})();
