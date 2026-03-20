import { getServiceRoleClient } from './serverAuth';

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
