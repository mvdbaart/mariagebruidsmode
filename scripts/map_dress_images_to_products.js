import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, relative, sep, posix } from 'path';

const IMAGE_ROOT = resolve(process.cwd(), 'public', 'images', 'bruid');
const REPORT_PATH = resolve(process.cwd(), 'reports', 'dress-image-mapping.json');
const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    apply: args.has('--apply'),
    force: args.has('--force'),
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
        const value = line.slice(firstEqual + 1).trim();
        return [key, value];
      })
  );
}

function normalizeText(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textTokens(input) {
  return normalizeText(input)
    .split(' ')
    .filter((t) => t.length >= 3);
}

function slugModelToken(slug) {
  const parts = String(slug || '').toLowerCase().split('-').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
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
    if (IMAGE_EXTENSIONS.has(ext)) out.push(fullPath);
  }
  return out;
}

function buildFolderIndex(imageRoot) {
  const files = walkFiles(imageRoot);
  const folderMap = new Map();

  for (const absolute of files) {
    const rel = relative(imageRoot, absolute).split(sep).join('/');
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    if (!dir) continue;

    const publicPath = `/images/bruid/${rel}`;
    if (!folderMap.has(dir)) {
      folderMap.set(dir, {
        folder: dir,
        files: [],
      });
    }
    folderMap.get(dir).files.push(publicPath);
  }

  return [...folderMap.values()].map((entry) => {
    const sortedFiles = entry.files.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    const folderParts = entry.folder.split('/');
    const brand = folderParts[0] || '';
    const modelDir = folderParts.find((p) => p.toLowerCase().startsWith('model-')) || '';
    const model = modelDir.replace(/^model-/i, '');
    const folderText = `${entry.folder} ${sortedFiles.join(' ')}`;
    return {
      folder: entry.folder,
      files: sortedFiles,
      brand,
      model,
      text: normalizeText(folderText),
      tokens: textTokens(folderText),
    };
  });
}

function scoreMatch(product, folder) {
  const productName = product.name || '';
  const productSlug = product.slug || '';
  const productBrand = product.brand || '';

  const slugNorm = normalizeText(productSlug).replace(/\s+/g, ' ');
  const nameNorm = normalizeText(productName);
  const brandNorm = normalizeText(productBrand);
  const modelToken = normalizeText(slugModelToken(productSlug));

  let score = 0;

  const folderBrandNorm = normalizeText(folder.brand);
  if (brandNorm && folderBrandNorm === brandNorm) score += 28;
  else if (brandNorm && (folderBrandNorm.includes(brandNorm) || brandNorm.includes(folderBrandNorm))) score += 18;
  if (modelToken && normalizeText(folder.model) === modelToken) score += 34;
  if (slugNorm && folder.text.includes(slugNorm)) score += 42;
  if (nameNorm && folder.text.includes(nameNorm)) score += 24;

  const tokens = new Set([
    ...textTokens(productSlug),
    ...textTokens(productName),
    ...textTokens(productBrand),
  ]);

  let tokenHits = 0;
  for (const token of tokens) {
    if (folder.tokens.includes(token)) tokenHits++;
  }
  score += Math.min(tokenHits * 3, 24);

  return score;
}

function hasLocalBruidImages(images) {
  return Array.isArray(images) && images.some((img) => typeof img === 'string' && img.startsWith('/images/bruid/'));
}

async function run() {
  const { apply, force } = parseArgs(process.argv);
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

  const { data: dressCollections, error: collectionsError } = await supabase
    .from('collections')
    .select('id')
    .eq('type', 'dress');
  if (collectionsError) throw collectionsError;

  const collectionIds = (dressCollections || []).map((c) => c.id);
  if (!collectionIds.length) throw new Error('No dress collections found.');

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, brand, images, collection_id')
    .in('collection_id', collectionIds);
  if (productsError) throw productsError;

  const folders = buildFolderIndex(IMAGE_ROOT);
  const MIN_SCORE = 40;
  const MIN_MARGIN = 8;

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    force_overwrite_local: force,
    totals: {
      dress_products: products.length,
      image_folders: folders.length,
      matched: 0,
      updated: 0,
      unchanged: 0,
      skipped_existing_local: 0,
      ambiguous: 0,
      unmatched: 0,
    },
    matched: [],
    ambiguous: [],
    unmatched: [],
  };

  for (const product of products) {
    const scored = folders
      .map((folder) => ({ folder, score: scoreMatch(product, folder) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const second = scored[1];
    const margin = best && second ? best.score - second.score : best ? best.score : 0;

    if (!best || best.score < MIN_SCORE) {
      report.totals.unmatched++;
      report.unmatched.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        top_candidates: scored.slice(0, 3).map((c) => ({ folder: c.folder.folder, score: c.score })),
      });
      continue;
    }

    if (second && margin < MIN_MARGIN) {
      report.totals.ambiguous++;
      report.ambiguous.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        candidates: scored.slice(0, 3).map((c) => ({ folder: c.folder.folder, score: c.score, files: c.folder.files })),
      });
      continue;
    }

    const nextImages = best.folder.files;
    const currentImages = Array.isArray(product.images) ? product.images : [];
    const currentAsJson = JSON.stringify(currentImages);
    const nextAsJson = JSON.stringify(nextImages);

    const skipBecauseLocalExists = hasLocalBruidImages(currentImages) && !force;
    let status = 'unchanged';

    if (skipBecauseLocalExists) {
      report.totals.skipped_existing_local++;
      status = 'skipped_existing_local';
    } else if (currentAsJson !== nextAsJson) {
      if (apply) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ images: nextImages })
          .eq('id', product.id);
        if (updateError) throw updateError;
      }
      report.totals.updated++;
      status = apply ? 'updated' : 'would_update';
    } else {
      report.totals.unchanged++;
      status = 'unchanged';
    }

    report.totals.matched++;
    report.matched.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      score: best.score,
      folder: best.folder.folder,
      status,
      before_images: currentImages.slice(0, 5),
      after_images: nextImages.slice(0, 5),
    });
  }

  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`Mode: ${report.mode}`);
  console.log(`Dress products: ${report.totals.dress_products}`);
  console.log(`Matched: ${report.totals.matched}`);
  console.log(`Updated: ${report.totals.updated}`);
  console.log(`Unchanged: ${report.totals.unchanged}`);
  console.log(`Skipped existing local: ${report.totals.skipped_existing_local}`);
  console.log(`Ambiguous: ${report.totals.ambiguous}`);
  console.log(`Unmatched: ${report.totals.unmatched}`);
  console.log(`Report: ${relative(process.cwd(), REPORT_PATH).split(sep).join(posix.sep)}`);
}

run().catch((err) => {
  console.error('Mapping failed:', err?.message || err);
  process.exit(1);
});
