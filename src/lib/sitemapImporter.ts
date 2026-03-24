/**
 * sitemapImporter.ts
 *
 * Fetches the Yoast sitemap index, follows all child sitemaps, maps every
 * old URL to a new-site route, and persists results to Supabase:
 *
 *   confidence >= CONFIDENCE_AUTO_APPROVE  →  `redirects` (active: true)
 *   confidence <  CONFIDENCE_AUTO_APPROVE  →  `redirect_suggestions` (pending)
 *
 * Existing entries are skipped (no duplicates, no overwrites).
 */

import { getServiceRoleClient } from './serverAuth';
import { getSuggestions, CONFIDENCE_AUTO_APPROVE } from './redirects';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportResult {
  total: number;
  skipped: number;
  approved: number;
  suggestions: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SITEMAP_INDEX = 'https://www.mariagebruidsmode.nl/sitemap_index.xml';

/**
 * Paths that exist unchanged in the new Astro site — no redirect needed.
 * These are checked as prefix matches.
 */
const SAME_PATH_PREFIXES: string[] = [
  '/inspiratie/',  // Inspiratie posts keep the same slug
  '/blog/',        // Blog posts keep the same slug
];

/** Regex patterns to skip entirely (WP internals, feeds, pagination). */
const SKIP_PATTERNS: RegExp[] = [
  /^\/wp-/,
  /^\/feed\//,
  /\/page\/\d+/,
  /^\/embed\//,
];

/**
 * For /online-bruidsmode/{slug} the suggestion target is /product/{slug}.
 * We verify the slug exists in the `products` table before auto-approving,
 * so we don't create dead-end redirects for products not yet migrated.
 */
const PRODUCT_PATTERN = /^\/online-bruidsmode\/([^/]+)$/;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function importFromSitemap(
  sitemapIndexUrl: string = DEFAULT_SITEMAP_INDEX
): Promise<ImportResult> {
  const result: ImportResult = { total: 0, skipped: 0, approved: 0, suggestions: 0, errors: [] };

  // 1. Fetch sitemap index → list of child sitemap URLs
  let childUrls: string[];
  try {
    childUrls = await fetchLocs(sitemapIndexUrl);
  } catch (err) {
    result.errors.push(`Sitemap index ophalen mislukt: ${String(err)}`);
    return result;
  }

  // 2. Fetch all child sitemaps in parallel (max 10 concurrent)
  const allOldUrls: string[] = [];
  const batches = chunk(childUrls, 10);
  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map(fetchLocs));
    for (const r of results) {
      if (r.status === 'fulfilled') allOldUrls.push(...r.value);
    }
  }

  if (allOldUrls.length === 0) {
    result.errors.push('Geen URLs gevonden in sitemaps.');
    return result;
  }

  const supabase = getServiceRoleClient();

  // 3. Load all existing from_paths to avoid duplicates (single query)
  const [{ data: existingRedirects }, { data: existingSuggestions }, { data: productData }] =
    await Promise.all([
      supabase.from('redirects').select('from_path'),
      supabase.from('redirect_suggestions').select('from_path'),
      supabase.from('products').select('slug'),
    ]);

  const existingPaths = new Set<string>([
    ...(existingRedirects ?? []).map((r) => r.from_path as string),
    ...(existingSuggestions ?? []).map((r) => r.from_path as string),
  ]);

  const productSlugs = new Set<string>((productData ?? []).map((p) => p.slug as string));

  // 4. Process each URL
  type ToApprove = { from_path: string; to_path: string; note: string };
  type ToSuggest = { from_path: string; to_path: string; confidence: number; source: string };

  const toApprove: ToApprove[] = [];
  const toSuggest: ToSuggest[] = [];

  for (const rawUrl of allOldUrls) {
    result.total++;

    // Parse path
    let path: string;
    try {
      path = decodeURIComponent(new URL(rawUrl).pathname)
        .replace(/\/$/, '') || '/';
    } catch {
      result.errors.push(`Ongeldige URL: ${rawUrl}`);
      result.skipped++;
      continue;
    }

    // Skip: already mapped
    if (existingPaths.has(path)) {
      result.skipped++;
      continue;
    }

    // Skip: same path in new site
    if (isSamePath(path)) {
      result.skipped++;
      continue;
    }

    // Skip: WP internals
    if (SKIP_PATTERNS.some((p) => p.test(path))) {
      result.skipped++;
      continue;
    }

    // Get best suggestion (in-memory, fast)
    const suggestions = getSuggestions(path);
    if (suggestions.length === 0) {
      result.skipped++;
      continue;
    }

    const best = suggestions[0];

    // Determine effective confidence for product URLs:
    // lower confidence if product slug not yet in the new-site DB
    let effectiveConfidence = best.confidence;

    const productMatch = path.match(PRODUCT_PATTERN);
    if (productMatch) {
      const slug = productMatch[1];
      if (!productSlugs.has(slug)) {
        // Product not yet migrated — reduce confidence so it becomes a suggestion
        effectiveConfidence = Math.min(best.confidence, 0.70);
      }
    }

    // Guard: never auto-approve a homepage redirect for ambiguous paths
    if (best.path === '/' && effectiveConfidence < 0.70) {
      toSuggest.push({
        from_path: path,
        to_path: best.path,
        confidence: effectiveConfidence,
        source: 'sitemap',
      });
      continue;
    }

    if (effectiveConfidence >= CONFIDENCE_AUTO_APPROVE) {
      toApprove.push({
        from_path: path,
        to_path: best.path,
        note: `Sitemap import — ${best.method} (conf: ${effectiveConfidence.toFixed(2)})`,
      });
    } else {
      toSuggest.push({
        from_path: path,
        to_path: best.path,
        confidence: effectiveConfidence,
        source: 'sitemap',
      });
    }
  }

  // 5. Persist approved redirects (batch insert, ignore duplicates)
  if (toApprove.length > 0) {
    const BATCH = 200;
    for (const slice of chunk(toApprove, BATCH)) {
      const { error } = await supabase
        .from('redirects')
        .upsert(
          slice.map((r) => ({
            from_path: r.from_path,
            to_path: r.to_path,
            status_code: 301,
            match_type: 'exact',
            is_active: true,
            note: r.note,
          })),
          { onConflict: 'from_path,match_type', ignoreDuplicates: true }
        );
      if (error) result.errors.push(`Redirect insert fout: ${error.message}`);
      else result.approved += slice.length;
    }
  }

  // 6. Persist suggestions (batch insert, ignore duplicates)
  if (toSuggest.length > 0) {
    const BATCH = 200;
    for (const slice of chunk(toSuggest, BATCH)) {
      const { error } = await supabase
        .from('redirect_suggestions')
        .upsert(
          slice.map((r) => ({
            from_path: r.from_path,
            to_path: r.to_path,
            confidence: r.confidence,
            source: r.source,
            status: 'pending',
          })),
          { onConflict: 'from_path', ignoreDuplicates: true }
        );
      if (error) result.errors.push(`Suggestion insert fout: ${error.message}`);
      else result.suggestions += slice.length;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for paths that exist unchanged in the new site.
 * These need no redirect.
 */
function isSamePath(path: string): boolean {
  if (path === '/') return true;
  // /inspiratie/{slug} (but not /inspiratie/categorie/...)
  if (path.startsWith('/inspiratie/') && !path.startsWith('/inspiratie/categorie/')) return true;
  if (path.startsWith('/blog/')) return true;
  return false;
}

/** Fetch all <loc> values from a sitemap XML URL. */
async function fetchLocs(url: string): Promise<string[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'MariageBot/1.0 (redirect-engine)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} voor ${url}`);
  const xml = await res.text();
  return extractLocs(xml);
}

/** Extract all <loc>...</loc> values from sitemap XML using a regex. */
function extractLocs(xml: string): string[] {
  const matches = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

/** Split an array into chunks of at most `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
