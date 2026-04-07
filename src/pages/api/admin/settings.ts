import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';
import { normalizeHomepageSettings } from '../../../lib/homepageSections';
import { normalizeThemeColorPalettes } from '../../../lib/colorPresets';
import {
  ADMIN_HEADING_FONT_OPTIONS,
  BRIDAL_TITLE_FONT_OPTIONS,
  DEFAULT_ADMIN_HEADING_FONT,
  DEFAULT_BRIDAL_TITLE_FONT,
  DEFAULT_TAILORED_TITLE_FONT,
  normalizeFontChoice,
  TAILORED_TITLE_FONT_OPTIONS,
} from '../../../lib/fontPresets';

function normalizeTypographySettings(currentTypography: Record<string, unknown>, incomingTypography: Record<string, unknown>) {
  const mergedTypography = {
    ...currentTypography,
    ...incomingTypography,
  };

  return {
    ...mergedTypography,
    bridal_title_font: normalizeFontChoice(
      mergedTypography.bridal_title_font,
      BRIDAL_TITLE_FONT_OPTIONS,
      DEFAULT_BRIDAL_TITLE_FONT,
    ),
    tailored_title_font: normalizeFontChoice(
      mergedTypography.tailored_title_font,
      TAILORED_TITLE_FONT_OPTIONS,
      DEFAULT_TAILORED_TITLE_FONT,
    ),
    admin_heading_font: normalizeFontChoice(
      mergedTypography.admin_heading_font,
      ADMIN_HEADING_FONT_OPTIONS,
      DEFAULT_ADMIN_HEADING_FONT,
    ),
  };
}

function normalizeColorSettings(currentColors: Record<string, unknown>, incomingColors: Record<string, unknown>) {
  const mergedColors = {
    ...currentColors,
    ...incomingColors,
  };
  const normalizedPalettes = normalizeThemeColorPalettes(mergedColors);

  return {
    ...mergedColors,
    ...normalizedPalettes.bridal,
    suit: normalizedPalettes.suit,
  };
}

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'current')
    .single();

  if (error) {
    console.error('Settings fetch error:', error);
    return new Response(JSON.stringify({ error: 'Instellingen ophalen mislukt.' }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();
    const { data: currentSettings } = await supabase
      .from('site_settings')
      .select('homepage, typography')
      .eq('id', 'current')
      .single();
    
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.colors !== undefined) {
      const currentColors = (currentSettings?.colors ?? {}) as Record<string, unknown>;
      const incomingColors = (body.colors && typeof body.colors === 'object')
        ? (body.colors as Record<string, unknown>)
        : {};
      updatePayload.colors = normalizeColorSettings(currentColors, incomingColors);
    }
    if (body.typography !== undefined) {
      const currentTypography = (currentSettings?.typography ?? {}) as Record<string, unknown>;
      const incomingTypography = (body.typography && typeof body.typography === 'object')
        ? (body.typography as Record<string, unknown>)
        : {};
      updatePayload.typography = normalizeTypographySettings(currentTypography, incomingTypography);
    }
    if (body.ui_styles !== undefined) updatePayload.ui_styles = body.ui_styles;
    if (body.site_metadata !== undefined) updatePayload.site_metadata = body.site_metadata;
    if (body.contact_info !== undefined) updatePayload.contact_info = body.contact_info;
    if (body.homepage !== undefined) {
      const currentHomepage = (currentSettings?.homepage ?? {}) as Record<string, unknown>;
      const incomingHomepage = (body.homepage && typeof body.homepage === 'object')
        ? (body.homepage as Record<string, unknown>)
        : {};
      updatePayload.homepage = normalizeHomepageSettings({
        ...currentHomepage,
        ...incomingHomepage,
      });
    }

    const { data, error } = await supabase
      .from('site_settings')
      .update(updatePayload)
      .eq('id', 'current')
      .select()
      .single();

    if (error) {
      console.error('Settings update error:', error);
      return new Response(JSON.stringify({ error: 'Instellingen opslaan mislukt.' }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    console.error('Settings update exception:', err);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden.' }), { status: 500 });
  }
};
