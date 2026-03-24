import { getServiceRoleClient } from './serverAuth';

// ---------------------------------------------------------------------------
// Suggestion system — purely in-memory, no DB access
// ---------------------------------------------------------------------------

/** Minimum confidence to automatically promote a suggestion to an active redirect. */
export const CONFIDENCE_AUTO_APPROVE = 0.85;

export interface Suggestion {
  /** New-site path (always starts with /, never an external URL) */
  path: string;
  /** 0.0–1.0 */
  confidence: number;
  /** How the match was found */
  method: 'alias' | 'pattern' | 'slug-norm';
}

/** Exact alias map: old path → { new path, confidence } */
const ALIAS_MAP: Record<string, { path: string; confidence: number }> = {
  '/online-agenda':                         { path: '/afspraak-maken',    confidence: 0.90 },
  '/online-agenda/':                        { path: '/afspraak-maken',    confidence: 0.90 },
  '/afspraak-maken/vip-afspraak':           { path: '/vip-arrangement/',  confidence: 0.85 },
  '/online-bruidsmode/onze-merken':         { path: '/trouwjurken/',      confidence: 0.80 },
  '/online-bruidsmode/vip-arrangement-ticket': { path: '/vip-arrangement/', confidence: 0.90 },
  '/privacy-verklaring-nieuwsbrief':        { path: '/privacy',           confidence: 0.80 },
  '/privacy-verklaring-nieuwsbrief-2':      { path: '/privacy',           confidence: 0.80 },
  '/algemene-voorwaarden':                  { path: '/voorwaarden',       confidence: 0.90 },
  '/bruidsmode-eindhoven':                  { path: '/',                  confidence: 0.55 },
  '/bruidsmode-eindhoven-2':                { path: '/',                  confidence: 0.55 },
  '/trouwjurken-en-trouwpakken-in-geldrop': { path: '/',                  confidence: 0.55 },
  '/wishlist':                              { path: '/trouwjurken/',      confidence: 0.50 },
  '/veelgestelde-vragen':                   { path: '/over-ons',          confidence: 0.80 },
  '/betalingsopties':                       { path: '/over-ons',          confidence: 0.75 },
};

interface PatternRule {
  pattern: RegExp;
  /** Returns the target path. Receive the RegExp match array. */
  target: (match: RegExpMatchArray) => string;
  confidence: number;
}

/** Ordered pattern rules — first match wins */
const PATTERN_RULES: PatternRule[] = [
  // Individual products → /product/{slug}
  {
    pattern: /^\/online-bruidsmode\/([^/]+)$/,
    target: (m) => `/product/${m[1]}`,
    confidence: 0.92,
  },
  // Trouwjurken sub-categories → /trouwjurken/
  {
    pattern: /^\/bruidsmode\/trouwjurken\/(.+)$/,
    target: () => '/trouwjurken/',
    confidence: 0.82,
  },
  // Trouwpakken sub-categories → /trouwpakken/
  {
    pattern: /^\/bruidsmode\/trouwpakken\/(.+)$/,
    target: () => '/trouwpakken/',
    confidence: 0.82,
  },
  // Silhouet attributes → /trouwjurken/vormen
  {
    pattern: /^\/bruidsmode-eigenschap\/silhouet\/.+$/,
    target: () => '/trouwjurken/vormen',
    confidence: 0.85,
  },
  // Mouwen/stijl attributes → /trouwjurken/vormen
  {
    pattern: /^\/bruidsmode-eigenschap\/mouwen\/.+$/,
    target: () => '/trouwjurken/vormen',
    confidence: 0.80,
  },
  // Merk/kleur/materiaal attributes → /trouwjurken/
  {
    pattern: /^\/bruidsmode-eigenschap\/.+$/,
    target: () => '/trouwjurken/',
    confidence: 0.75,
  },
  // Brand/label taxonomy → /trouwjurken/
  {
    pattern: /^\/bruidsmode-label\/.+$/,
    target: () => '/trouwjurken/',
    confidence: 0.80,
  },
  // Inspiratie category archives → /inspiratie/
  {
    pattern: /^\/inspiratie\/categorie\/.+$/,
    target: () => '/inspiratie/',
    confidence: 0.85,
  },
  // Over-ons sub-pages → /over-ons
  {
    pattern: /^\/over-ons\/.+$/,
    target: () => '/over-ons',
    confidence: 0.82,
  },
  // Afspraak-maken sub-pages → /afspraak-maken
  {
    pattern: /^\/afspraak-maken\/.+$/,
    target: () => '/afspraak-maken',
    confidence: 0.82,
  },
];

/** Safety check: reject any suggestion that would redirect to an external URL. */
function isSafePath(path: string): boolean {
  return path.startsWith('/') && !path.includes('://') && !path.includes('//');
}

/**
 * Returns smart redirect suggestions for a given path.
 * Pure function — no DB access, safe to call in hot paths.
 * Results are sorted by confidence descending.
 */
export function getSuggestions(rawPath: string): Suggestion[] {
  // Strip query string and fragments, normalise trailing slash
  const path = rawPath.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';

  const results: Suggestion[] = [];

  // 1. Exact alias map
  const alias = ALIAS_MAP[path] ?? ALIAS_MAP[path + '/'];
  if (alias && isSafePath(alias.path)) {
    results.push({ path: alias.path, confidence: alias.confidence, method: 'alias' });
  }

  // 2. Pattern rules
  if (results.length === 0) {
    for (const rule of PATTERN_RULES) {
      const match = path.match(rule.pattern);
      if (match) {
        const target = rule.target(match);
        if (isSafePath(target)) {
          results.push({ path: target, confidence: rule.confidence, method: 'pattern' });
          break; // First match wins
        }
      }
    }
  }

  // 3. Slug normalisation fallback: strip known WP prefixes and try to find a
  //    slug match. This catches edge-cases like /product/trouwjurk-x → /trouwjurken/
  if (results.length === 0) {
    const normalized = normalizeSlug(path);
    if (normalized && normalized !== path) {
      results.push({ path: normalized, confidence: 0.50, method: 'slug-norm' });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Heuristic slug normaliser.
 * Strips known WordPress prefixes and falls back to the nearest parent route.
 */
function normalizeSlug(path: string): string | null {
  const wpPrefixes = [
    '/bruidsmode/',
    '/bruidsmode-eigenschap/',
    '/bruidsmode-label/',
    '/online-bruidsmode/',
    '/product-cat/',
    '/product-tag/',
    '/pa_',
  ];
  for (const prefix of wpPrefixes) {
    if (path.startsWith(prefix)) {
      return '/trouwjurken/';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Existing redirect cache (unchanged)
// ---------------------------------------------------------------------------

interface RedirectEntry {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  match_type: 'exact' | 'prefix';
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface RedirectCache {
  exact: Map<string, { to: string; status: number }>;
  prefixes: Array<{ from: string; to: string; status: number }>;
  expires: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: RedirectCache | null = null;

export async function getActiveRedirects(): Promise<RedirectCache> {
  if (cache && Date.now() < cache.expires) {
    return cache;
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .eq('is_active', true)
    .order('from_path');

  if (error || !data) {
    // Return empty cache on error rather than crashing
    return { exact: new Map(), prefixes: [], expires: Date.now() + 30_000 };
  }

  const exact = new Map<string, { to: string; status: number }>();
  const prefixes: Array<{ from: string; to: string; status: number }> = [];

  for (const row of data as RedirectEntry[]) {
    if (row.match_type === 'prefix') {
      prefixes.push({ from: row.from_path, to: row.to_path, status: row.status_code });
    } else {
      exact.set(row.from_path, { to: row.to_path, status: row.status_code });
    }
  }

  // Sort prefixes longest-first so more specific prefixes win
  prefixes.sort((a, b) => b.from.length - a.from.length);

  cache = { exact, prefixes, expires: Date.now() + CACHE_TTL_MS };
  return cache;
}

export function invalidateRedirectCache(): void {
  cache = null;
}
