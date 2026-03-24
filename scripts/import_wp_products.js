/**
 * import_wp_products.js
 *
 * Scrapes product data from the live mariagebruidsmode.nl WordPress site and
 * updates matching products in Supabase with the structured attribute fields:
 * pasvorm, hals, mouw, materialen, kleur, maten, categorieen, sale_price, price_range, description.
 *
 * Usage:
 *   node scripts/import_wp_products.js
 *
 * Dry-run (no writes):
 *   DRY_RUN=1 node scripts/import_wp_products.js
 *
 * Single product:
 *   SLUG=white-one-trouwjurk-tsubaki node scripts/import_wp_products.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.split('=').map((p, i) => (i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim())))
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.env.DRY_RUN === '1';
const SINGLE_SLUG = process.env.SLUG;
const BASE_URL = 'https://www.mariagebruidsmode.nl/online-bruidsmode/';

// ── Mapping tables ────────────────────────────────────────────────────────────

const PASVORM_MAP = {
  'a-lijn': 'a-lijn', 'a lijn': 'a-lijn',
  'fit and flare': 'fit-and-flare', 'fit & flare': 'fit-and-flare', 'fit-and-flare': 'fit-and-flare',
  'prinses': 'prinses', 'princess': 'prinses',
  'soepelvallend': 'soepelvallend', 'soepel vallend': 'soepelvallend', 'column': 'soepelvallend',
  'zeemeermin': 'zeemeermin', 'mermaid': 'zeemeermin', 'trumpet': 'zeemeermin',
};

const HALS_MAP = {
  'strapless': 'strapless',
  'hooggesloten': 'hooggesloten', 'high neck': 'hooggesloten', 'high-neck': 'hooggesloten',
  'v-hals': 'v-hals', 'v hals': 'v-hals', 'v-neck': 'v-hals',
  'recht': 'recht', 'straight': 'recht',
  'boothals': 'boothals', 'boat neck': 'boothals', 'bateau': 'boothals',
  'diep decolleté': 'diep-decollote', 'diep decollote': 'diep-decollote', 'plunging': 'diep-decollote',
  'sweetheart': 'sweetheart',
  'off-shoulder': 'off-shoulder', 'off shoulder': 'off-shoulder',
};

const MOUW_MAP = {
  'strapless': 'strapless',
  'mouwloos': 'mouwloos', 'sleeveless': 'mouwloos',
  'schouderbandjes': 'schouderbandjes', 'spaghetti': 'schouderbandjes',
  'korte mouwen': 'korte-mouwen', 'korte mouw': 'korte-mouwen', 'short sleeves': 'korte-mouwen',
  'lange mouwen': 'lange-mouwen', 'lange mouw': 'lange-mouwen', 'long sleeves': 'lange-mouwen',
  'off-shoulder': 'off-shoulder', 'off shoulder': 'off-shoulder',
  '3/4 mouwen': '3-kwart-mouwen', '3/4': '3-kwart-mouwen',
};

const MATERIAAL_MAP = {
  'crêpe': 'crepe', 'crepe': 'crepe', 'crepé': 'crepe',
  'kant': 'kant', 'lace': 'kant',
  'chiffon': 'chiffon',
  'mikado': 'mikado',
  'organza': 'organza',
  'satijn': 'satijn', 'satin': 'satijn',
  'tule': 'tule', 'tulle': 'tule',
  'zijde': 'zijde', 'silk': 'zijde',
  'jersey': 'jersey',
};

const KLEUR_MAP = {
  'wit': 'wit', 'white': 'wit',
  'ivoor': 'ivoor', 'ivory': 'ivoor',
  'champagne': 'champagne',
  'roze': 'roze', 'pink': 'roze', 'blush': 'roze',
  'nude': 'nude',
  'beige': 'beige',
  'blauw': 'blauw', 'blue': 'blauw',
  'grijs': 'grijs', 'gray': 'grijs', 'grey': 'grijs',
  'groen': 'groen', 'green': 'groen',
  'bruin': 'bruin', 'brown': 'bruin',
  'bordeaux': 'bordeaux-roze', 'bordeaux & roze': 'bordeaux-roze',
};

const CATEG_MAP = {
  'klassiek': 'klassiek', 'klassieke': 'klassiek', 'classic': 'klassiek',
  'bohemian': 'bohemian', 'boho': 'bohemian',
  'romantisch': 'romantisch', 'romantische': 'romantisch', 'romantic': 'romantisch',
  'strak': 'strak', 'strakke': 'strak', 'fitted': 'strak',
  'open rug': 'open-rug', 'open-rug': 'open-rug', 'open back': 'open-rug',
  'sexy': 'sexy',
  'simpel': 'simpel', 'simpele': 'simpel', 'simple': 'simpel',
  'vintage': 'vintage',
  'lange sleep': 'lange-sleep', 'long train': 'lange-sleep',
  'met split': 'met-split', 'split': 'met-split', 'slit': 'met-split',
  'grote maat': 'grote-maat', 'plus size': 'grote-maat',
  'outlet': 'outlet',
  'met mouwen': 'strak', // mouwen -> strak is not quite right but used as fallback
};

function mapMulti(map, text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const results = new Set();
  for (const [term, key] of Object.entries(map)) {
    if (lower.includes(term)) results.add(key);
  }
  return [...results];
}

function mapSingle(map, text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [term, key] of Object.entries(map)) {
    if (lower.includes(term)) return key;
  }
  return null;
}

// ── Scraper ───────────────────────────────────────────────────────────────────

async function fetchProductPage(wpSlug) {
  const url = `${BASE_URL}${wpSlug}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractText(html, pattern) {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
}

function decodePrice(html) {
  // Strip tags, decode HTML entities, extract number like "2.995,00"
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&euro;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/incl\..*/i, '')
    .replace(/[^\d.,]/g, '')
    .trim() || null;
}

function parseProductHtml(html, wpSlug) {
  // Price — from first class="price" element on the page (= current product)
  const priceBlock = html.match(/class="price"[^>]*>([\s\S]{0,600}?)<\/span>\s*(?:<small|<\/div>)/)?.[1] ?? '';

  // Check for sale price: <del>original</del> <ins>sale</ins>
  const delBlock = priceBlock.match(/<del[\s\S]*?<\/del>/)?.[0] ?? '';
  const insBlock = priceBlock.match(/<ins[\s\S]*?<\/ins>/)?.[0] ?? '';
  const hasSale = insBlock.length > 0;

  const regularPrice = hasSale ? decodePrice(delBlock) : decodePrice(priceBlock);
  const salePrice    = hasSale ? decodePrice(insBlock) : null;

  // Description — WooCommerce short description
  const descMatch = html.match(/class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const description = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : null;

  // Product attributes table
  const attrsHtml = html.match(/class="[^"]*woocommerce-product-attributes[^"]*"[^>]*>([\s\S]*?)<\/table>/)?.[1] ?? '';
  function attrVal(label) {
    const re = new RegExp(label + '[^<]*<\\/th>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>', 'i');
    const m = attrsHtml.match(re);
    return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
  }

  const pasvormRaw  = attrVal('silhouet') ?? attrVal('pasvorm');
  const halsRaw     = attrVal('hals') ?? attrVal('decolleté') ?? attrVal('neckline');
  const mouwRaw     = attrVal('mouw') ?? attrVal('sleeve');
  const materiaalRaw = attrVal('materiaal') ?? attrVal('stof') ?? attrVal('fabric');
  const kleurRaw    = attrVal('kleur') ?? attrVal('colour') ?? attrVal('color');

  // Categories from WooCommerce posted_in (product's own categories only)
  const postedIn = html.match(/class="[^"]*posted_in[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '';
  const categRaw = postedIn.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Sizes from variation selects
  const sizesHtml = html.match(/value="(\d{2})"[^>]*>/g) ?? [];
  const maten = [...new Set(sizesHtml.map((s) => s.match(/value="(\d{2})"/)?.[1]).filter(Boolean))].sort();

  return {
    price_range: regularPrice ? `€ ${regularPrice}` : null,
    sale_price:  salePrice    ? `€ ${salePrice}`    : null,
    description,
    pasvorm:    mapSingle(PASVORM_MAP, pasvormRaw ?? ''),
    hals:       mapSingle(HALS_MAP,   halsRaw ?? ''),
    mouw:       mapSingle(MOUW_MAP,   mouwRaw ?? ''),
    materialen: mapMulti(MATERIAAL_MAP, materiaalRaw ?? ''),
    kleur:      mapMulti(KLEUR_MAP,    kleurRaw ?? ''),
    maten,
    categorieen: mapMulti(CATEG_MAP, categRaw),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch all products from Supabase
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, brand');

  if (error) { console.error('Supabase error:', error); process.exit(1); }

  const targets = SINGLE_SLUG
    ? products.filter((p) => p.slug === SINGLE_SLUG)
    : products;

  console.log(`\nVerwerken: ${targets.length} product(en)${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  for (const product of targets) {
    // Build WP slug: the WP slugs often follow {brand}-trouwjurk-{model}
    const brandSlug = product.brand?.toLowerCase().replace(/\s+/g, '-') ?? '';
    // Strip brand prefix from DB slug to get model part
    const modelPart = brandSlug && product.slug.startsWith(brandSlug + '-')
      ? product.slug.slice(brandSlug.length + 1)
      : product.slug.replace(/^[^-]+-(?:[^-]+-)?/, '') || product.slug;

    const wpSlugs = [
      product.slug,
      brandSlug ? `${brandSlug}-trouwjurk-${modelPart}` : null,
      brandSlug ? `${brandSlug}-trouwjurk-${product.slug}` : null,
      `trouwjurk-outlet-${product.slug}`,
    ].filter(Boolean);

    let parsed = null;
    let usedSlug = null;

    for (const wpSlug of wpSlugs) {
      try {
        console.log(`  Fetching: ${BASE_URL}${wpSlug}/`);
        const html = await fetchProductPage(wpSlug);
        if (html.includes('woocommerce-product') || html.includes('product_title')) {
          parsed = parseProductHtml(html, wpSlug);
          usedSlug = wpSlug;
          break;
        }
      } catch (e) {
        // try next slug
      }
    }

    if (!parsed) {
      console.warn(`  ⚠ Niet gevonden: ${product.name} (slug: ${product.slug})`);
      continue;
    }

    console.log(`  ✓ ${product.name}`);
    console.log(`    pasvorm:    ${parsed.pasvorm ?? '–'}`);
    console.log(`    hals:       ${parsed.hals ?? '–'}`);
    console.log(`    mouw:       ${parsed.mouw ?? '–'}`);
    console.log(`    materialen: ${parsed.materialen.join(', ') || '–'}`);
    console.log(`    kleur:      ${parsed.kleur.join(', ') || '–'}`);
    console.log(`    maten:      ${parsed.maten.join(', ') || '–'}`);
    console.log(`    categorieen:${parsed.categorieen.join(', ') || '–'}`);
    console.log(`    prijs:      ${parsed.price_range ?? '–'}  aanbieding: ${parsed.sale_price ?? '–'}`);

    if (!DRY_RUN) {
      const update = {};
      if (parsed.pasvorm)            update.pasvorm = parsed.pasvorm;
      if (parsed.hals)               update.hals = parsed.hals;
      if (parsed.mouw)               update.mouw = parsed.mouw;
      if (parsed.materialen.length)  update.materialen = parsed.materialen;
      if (parsed.kleur.length)       update.kleur = parsed.kleur;
      if (parsed.maten.length)       update.maten = parsed.maten;
      if (parsed.categorieen.length) update.categorieen = parsed.categorieen;
      if (parsed.price_range)        update.price_range = parsed.price_range;
      if (parsed.sale_price)         update.sale_price = parsed.sale_price;
      if (parsed.description)        update.description = parsed.description;

      if (Object.keys(update).length > 0) {
        const { error: uErr } = await supabase.from('products').update(update).eq('id', product.id);
        if (uErr) console.error(`    ✗ Fout bij opslaan:`, uErr.message);
        else      console.log(`    ✓ Opgeslagen`);
      }
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log('\nKlaar.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
