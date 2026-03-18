import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.slug) {
    return new Response(JSON.stringify({ error: 'Titel en slug zijn verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: String(body.title).trim(),
      slug: String(body.slug).trim(),
      author: body.author ? String(body.author).trim() : 'Mariage Bruidsmode',
      content: body.content ? String(body.content) : '',
      excerpt: body.excerpt ? String(body.excerpt).trim() : null,
      cover_image: body.cover_image ? String(body.cover_image).trim() : null,
      published_at: body.published_at || new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
};
