import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { posix, relative, resolve, sep } from 'path';

const IMAGE_ROOT = resolve(process.cwd(), 'public', 'images', 'bruid');
const REPORT_PATH = resolve(process.cwd(), 'reports', 'dress-catalog-import.json');
const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);
const PLACEHOLDER_DESCRIPTION =
  'Deze jurk is beschikbaar in onze collectie. Plan een pasafspraak voor meer details over pasvorm, maten en levertijd.';
const PLACEHOLDER_PRICE = 'Prijs op aanvraag';
const PLACEHOLDER_FEATURES = ['Meer details beschikbaar in de winkel'];

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

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
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
    if (IMAGE_EXTENSIONS.has(ext)) {
      out.push(fullPath);
    }
  }
  return out;
}

function findModelFolders(imageRoot) {
  const brands = readdirSync(imageRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  const items = [];

  for (const brandDir of brands) {
    const brandPath = resolve(imageRoot, brandDir.name);
    const subDirs = readdirSync(brandPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const modelDir of subDirs) {
      if (!modelDir.name.toLowerCase().startsWith('model-')) {
        continue;
      }
      const modelPath = resolve(brandPath, modelDir.name);
      const imageFiles = walkFiles(modelPath)
        .map((absolute) => {
          const rel = relative(resolve(process.cwd(), 'public'), absolute).split(sep).join('/');
          return `/${rel}`;
        })
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

      if (!imageFiles.length) {
        continue;
      }

      const brandLabel = titleCaseFromSlugish(brandDir.name);
      const modelLabel = titleCaseFromSlugish(modelDir.name);
      const baseSlug = slugify(`${brandDir.name}-${modelDir.name.replace(/^model-/i, '')}`);
      items.push({
        key: `${brandDir.name}/${modelDir.name}`,
        brandRaw: brandDir.name,
        modelRaw: modelDir.name,
        brandLabel,
        modelLabel,
        name: `${brandLabel} - ${modelLabel}`,
        baseSlug,
        images: imageFiles,
      });
    }
  }

  return items;
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function chooseFeatures(features) {
  if (Array.isArray(features) && features.length) {
    return features;
  }
  return PLACEHOLDER_FEATURES;
}

function chooseDescription(desc) {
  if (typeof desc === 'string' && desc.trim()) {
    return desc;
  }
  return PLACEHOLDER_DESCRIPTION;
}

function choosePriceRange(priceRange) {
  if (typeof priceRange === 'string' && priceRange.trim()) {
    return priceRange;
  }
  return PLACEHOLDER_PRICE;
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

  const sourceItems = findModelFolders(IMAGE_ROOT);
  const uniqueBrands = uniqBy(sourceItems.map((x) => x.brandRaw), (x) => x);
  const existingProductSlugs = new Set();

  const { data: allExistingProducts, error: allProductsError } = await supabase
    .from('products')
    .select('id, slug, brand, name, description, features, price_range, images, collection_id');
  if (allProductsError) throw allProductsError;
  for (const p of allExistingProducts || []) {
    if (p.slug) existingProductSlugs.add(p.slug);
  }

  const slugTaken = new Set(existingProductSlugs);
  const slugAssignments = new Map();
  const slugConflicts = [];

  for (const item of sourceItems) {
    let chosen = item.baseSlug || slugify(item.key);
    if (!chosen) chosen = slugify(item.key.replace('/', '-'));
    let index = 2;
    if (slugTaken.has(chosen) && !slugAssignments.has(chosen)) {
      slugAssignments.set(chosen, item.key);
    } else if (slugTaken.has(chosen) && slugAssignments.get(chosen) !== item.key) {
      while (slugTaken.has(`${chosen}-${index}`)) {
        index += 1;
      }
      const next = `${chosen}-${index}`;
      slugConflicts.push({ folder: item.key, requested: chosen, chosen: next });
      chosen = next;
    }
    slugTaken.add(chosen);
    slugAssignments.set(chosen, item.key);
    item.slug = chosen;
  }

  const collectionByBrand = new Map();
  for (const brandRaw of uniqueBrands) {
    const brandLabel = titleCaseFromSlugish(brandRaw);
    const collectionSlug = `dress-${slugify(brandRaw)}`;

    const payload = {
      title: brandLabel,
      slug: collectionSlug,
      type: 'dress',
      description: `Collectie ${brandLabel}`,
      image_url: null,
    };

    let collectionRow = null;
    if (apply) {
      const { data, error } = await supabase
        .from('collections')
        .upsert(payload, { onConflict: 'slug' })
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

    collectionByBrand.set(brandRaw, collectionRow);
  }

  const currentBySlug = new Map((allExistingProducts || []).map((p) => [p.slug, p]));

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    totals: {
      source_model_folders: sourceItems.length,
      brands: uniqueBrands.length,
      collections_created_or_reused: collectionByBrand.size,
      created: 0,
      updated: 0,
      unchanged: 0,
      conflicts: slugConflicts.length,
    },
    slug_conflicts: slugConflicts,
    created: [],
    updated: [],
    unchanged: [],
  };

  for (const item of sourceItems) {
    const collection = collectionByBrand.get(item.brandRaw);
    if (!collection) {
      throw new Error(`Missing collection for brand: ${item.brandRaw}`);
    }

    const existing = currentBySlug.get(item.slug);
    if (!existing) {
      const insertPayload = {
        collection_id: collection.id.startsWith('(new:') ? null : collection.id,
        name: item.name,
        slug: item.slug,
        brand: item.brandLabel,
        description: PLACEHOLDER_DESCRIPTION,
        images: item.images,
        features: PLACEHOLDER_FEATURES,
        price_range: PLACEHOLDER_PRICE,
        is_featured: false,
      };

      if (apply) {
        const { error } = await supabase.from('products').insert(insertPayload);
        if (error) throw error;
      }

      report.totals.created += 1;
      report.created.push({
        slug: item.slug,
        folder: item.key,
        images: item.images.length,
        collection_slug: collection.slug,
      });
      continue;
    }

    const updatePayload = {
      collection_id: collection.id.startsWith('(new:') ? existing.collection_id : collection.id,
      name: existing.name || item.name,
      brand: existing.brand || item.brandLabel,
      description: chooseDescription(existing.description),
      images: item.images,
      features: chooseFeatures(existing.features),
      price_range: choosePriceRange(existing.price_range),
    };

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
      collection_id: updatePayload.collection_id || null,
      name: updatePayload.name || null,
      brand: updatePayload.brand || null,
      description: updatePayload.description || '',
      images: Array.isArray(updatePayload.images) ? updatePayload.images : [],
      features: Array.isArray(updatePayload.features) ? updatePayload.features : [],
      price_range: updatePayload.price_range || '',
    });

    if (beforeComparable === afterComparable) {
      report.totals.unchanged += 1;
      report.unchanged.push({ slug: item.slug, folder: item.key });
      continue;
    }

    if (apply) {
      const { error } = await supabase.from('products').update(updatePayload).eq('id', existing.id);
      if (error) throw error;
    }

    report.totals.updated += 1;
    report.updated.push({
      slug: item.slug,
      folder: item.key,
      before_image_count: Array.isArray(existing.images) ? existing.images.length : 0,
      after_image_count: item.images.length,
      collection_slug: collection.slug,
    });
  }

  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`Mode: ${report.mode}`);
  console.log(`Source model folders: ${report.totals.source_model_folders}`);
  console.log(`Brands: ${report.totals.brands}`);
  console.log(`Collections created/reused: ${report.totals.collections_created_or_reused}`);
  console.log(`Created: ${report.totals.created}`);
  console.log(`Updated: ${report.totals.updated}`);
  console.log(`Unchanged: ${report.totals.unchanged}`);
  console.log(`Conflicts: ${report.totals.conflicts}`);
  console.log(`Report: ${relative(process.cwd(), REPORT_PATH).split(sep).join(posix.sep)}`);
}

run().catch((err) => {
  console.error('Catalog import failed:', err?.message || err);
  process.exit(1);
});
