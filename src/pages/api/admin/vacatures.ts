import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('vacancies')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const title = String(body.title ?? '').trim();
    if (!title) {
      return new Response(JSON.stringify({ error: 'Titel is verplicht' }), { status: 400 });
    }

    const vacancy = {
      title,
      slug: String(body.slug ?? '').trim() || slugify(title),
      summary: body.summary ? String(body.summary).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      department: body.department ? String(body.department).trim() : null,
      location: body.location ? String(body.location).trim() : null,
      employment_type: body.employment_type ? String(body.employment_type).trim() : null,
      hours_min: parseNumber(body.hours_min),
      hours_max: parseNumber(body.hours_max),
      application_email: body.application_email ? String(body.application_email).trim() : null,
      application_url: body.application_url ? String(body.application_url).trim() : null,
      cta_label: body.cta_label ? String(body.cta_label).trim() : 'Solliciteer direct',
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      is_active: parseBoolean(body.is_active),
      updated_at: new Date().toISOString(),
    };

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('vacancies').insert([vacancy]).select().single();
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
