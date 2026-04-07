import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { posix, relative, resolve, sep } from 'path';

const IMAGE_ROOT = resolve(process.cwd(), 'public', 'images', 'bruidsmeisjes');
const REPORT_PATH = resolve(process.cwd(), 'reports', 'bruidsmeisjes-catalog-import.json');
const PLACEHOLDER_DESCRIPTION =
  'Bruidsmeisjesjurken uit de live collectie. Plan een pasafspraak om de maten, kleuren en combinaties in de winkel te bekijken.';
const PLACEHOLDER_FEATURES = ['Meer details beschikbaar in de winkel'];
const PLACEHOLDER_PRICE = 'Prijs op aanvraag';

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    apply: args.has('--apply'),
  };
}

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const envText = readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    envText
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const firstEqual = line.indexOf('=');
        const key = line.slice(0, firstEqual).trim();
        const value = line.slice(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
      })
  );
}

function titleCaseFromSlugish(input) {
  return String(input || '')
    .replace(/^model-/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function walkFiles(dir) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath));
      continue;
    }
    const dot = entry.name.lastIndexOf('.');
    const ext = dot === -1 ? '' : entry.name.slice(dot).toLowerCase();
    if (['.webp', '.jpg', '.jpeg', '.png', '.avif', '.gif', '.svg'].includes(ext)) {
      out.push(fullPath);
    }
  }
  return out;
}

function collectProducts(imageRoot) {
  const folders = readdirSync(imageRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  return folders
    .map((folder) => {
      const folderPath = resolve(imageRoot, folder.name);
      const images = walkFiles(folderPath)
        .map((absolute) => {
          const rel = relative(resolve(process.cwd(), 'public'), absolute).split(sep).join('/');
          return `/${rel}`;
        })
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

      return {
        folder: folder.name,
        slug: folder.name,
        images,
      };
    })
    .filter((item) => item.images.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug, 'en', { numeric: true }));
}

function productNameFromSlug(slug) {
  const match = slug.match(/^(.+?)-bruidsmeisjes-jurk-(.+)$/i);
  if (match) {
    const brand = titleCaseFromSlugish(match[1]);
    const code = match[2].toUpperCase();
    return {
      brand,
      name: `${brand} bruidsmeisjes jurk - ${code}`,
    };
  }

  const derived = titleCaseFromSlugish(slug);
  const brand = derived.split(' ')[0] || 'Bruidsmeisjes';
  return { brand, name: derived };
}

function fetchText(url) {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; bruidsmeisjes-catalog-import/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return {
      text: await res.text(),
      finalUrl: res.url,
    };
  });
}

function extractShortDescription(pageHtml) {
  const match = pageHtml.match(
    /class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!match) return null;
  return match[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  const { apply } = parseArgs(process.argv);
  const env = loadEnv();
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  if (!statSync(IMAGE_ROOT).isDirectory()) {
    throw new Error(`Image directory not found: ${IMAGE_ROOT}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sourceItems = collectProducts(IMAGE_ROOT);
  const collectionSlug = 'bruidsmeisjes';
  const collectionTitle = 'Bruidsmeisjes';

  const collectionPayload = {
    title: collectionTitle,
    slug: collectionSlug,
    type: 'accessory',
    description: 'Bruidsmeisjesjurken uit de live collectie',
    image_url: sourceItems[0]?.images?.[0] ?? null,
  };

  let collectionRow = null;
  if (apply) {
    const { data, error } = await supabase
      .from('collections')
      .upsert(collectionPayload, { onConflict: 'slug' })
      .select('id, slug')
      .single();
    if (error) throw error;
    collectionRow = data;
  } else {
    const { data, error } = await supabase
      .from('collections')
      .select('id, slug')
      .eq('slug', collectionSlug)
      .maybeSingle();
    if (error) throw error;
    collectionRow = data || { id: `(new:${collectionSlug})`, slug: collectionSlug };
  }

  const { data: existingProducts, error: existingError } = await supabase
    .from('products')
    .select('id, slug, name, brand, description, images, features, price_range, collection_id')
    .in('slug', sourceItems.map((item) => item.slug));
  if (existingError) throw existingError;

  const currentBySlug = new Map((existingProducts || []).map((p) => [p.slug, p]));

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    collection: collectionPayload,
    totals: {
      source_products: sourceItems.length,
      created: 0,
      updated: 0,
      unchanged: 0,
    },
    created: [],
    updated: [],
    unchanged: [],
  };

  for (const item of sourceItems) {
    const { brand, name } = productNameFromSlug(item.slug);
    const productUrl = `https://www.mariagebruidsmode.nl/online-bruidsmode/${item.slug}/`;
    let description = PLACEHOLDER_DESCRIPTION;
    try {
      const { text } = await fetchText(productUrl);
      description = extractShortDescription(text) || PLACEHOLDER_DESCRIPTION;
    } catch {
      description = PLACEHOLDER_DESCRIPTION;
    }
    const existing = currentBySlug.get(item.slug);
    const payload = {
      collection_id: collectionRow.id.startsWith('(new:') ? null : collectionRow.id,
      name,
      slug: item.slug,
      brand,
      description,
      images: item.images,
      features: PLACEHOLDER_FEATURES,
      price_range: PLACEHOLDER_PRICE,
      is_featured: false,
    };

    if (!existing) {
      if (apply) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
      report.totals.created += 1;
      report.created.push({ slug: item.slug, image_count: item.images.length });
      continue;
    }

    const beforeComparable = JSON.stringify({
      collection_id: existing.collection_id || null,
      name: existing.name || null,
      brand: existing.brand || null,
      description: existing.description || '',
      images: Array.isArray(existing.images) ? existing.images : [],
      features: Array.isArray(existing.features) ? existing.features : [],
      price_range: existing.price_range || '',
    });
    const afterComparable = JSON.stringify({
      collection_id: payload.collection_id || null,
      name: payload.name || null,
      brand: payload.brand || null,
      description: payload.description || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      features: Array.isArray(payload.features) ? payload.features : [],
      price_range: payload.price_range || '',
    });

    if (beforeComparable === afterComparable) {
      report.totals.unchanged += 1;
      report.unchanged.push({ slug: item.slug });
      continue;
    }

    if (apply) {
      const { error } = await supabase.from('products').update(payload).eq('id', existing.id);
      if (error) throw error;
    }

    report.totals.updated += 1;
    report.updated.push({
      slug: item.slug,
      before_image_count: Array.isArray(existing.images) ? existing.images.length : 0,
      after_image_count: item.images.length,
    });
  }

  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`Mode: ${report.mode}`);
  console.log(`Collection: ${collectionPayload.slug}`);
  console.log(`Source products: ${report.totals.source_products}`);
  console.log(`Created: ${report.totals.created}`);
  console.log(`Updated: ${report.totals.updated}`);
  console.log(`Unchanged: ${report.totals.unchanged}`);
  console.log(`Report: ${relative(process.cwd(), REPORT_PATH).split(sep).join(posix.sep)}`);
}

run().catch((err) => {
  console.error('Bruidsmeisjes catalog import failed:', err?.message || err);
  process.exit(1);
});
