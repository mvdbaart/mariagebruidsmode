import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';
import { STORAGE_BUCKETS, type StorageBucket } from '../../../lib/storage';
import { v4 as uuidv4 } from 'uuid';

const VALID_BUCKETS = new Set<string>(Object.values(STORAGE_BUCKETS));

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestedBucket = (formData.get('bucket') as string) || 'products';
    const bucket: StorageBucket = VALID_BUCKETS.has(requestedBucket)
      ? (requestedBucket as StorageBucket)
      : STORAGE_BUCKETS.products;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Geen bestand gevonden.' }), { status: 400 });
    }

    const supabase = getServiceRoleClient();
    
    // Sanitize and create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return new Response(JSON.stringify({ error: 'Uploaden mislukt.' }), { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });
  } catch (err) {
    console.error('Upload exception:', err);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden.' }), { status: 500 });
  }
};
