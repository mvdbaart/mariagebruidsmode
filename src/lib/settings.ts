import type { AstroGlobal } from 'astro';
import { getServiceRoleClient } from './serverAuth';

export interface SiteSettings {
  id: string;
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  ui_styles?: Record<string, string>;
  site_metadata?: Record<string, string>;
  contact_info?: Record<string, string>;
  homepage?: Record<string, unknown>;
  logo_url?: string;
  [key: string]: unknown;
}

const SETTINGS_LOCALS_KEY = '__siteSettings__';

/**
 * Returns site_settings, cached on Astro.locals so the DB is queried at most
 * once per SSR request regardless of how many components call this function.
 */
export async function getSiteSettings(Astro: Pick<AstroGlobal, 'locals'>): Promise<SiteSettings | null> {
  const locals = Astro.locals as Record<string, unknown>;

  if (locals[SETTINGS_LOCALS_KEY] !== undefined) {
    return locals[SETTINGS_LOCALS_KEY] as SiteSettings | null;
  }

  const supabase = getServiceRoleClient();
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'current')
    .single();

  locals[SETTINGS_LOCALS_KEY] = data ?? null;
  return data ?? null;
}
