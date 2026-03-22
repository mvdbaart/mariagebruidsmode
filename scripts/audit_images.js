import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envFile = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const firstEqual = line.indexOf('=');
      if (firstEqual === -1) return null;
      const key = line.substring(0, firstEqual).trim();
      const value = line.substring(firstEqual + 1).trim();
      return [key, value];
    })
    .filter(Boolean)
);

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function categorize(url) {
  if (!url) return 'empty';
  if (url.startsWith('/images/')) return 'local-images';
  if (url.startsWith('/wp-content/')) return 'local-wp';
  if (url.includes('supabase.co')) return 'supabase';
  if (url.startsWith('http')) return 'external';
  return 'unknown';
}

async function checkUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return resp.status;
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

async function audit() {
  const externalUrls = new Map(); // url -> [{table, id, name, field}]

  // Products
  const { data: products } = await supabase.from('products').select('id, name, slug, images, collection_id, collections(type)');
  console.log(`\n=== PRODUCTS (${products?.length ?? 0}) ===`);
  for (const p of products ?? []) {
    const imgs = p.images ?? [];
    if (imgs.length === 0) {
      console.log(`  [empty] ${p.name}`);
    } else {
      imgs.forEach((img, i) => {
        const cat = categorize(img);
        if (cat === 'external') {
          const key = img;
          if (!externalUrls.has(key)) externalUrls.set(key, []);
          externalUrls.get(key).push({ table: 'products', id: p.id, name: p.name, field: `images[${i}]`, type: p.collections?.type ?? 'dress' });
        }
        if (cat !== 'supabase' && cat !== 'local-images') {
          console.log(`  [${cat}] ${p.name} → ${img}`);
        }
      });
    }
  }

  // Blog posts
  const { data: posts } = await supabase.from('blog_posts').select('id, title, slug, cover_image');
  console.log(`\n=== BLOG POSTS (${posts?.length ?? 0}) ===`);
  for (const p of posts ?? []) {
    const cat = categorize(p.cover_image);
    if (cat === 'external') {
      if (!externalUrls.has(p.cover_image)) externalUrls.set(p.cover_image, []);
      externalUrls.get(p.cover_image).push({ table: 'blog_posts', id: p.id, name: p.title, field: 'cover_image' });
    }
    if (cat !== 'supabase' && cat !== 'local-images') {
      console.log(`  [${cat}] ${p.title} → ${p.cover_image}`);
    }
  }

  // Real weddings
  const { data: weddings } = await supabase.from('real_weddings').select('id, bride_name, groom_name, cover_image, gallery_images');
  console.log(`\n=== REAL WEDDINGS (${weddings?.length ?? 0}) ===`);
  for (const w of weddings ?? []) {
    const label = `${w.bride_name ?? ''} & ${w.groom_name ?? ''}`;
    [w.cover_image, ...(w.gallery_images ?? [])].forEach((img, i) => {
      const cat = categorize(img);
      const field = i === 0 ? 'cover_image' : `gallery_images[${i - 1}]`;
      if (cat === 'external') {
        if (!externalUrls.has(img)) externalUrls.set(img, []);
        externalUrls.get(img).push({ table: 'real_weddings', id: w.id, name: label, field });
      }
      if (cat !== 'supabase' && cat !== 'local-images') {
        console.log(`  [${cat}] ${label} → ${img}`);
      }
    });
  }

  // Hero slides
  const { data: slides } = await supabase.from('hero_slides').select('id, title, image_url');
  console.log(`\n=== HERO SLIDES (${slides?.length ?? 0}) ===`);
  for (const s of slides ?? []) {
    const cat = categorize(s.image_url);
    if (cat === 'external') {
      if (!externalUrls.has(s.image_url)) externalUrls.set(s.image_url, []);
      externalUrls.get(s.image_url).push({ table: 'hero_slides', id: s.id, name: s.title, field: 'image_url' });
    }
    if (cat !== 'supabase' && cat !== 'local-images') {
      console.log(`  [${cat}] ${s.title} → ${s.image_url}`);
    }
  }

  // Collections
  const { data: collections } = await supabase.from('collections').select('id, title, slug, image_url');
  console.log(`\n=== COLLECTIONS (${collections?.length ?? 0}) ===`);
  for (const c of collections ?? []) {
    const cat = categorize(c.image_url);
    if (cat === 'external') {
      if (!externalUrls.has(c.image_url)) externalUrls.set(c.image_url, []);
      externalUrls.get(c.image_url).push({ table: 'collections', id: c.id, name: c.title, field: 'image_url' });
    }
    if (cat !== 'supabase' && cat !== 'local-images') {
      console.log(`  [${cat}] ${c.title} → ${c.image_url}`);
    }
  }

  // Check external URLs
  if (externalUrls.size > 0) {
    console.log(`\n=== CHECKING ${externalUrls.size} EXTERNAL URLS ===`);
    for (const [url, refs] of externalUrls) {
      const status = await checkUrl(url);
      const broken = typeof status === 'string' || status >= 400;
      console.log(`  [${status}] ${broken ? '⚠ BROKEN' : '✓ OK'} ${url}`);
      if (broken) {
        refs.forEach(r => console.log(`      → ${r.table} id=${r.id} "${r.name}" field=${r.field}`));
      }
    }
  } else {
    console.log('\n✓ No external URLs found.');
  }
}

audit().catch(console.error);
