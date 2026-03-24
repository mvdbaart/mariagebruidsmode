import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';
import { invalidateRedirectCache } from '../../../../lib/redirects';

/**
 * PUT /api/admin/redirect-suggestions/:id
 *
 * Body: { action: 'approve' | 'reject', note?: string }
 *
 * On 'approve':
 *   1. Inserts the suggestion into `redirects` as an active 301.
 *   2. Marks the suggestion as 'approved'.
 *   3. Invalidates the redirect cache.
 *
 * On 'reject':
 *   1. Marks the suggestion as 'rejected'.
 */
export const PUT: APIRoute = async ({ cookies, params, request }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ontbrekend id' }), { status: 400 });
  }

  let body: { action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige JSON' }), { status: 400 });
  }

  const { action, note } = body;
  if (action !== 'approve' && action !== 'reject') {
    return new Response(JSON.stringify({ error: 'action moet "approve" of "reject" zijn' }), { status: 400 });
  }

  const supabase = getServiceRoleClient();

  // Fetch the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('redirect_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    return new Response(JSON.stringify({ error: 'Suggestie niet gevonden' }), { status: 404 });
  }

  if (action === 'approve') {
    // Insert into redirects (ignore if already exists)
    const { error: insertError } = await supabase
      .from('redirects')
      .upsert(
        {
          from_path: suggestion.from_path,
          to_path: suggestion.to_path,
          status_code: 301,
          match_type: 'exact',
          is_active: true,
          note: note ?? suggestion.note ?? `Goedgekeurd vanuit suggesties (conf: ${suggestion.confidence})`,
        },
        { onConflict: 'from_path,match_type' }
      );

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }

    invalidateRedirectCache();
  }

  // Update suggestion status
  const { data: updated, error: updateError } = await supabase
    .from('redirect_suggestions')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

/** DELETE /api/admin/redirect-suggestions/:id — remove a suggestion entirely */
export const DELETE: APIRoute = async ({ cookies, params }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ontbrekend id' }), { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('redirect_suggestions').delete().eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
