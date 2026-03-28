/**
 * import_wp_suits.js
 *
 * Scrapes suit product data from the live mariagebruidsmode.nl WordPress site,
 * creates missing suit products/collections in Supabase, and updates all suits
 * with: kleur, maten, materialen, categorieen, price_range, description, images.
 *
 * Usage:
 *   node scripts/import_wp_suits.js
 *
 * Dry-run (no writes):
 *   DRY_RUN=1 node scripts/import_wp_suits.js
 *
 * Single product by WP slug:
 *   SLUG=immediate-trouwpak-24103 node scripts/import_wp_suits.js
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
const LISTING_URL = 'https://www.mariagebruidsmode.nl/bruidsmode/trouwpakken/';

// ── Mapping tables ────────────────────────────────────────────────────────────

const KLEUR_MAP = {
  'groene trouwpakken': 'groen', 'groen': 'groen', 'olijfgroen': 'groen', 'green': 'groen',
  'blauwe trouwpakken': 'blauw', 'blauw': 'blauw', 'blue': 'blauw', 'lichtblauw': 'blauw',
  'navy': 'navy', 'donkerblauw': 'navy', 'dark blue': 'navy', 'navy blue': 'navy',
  'beige trouwpakken': 'beige', 'beige': 'beige', 'ecru': 'beige', 'camel': 'beige',
  'grijze trouwpakken': 'grijs', 'grijs': 'grijs', 'gray': 'grijs', 'grey': 'grijs',
  'bruine trouwpakken': 'bruin', 'bruin': 'bruin', 'brown': 'bruin', 'terra': 'bruin',
  'bordeaux en roze trouwpakken': 'bordeaux-roze', 'bordeaux': 'bordeaux-roze',
  'zwart': 'zwart', 'black': 'zwart',
};

const MATERIAAL_MAP = {
  'wol': 'wol', 'wool': 'wol', 'wolmix': 'wol', 'wool blend': 'wol',
  'katoen': 'katoen', 'cotton': 'katoen',
  'linnen': 'linnen', 'linen': 'linnen',
  'polyester': 'polyester',
  'viscose': 'viscose',
  'satijn': 'satijn', 'satin': 'satijn',
};

const CATEG_MAP = {
  'klassiek': 'klassiek', 'classic': 'klassiek',
  'modern': 'modern',
  'slim fit': 'slim-fit', 'slim-fit': 'slim-fit',
  'outlet': 'outlet',
};

function mapSingle(map, text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [term, key] of Object.entries(map)) {
    if (lower.includes(term)) return key;
  }
  return null;
}

function mapMulti(map, text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const results = new Set();
  for (const [term, key] of Object.entries(map)) {
    if (lower.includes(term)) results.add(key);
  }
  return [...results];
}

// ── Scraper ───────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function decodePrice(html) {
  const cleaned = html
    .replace(/<[^>]+>/g, '')
    .replace(/&euro;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/incl\..*/i, '')
    .replace(/[^\d.,]/g, '')
    .trim();
  // Take only the first price if multiple are concatenated (grouped products)
  const first = cleaned.match(/[\d.]+,\d{2}/)?.[0] ?? cleaned.match(/[\d.]+/)?.[0] ?? null;
  return first || null;
}

function parseSuitHtml(html) {
  // Price
  const priceBlock = html.match(/class="price"[^>]*>([\s\S]{0,600}?)<\/span>\s*(?:<small|<\/div>)/)?.[1] ?? '';
  const delBlock = priceBlock.match(/<del[\s\S]*?<\/del>/)?.[0] ?? '';
  const insBlock = priceBlock.match(/<ins[\s\S]*?<\/ins>/)?.[0] ?? '';
  const hasSale = insBlock.length > 0;
  const regularPrice = hasSale ? decodePrice(delBlock) : decodePrice(priceBlock);
  const salePrice    = hasSale ? decodePrice(insBlock) : null;

  // Description
  const descMatch = html.match(/class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const description = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : null;

  // Attributes table
  const attrsHtml = html.match(/class="[^"]*woocommerce-product-attributes[^"]*"[^>]*>([\s\S]*?)<\/table>/)?.[1] ?? '';
  function attrVal(label) {
    const re = new RegExp(label + '[^<]*<\\/th>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>', 'i');
    const m = attrsHtml.match(re);
    return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
  }

  const kleurRaw    = attrVal('kleur') ?? attrVal('colour') ?? attrVal('color');
  const materiaalRaw = attrVal('materiaal') ?? attrVal('stof') ?? attrVal('fabric');

  // Categories from posted_in
  const postedIn = html.match(/class="[^"]*posted_in[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '';
  const categRaw = postedIn.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Sizes from variation selects (men's 44–58)
  const sizesHtml = html.match(/value="(\d{2})"[^>]*>/g) ?? [];
  const maten = [...new Set(
    sizesHtml.map((s) => s.match(/value="(\d{2})"/)?.[1]).filter(Boolean)
  )].filter((m) => parseInt(m) >= 44 && parseInt(m) <= 58).sort();

  // Images from gallery (data-large_image attribute)
  const imageMatches = html.match(/data-large_image="(https:\/\/[^"]+\.(jpg|jpeg|png|webp))"/gi) ?? [];
  const images = [...new Set(imageMatches.map((m) => m.match(/data-large_image="([^"]+)"/i)?.[1]).filter(Boolean))];

  // Kleur: try attribute first, then fall back to categories
  const kleurFromAttr  = mapMulti(KLEUR_MAP, kleurRaw ?? '');
  const kleurFromCateg = mapMulti(KLEUR_MAP, categRaw);
  const kleur = kleurFromAttr.length ? kleurFromAttr : kleurFromCateg;

  return {
    price_range:  regularPrice ? `€ ${regularPrice}` : null,
    sale_price:   salePrice    ? `€ ${salePrice}`    : null,
    description,
    kleur,
    materialen:   mapMulti(MATERIAAL_MAP, materiaalRaw ?? ''),
    categorieen:  mapMulti(CATEG_MAP, categRaw),
    maten,
    images,
  };
}

// ── Brand → collection mapping ────────────────────────────────────────────────

const BRAND_SLUGS = {
  'immediate':       'immediate',
  'roberto vicentti': 'roberto-vicentti',
  'crinoligne':      'crinoligne',
  'cleofe finati':   'cleofe-finati',
};

function brandFromWpSlug(wpSlug) {
  // Pattern 1: {brand}-trouwpak-{model}
  const idx = wpSlug.indexOf('-trouwpak-');
  if (idx > 0) return wpSlug.slice(0, idx);
  // Pattern 2: trouwpak-{brand}-{model}  (older WP URL style)
  if (wpSlug.startsWith('trouwpak-')) {
    const rest = wpSlug.slice('trouwpak-'.length);
    // Try to match known brands
    for (const brandSlug of Object.values(BRAND_SLUGS)) {
      if (rest.startsWith(brandSlug + '-')) return brandSlug;
    }
    // Fallback: first word is brand
    return rest.split('-')[0];
  }
  return null;
}

function modelFromWpSlug(wpSlug) {
  // Pattern 1: {brand}-trouwpak-{model}
  const idx = wpSlug.indexOf('-trouwpak-');
  if (idx > 0) return wpSlug.slice(idx + '-trouwpak-'.length);
  // Pattern 2: trouwpak-{brand}-{model}
  if (wpSlug.startsWith('trouwpak-')) {
    const rest = wpSlug.slice('trouwpak-'.length);
    for (const brandSlug of Object.values(BRAND_SLUGS)) {
      if (rest.startsWith(brandSlug + '-')) return rest.slice(brandSlug.length + 1);
    }
    const parts = rest.split('-');
    return parts.slice(1).join('-') || parts[0];
  }
  return wpSlug;
}

function normalizeBrandSlug(slug) {
  // Fix known typos from WP
  if (!slug) return slug;
  if (slug === 'crinologine') return 'crinoligne';
  return slug;
}

function brandNameFromSlug(brandSlug) {
  for (const [name, slug] of Object.entries(BRAND_SLUGS)) {
    if (slug === brandSlug || name.replace(/\s+/g, '-') === brandSlug) return name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  return brandSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ── WP listing scraper ────────────────────────────────────────────────────────

async function fetchAllWpSuitSlugs() {
  const slugs = new Set();
  for (let page = 1; page <= 3; page++) {
    const url = page === 1 ? LISTING_URL : `${LISTING_URL}page/${page}/`;
    try {
      const html = await fetchPage(url);
      const matches = html.match(/https:\/\/www\.mariagebruidsmode\.nl\/online-bruidsmode\/[^"<\s]*trouwpak[^"<\s]*/g) ?? [];
      matches.forEach((u) => {
        const slug = u.replace('https://www.mariagebruidsmode.nl/online-bruidsmode/', '').replace(/\/$/, '');
        if (slug && !slug.includes('?') && !slug.includes('#')) slugs.add(slug);
      });
      if (!html.includes('next page') && !html.includes('class="next page-numbers"')) break;
    } catch (e) {
      break;
    }
  }
  return [...slugs];
}

// ── Ensure collections exist ──────────────────────────────────────────────────

async function ensureCollection(brandSlug) {
  const brandName = brandNameFromSlug(brandSlug);
  const { data: existing } = await supabase
    .from('collections')
    .select('id, title')
    .eq('type', 'suit')
    .ilike('title', brandName)
    .limit(1);

  if (existing?.length) return existing[0].id;

  console.log(`  + Collectie aanmaken: ${brandName}`);
  if (DRY_RUN) return null;

  const { data, error } = await supabase
    .from('collections')
    .insert({ title: brandName, slug: brandSlug, type: 'suit' })
    .select('id')
    .single();

  if (error) { console.error(`    ✗ Fout:`, error.message); return null; }
  return data.id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load all suit collections
  const { data: collections } = await supabase
    .from('collections')
    .select('id, title, slug')
    .eq('type', 'suit');

  const collectionByBrandSlug = {};
  for (const col of collections ?? []) {
    collectionByBrandSlug[col.slug] = col.id;
    // Also index by brand name slug
    const nameSlug = col.title.toLowerCase().replace(/\s+/g, '-');
    collectionByBrandSlug[nameSlug] = col.id;
  }

  // Load all suit products
  const colIds = (collections ?? []).map((c) => c.id);
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, name, slug, brand')
    .in('collection_id', colIds.length ? colIds : ['00000000-0000-0000-0000-000000000000']);

  const productBySlug = {};
  for (const p of existingProducts ?? []) {
    productBySlug[p.slug] = p;
  }

  // Get WP suit slugs
  let wpSlugs;
  if (SINGLE_SLUG) {
    wpSlugs = [SINGLE_SLUG];
  } else {
    console.log('\nOphalen WP producten...');
    wpSlugs = await fetchAllWpSuitSlugs();
    console.log(`Gevonden: ${wpSlugs.length} producten op WP\n`);
  }

  console.log(`Verwerken: ${wpSlugs.length} product(en)${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  for (const wpSlug of wpSlugs) {
    const brandSlug = normalizeBrandSlug(brandFromWpSlug(wpSlug));
    const modelSlug = modelFromWpSlug(wpSlug);
    const dbSlug    = brandSlug ? `${brandSlug}-${modelSlug}` : wpSlug;

    try {
      console.log(`  Fetching: ${BASE_URL}${wpSlug}/`);
      const html = await fetchPage(`${BASE_URL}${wpSlug}/`);

      if (!html.includes('woocommerce-product') && !html.includes('product_title')) {
        console.warn(`  ⚠ Niet gevonden: ${wpSlug}`);
        continue;
      }

      const parsed = parseSuitHtml(html);

      // Determine product name from page title
      const titleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)<\/h1>/);
      const productName = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : brandNameFromSlug(brandSlug ?? '') + ' – ' + modelSlug.replace(/-/g, ' ').toUpperCase();

      const brandName = brandNameFromSlug(brandSlug ?? '');

      console.log(`  ✓ ${productName}`);
      console.log(`    kleur:      ${parsed.kleur.join(', ') || '–'}`);
      console.log(`    maten:      ${parsed.maten.join(', ') || '–'}`);
      console.log(`    materialen: ${parsed.materialen.join(', ') || '–'}`);
      console.log(`    categorieen:${parsed.categorieen.join(', ') || '–'}`);
      console.log(`    prijs:      ${parsed.price_range ?? '–'}  aanbieding: ${parsed.sale_price ?? '–'}`);
      console.log(`    afbeeldingen: ${parsed.images.length}`);

      if (!DRY_RUN) {
        // Ensure collection exists
        let collectionId = collectionByBrandSlug[brandSlug ?? ''];
        if (!collectionId && brandSlug) {
          collectionId = await ensureCollection(brandSlug);
          if (collectionId) collectionByBrandSlug[brandSlug] = collectionId;
        }

        const update = {
          ...(parsed.kleur.length       && { kleur: parsed.kleur }),
          ...(parsed.maten.length       && { maten: parsed.maten }),
          ...(parsed.materialen.length  && { materialen: parsed.materialen }),
          ...(parsed.categorieen.length && { categorieen: parsed.categorieen }),
          ...(parsed.price_range        && { price_range: parsed.price_range }),
          ...(parsed.sale_price         && { sale_price: parsed.sale_price }),
          ...(parsed.description        && { description: parsed.description }),
          ...(parsed.images.length      && { images: parsed.images }),
        };

        const existing = productBySlug[dbSlug];

        if (existing) {
          // Update existing product
          if (Object.keys(update).length > 0) {
            const { error } = await supabase.from('products').update(update).eq('id', existing.id);
            if (error) console.error(`    ✗ Fout bij updaten:`, error.message);
            else        console.log(`    ✓ Bijgewerkt`);
          }
        } else {
          // Create new product
          if (collectionId) {
            const { error } = await supabase.from('products').insert({
              name: productName,
              slug: dbSlug,
              brand: brandName,
              collection_id: collectionId,
              ...update,
            });
            if (error) console.error(`    ✗ Fout bij aanmaken:`, error.message);
            else        console.log(`    ✓ Aangemaakt`);
          } else {
            console.warn(`    ⚠ Geen collectie gevonden voor brand: ${brandSlug}`);
          }
        }
      }

    } catch (e) {
      console.warn(`  ⚠ Fout bij ${wpSlug}:`, e.message);
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\nKlaar.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
