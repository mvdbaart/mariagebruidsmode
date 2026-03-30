/**
 * classify_dress_attributes_from_images.js
 *
 * Uses image recognition to classify dress attributes and backfill products.
 * - Scope: dress collections only
 * - Input: max 3 images per product
 * - Safety: confidence-gated updates + review report
 *
 * Usage:
 *   node scripts/classify_dress_attributes_from_images.js --dry-run
 *   node scripts/classify_dress_attributes_from_images.js --apply
 *
 * Optional flags:
 *   --limit=50
 *   --offset=0
 *   --overwrite-existing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const MODEL = process.env.IMAGE_CLASSIFIER_MODEL || 'gpt-4.1-mini';
const MAX_IMAGES_PER_PRODUCT = Number(process.env.IMAGE_CLASSIFIER_MAX_IMAGES || 3);
const DEFAULT_SITE_URL = process.env.SITE_URL || 'https://www.mariagebruidsmode.nl';

const THRESHOLDS = {
  pasvorm: Number(process.env.IMAGE_CLASSIFIER_THRESHOLD_PASVORM || 0.8),
  hals: Number(process.env.IMAGE_CLASSIFIER_THRESHOLD_HALS || 0.75),
  mouw: Number(process.env.IMAGE_CLASSIFIER_THRESHOLD_MOUW || 0.75),
  materialen: Number(process.env.IMAGE_CLASSIFIER_THRESHOLD_MATERIALEN || 0.7),
  categorieen: Number(process.env.IMAGE_CLASSIFIER_THRESHOLD_CATEGORIEEN || 0.7),
};

const REPORT_DIR = resolve(process.cwd(), 'reports');
const REPORT_JSON_PATH = resolve(REPORT_DIR, 'dress-attribute-classification-report.json');
const REPORT_CSV_PATH = resolve(REPORT_DIR, 'dress-attribute-classification-report.csv');
const ATTRIBUTES_PATH = resolve(process.cwd(), 'src', 'lib', 'productAttributes.ts');

function parseArgs(argv) {
  const args = argv.slice(2);
  const has = (flag) => args.includes(flag);
  const getValue = (prefix) => {
    const item = args.find((a) => a.startsWith(prefix));
    if (!item) return null;
    return item.slice(prefix.length);
  };

  const apply = has('--apply');
  const dryRun = has('--dry-run') || !apply;
  const overwriteExisting = has('--overwrite-existing');
  const limit = Number(getValue('--limit=') || 0);
  const offset = Number(getValue('--offset=') || 0);

  return {
    apply,
    dryRun,
    overwriteExisting,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  };
}

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const text = readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const firstEq = line.indexOf('=');
        const key = line.slice(0, firstEq).trim();
        const value = line.slice(firstEq + 1).trim();
        return [key, value];
      })
  );
}

function extractKeys(source, exportName) {
  const escaped = exportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`export const ${escaped}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as const;`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not parse "${exportName}" keys from productAttributes.ts`);
  return [...match[1].matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
}

function loadAllowedAttributes() {
  const source = readFileSync(ATTRIBUTES_PATH, 'utf8');
  return {
    pasvorm: extractKeys(source, 'PASVORM'),
    hals: extractKeys(source, 'HALS'),
    mouw: extractKeys(source, 'MOUW'),
    materialen: extractKeys(source, 'MATERIALEN'),
    categorieen: extractKeys(source, 'CATEGORIEEN'),
  };
}

function normalizeImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${DEFAULT_SITE_URL}${raw}`;
  return null;
}

function toCSVValue(value) {
  const s = String(value ?? '');
  if (!s.includes(',') && !s.includes('"') && !s.includes('\n')) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function clampConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function parseJsonFromText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text;
  const chunks = [];
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

async function classifyProduct({ apiKey, allowed, product, imageUrls }) {
  const schemaHint = {
    pasvorm: { value: 'string|null', confidence: '0..1' },
    hals: { value: 'string|null', confidence: '0..1' },
    mouw: { value: 'string|null', confidence: '0..1' },
    materialen: [{ value: 'string', confidence: '0..1' }],
    categorieen: [{ value: 'string', confidence: '0..1' }],
    notes: 'short string',
  };

  const instruction = [
    'Classify bridal dress attributes from images only.',
    'Return JSON only.',
    `Allowed pasvorm keys: ${allowed.pasvorm.join(', ')}`,
    `Allowed hals keys: ${allowed.hals.join(', ')}`,
    `Allowed mouw keys: ${allowed.mouw.join(', ')}`,
    `Allowed materialen keys: ${allowed.materialen.join(', ')}`,
    `Allowed categorieen keys: ${allowed.categorieen.join(', ')}`,
    `JSON shape: ${JSON.stringify(schemaHint)}`,
    'Confidence must be numeric between 0 and 1.',
    'Never return keys outside allowed lists.',
    'If uncertain, set value to null or return empty arrays.',
  ].join('\n');

  const content = [
    { type: 'input_text', text: instruction },
    { type: 'input_text', text: `Product context: name="${product.name}", brand="${product.brand ?? ''}", slug="${product.slug}"` },
    ...imageUrls.map((url) => ({ type: 'input_image', image_url: url })),
  ];

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: 'user', content }],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body.slice(0, 600)}`);
  }

  const payload = await res.json();
  const text = extractResponseText(payload);
  const parsed = parseJsonFromText(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Model output is not valid JSON. Raw output: ${text?.slice(0, 600) || '(empty)'}`);
  }
  return parsed;
}

function sanitizePrediction(raw, allowed) {
  const getSingle = (fieldName, keys) => {
    const value = raw?.[fieldName]?.value ?? null;
    const confidence = clampConfidence(raw?.[fieldName]?.confidence);
    if (!value || typeof value !== 'string') return { value: null, confidence: 0 };
    return keys.includes(value) ? { value, confidence } : { value: null, confidence: 0 };
  };

  const getMulti = (fieldName, keys) => {
    const rows = Array.isArray(raw?.[fieldName]) ? raw[fieldName] : [];
    const clean = [];
    for (const row of rows) {
      const value = typeof row?.value === 'string' ? row.value : null;
      if (!value || !keys.includes(value)) continue;
      clean.push({ value, confidence: clampConfidence(row?.confidence) });
    }
    const dedup = new Map();
    for (const row of clean) {
      const current = dedup.get(row.value);
      if (!current || row.confidence > current.confidence) dedup.set(row.value, row);
    }
    return [...dedup.values()];
  };

  return {
    pasvorm: getSingle('pasvorm', allowed.pasvorm),
    hals: getSingle('hals', allowed.hals),
    mouw: getSingle('mouw', allowed.mouw),
    materialen: getMulti('materialen', allowed.materialen),
    categorieen: getMulti('categorieen', allowed.categorieen),
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
  };
}

function buildUpdatePayload({ prediction, product, overwriteExisting }) {
  const payload = {};
  const reasons = [];

  const setSingle = (field, threshold) => {
    const existing = product[field];
    if (!overwriteExisting && existing) return;
    if (prediction[field].value && prediction[field].confidence >= threshold) {
      payload[field] = prediction[field].value;
      reasons.push(`${field}:accepted(${prediction[field].confidence.toFixed(2)})`);
    } else if (prediction[field].value) {
      reasons.push(`${field}:low_confidence(${prediction[field].confidence.toFixed(2)})`);
    }
  };

  const setMulti = (field, threshold) => {
    const existing = Array.isArray(product[field]) ? product[field] : [];
    if (!overwriteExisting && existing.length > 0) return;
    const accepted = prediction[field]
      .filter((row) => row.confidence >= threshold)
      .map((row) => row.value);
    if (accepted.length) {
      payload[field] = [...new Set(accepted)];
      reasons.push(`${field}:accepted(${accepted.length})`);
    } else if (prediction[field].length) {
      reasons.push(`${field}:low_confidence`);
    }
  };

  setSingle('pasvorm', THRESHOLDS.pasvorm);
  setSingle('hals', THRESHOLDS.hals);
  setSingle('mouw', THRESHOLDS.mouw);
  setMulti('materialen', THRESHOLDS.materialen);
  setMulti('categorieen', THRESHOLDS.categorieen);

  return { payload, reasons };
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  const allowed = loadAllowedAttributes();

  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: dressCollections, error: collectionError } = await supabase
    .from('collections')
    .select('id')
    .eq('type', 'dress');
  if (collectionError) throw collectionError;

  const collectionIds = (dressCollections || []).map((c) => c.id);
  if (!collectionIds.length) throw new Error('No dress collections found');

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, slug, name, brand, images, pasvorm, hals, mouw, materialen, categorieen, collection_id')
    .in('collection_id', collectionIds)
    .order('created_at', { ascending: false });
  if (productsError) throw productsError;

  const slicedProducts = (products || []).slice(args.offset, args.limit ? args.offset + args.limit : undefined);

  const report = {
    generated_at: new Date().toISOString(),
    model: MODEL,
    mode: args.apply ? 'apply' : 'dry-run',
    overwrite_existing: args.overwriteExisting,
    thresholds: THRESHOLDS,
    totals: {
      input_products: slicedProducts.length,
      updated: 0,
      skipped_no_images: 0,
      skipped_no_confident_fields: 0,
      failed: 0,
    },
    results: [],
  };

  for (const product of slicedProducts) {
    const candidateImages = Array.isArray(product.images) ? product.images : [];
    const imageUrls = candidateImages
      .map(normalizeImageUrl)
      .filter(Boolean)
      .slice(0, MAX_IMAGES_PER_PRODUCT);

    if (!imageUrls.length) {
      report.totals.skipped_no_images++;
      report.results.push({
        product_id: product.id,
        slug: product.slug,
        decision: 'skipped_no_images',
        reason: 'No usable image URLs',
      });
      continue;
    }

    try {
      const rawPrediction = await classifyProduct({
        apiKey: openaiApiKey,
        allowed,
        product,
        imageUrls,
      });
      const prediction = sanitizePrediction(rawPrediction, allowed);
      const { payload, reasons } = buildUpdatePayload({
        prediction,
        product,
        overwriteExisting: args.overwriteExisting,
      });

      if (!Object.keys(payload).length) {
        report.totals.skipped_no_confident_fields++;
        report.results.push({
          product_id: product.id,
          slug: product.slug,
          decision: 'skipped_no_confident_fields',
          reason: reasons.join('; ') || 'No confident predictions',
          prediction,
        });
        continue;
      }

      let updateError = null;
      if (args.apply) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id);
        updateError = error;
      }

      if (updateError) {
        report.totals.failed++;
        report.results.push({
          product_id: product.id,
          slug: product.slug,
          decision: 'failed',
          reason: updateError.message,
          payload,
          prediction,
        });
      } else {
        report.totals.updated++;
        report.results.push({
          product_id: product.id,
          slug: product.slug,
          decision: args.apply ? 'updated' : 'would_update',
          reason: reasons.join('; '),
          payload,
          prediction,
        });
      }
    } catch (error) {
      report.totals.failed++;
      report.results.push({
        product_id: product.id,
        slug: product.slug,
        decision: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), 'utf8');

  const csvRows = [
    ['product_id', 'slug', 'decision', 'reason', 'payload_keys'].join(','),
    ...report.results.map((row) => [
      toCSVValue(row.product_id ?? ''),
      toCSVValue(row.slug ?? ''),
      toCSVValue(row.decision ?? ''),
      toCSVValue(row.reason ?? ''),
      toCSVValue(row.payload ? Object.keys(row.payload).join('|') : ''),
    ].join(',')),
  ];
  writeFileSync(REPORT_CSV_PATH, csvRows.join('\n'), 'utf8');

  console.log(`Processed: ${report.totals.input_products}`);
  console.log(`Updated/Would update: ${report.totals.updated}`);
  console.log(`Skipped (no images): ${report.totals.skipped_no_images}`);
  console.log(`Skipped (low confidence): ${report.totals.skipped_no_confident_fields}`);
  console.log(`Failed: ${report.totals.failed}`);
  console.log(`Report JSON: ${REPORT_JSON_PATH}`);
  console.log(`Report CSV : ${REPORT_CSV_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

