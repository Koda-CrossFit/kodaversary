# Koda 3 Year Kodaversary Gift

The page members fill out when they're up for their 3 year anniversary gift at Koda CrossFit Iron View: https://koda-crossfit.github.io/kodaversary/

It replaces the "3 Year Gift Survey" Google Form (https://forms.gle/AkhvVdvScPhF4C6s9). Members pick:

1. **Garment:**
   - Hoodie: Bella+Canvas 3719 Sponge Fleece Pullover Hoodie
   - Crewneck: Bella+Canvas 3945 Sponge Fleece Drop Shoulder Sweatshirt
   - Long Sleeve: Bella+Canvas 3501CVC Heather CVC Long Sleeve Tee
   - **Other:** a short answer for any Bella+Canvas garment, with a link to bellacanvas.com
2. **Garment color.** Every color Bella+Canvas lists for that style, shown on a real photo of the garment.
3. **Print color** for the KX mountains chest logo. These are the same 16 colors as the Koda Fundraiser (Fiona Noyes / Julie Rappaport) order.
4. **Size:** XS–XXL, same as the form.

The preview shows the logo in the chosen print color on the chosen garment and color.

## Where answers go

Each submission adds a row to the **Website** tab of Kevin's Google Sheet "3 Year Gift Survey (Responses)" (`1bzk0Xd3T08LKjXhsXTDmw7N__1FuhuoqzCL36uzFWTk`). The old form's answers stay on "Form Responses 1" in the same file. The columns are:

- Timestamp
- Name
- Garment
- Garment Color
- Size
- Print Color
- Other Garment

Nobody gets an email. If someone submits twice, use the newest row.

The backend is the shared "hyrox" Apps Script web app: `Desktop\Claude\hyrox-simulation-signup\apps-script\Kodaversary.js`, `type: "kodaversary"`. The page posts to deployment `AKfycbwWjHrhE6k3vVPDXD4qi3VLxZVAXMykAFIKocoUiq0BtXdv2XLy7Oo0GRfrP48fHytnyw`, first deployed as version 72. That folder's README has the clasp push/deploy steps. `?action=kodaversaryClearTests` deletes rows whose name starts with "Test (Claude)".

The anniversaries dashboard reads this tab along with the form's tab (`~/.claude/skills/anniversaries`, survey step).

## Files

- `index.html`: the whole page. GitHub Pages serves `main`, so a push is live in about a minute.
- `colors.js`: the garment colors (name, hex, photo, swatch), generated from bellacanvas.com.
- `assets/<garment>/<color>.jpg`: one flat front photo per color. `sw-*.jpg` files are Bella's heather swatch chips.
- `assets/logo-mask.png`: the KX mountains + KODA IRON VIEW logo as a white, transparent image. The page tints it with CSS masks, so preview it over http (not file://).
- `assets/ocean.jpg`, `assets/snow-camo.jpg`: the two patterned print colors.

## Refreshing colors and photos (if Bella+Canvas adds or drops colors)

Run these from `tools/`, in order:

1. `node fetch_assets.js` rebuilds `colors.js` and downloads a photo for each color. Its photo picks can be back views or model shots.
2. `node pick_fronts.js` replaces each photo with the true flat front. It selects every color on the product page and compares each photo with known front and back flats.
3. `node recolor_flat.js longsleeve heather-military-green heather-forest https://www.bellacanvas.com/bella/product/hires/3501cvc0018411_2.jpg` makes the long sleeve Heather Forest flat. Bella only has model photos of that color.
4. `node qa_sheet.js <out.png> [garment] [width]` puts every photo on one sheet to eyeball.

`node shots.js <out dir>` screenshots the page and each garment's preview at desktop and phone width. It serves the page over http and submits nothing.

The logo position on each garment is `print: { x, y, w }` in `GARMENTS` in `index.html`.
