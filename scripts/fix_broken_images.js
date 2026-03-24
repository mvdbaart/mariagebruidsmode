/**
 * Fix broken image URLs in the database.
 * Finds records with external (non-Supabase, non-local) image URLs,
 * checks if they are broken (HTTP 4xx/5xx or network error),
 * and replaces them with appropriate local fallback images.
 *
 * Usage: node scripts/fix_broken_images.js [--dry-run]
 *   --dry-run  Show what would be changed without applying
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const isDryRun = process.argv.includes('--dry-run');

// Load environment variables from .env.local
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

// Fallback images per content type
const FALLBACKS = {
  dress: '/wp-content/uploads/2023/11/trouwjurk-ladybird-aneesa-bruidsmode-hochzeitskleid-bridal-dress-scaled-1-scaled.jpg',
  suit: '/wp-content/uploads/2023/11/Immediate-trouwpak-blauw-19206-54-1.jpg',
  blog: '/images/team/TKF_9303-scaled-scaled.jpg',
  wedding: '/images/team/TKF_9422-scaled.jpg',
  hero: '/wp-content/uploads/2023/07/Home-Hero-img.jpg',
  collection: '/images/jurkvormen/a-lijn.png',
};

function isExternal(url) {
  return url && url.startsWith('http') && !url.includes('supabase.co');
}

async function isUrlBroken(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return resp.status >= 400;
  } catch {
    return true;
  }
}

async function fix() {
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'APPLY CHANGES'}\n`);
  let totalFixed = 0;

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, name, images, collections(type)');

  for (const p of products ?? []) {
    const imgs = p.images ?? [];
    const externalIdxs = imgs.map((img, i) => isExternal(img) ? i : -1).filter(i => i >= 0);
    if (!externalIdxs.length) continue;

    const newImgs = [...imgs];
    let changed = false;
    const isSuit = p.collections?.type === 'suit';
    const fallback = isSuit ? FALLBACKS.suit : FALLBACKS.dress;

    for (const idx of externalIdxs) {
      const broken = await isUrlBroken(imgs[idx]);
      if (broken) {
        console.log(`  [BROKEN] products "${p.name}" images[${idx}]: ${imgs[idx]}`);
        console.log(`       → ${fallback}`);
        newImgs[idx] = fallback;
        changed = true;
      } else {
        console.log(`  [OK]     products "${p.name}" images[${idx}]: ${imgs[idx]}`);
      }
    }

    if (changed && !isDryRun) {
      const { error } = await supabase
        .from('products')
        .update({ images: newImgs })
        .eq('id', p.id);
      if (error) console.error(`    ERROR updating product ${p.id}: ${error.message}`);
      else { console.log(`    ✓ Updated`); totalFixed++; }
    } else if (changed) {
      totalFixed++;
    }
  }

  // ── Blog posts ────────────────────────────────────────────────────────────
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, cover_image');

  for (const p of posts ?? []) {
    if (!isExternal(p.cover_image)) continue;
    const broken = await isUrlBroken(p.cover_image);
    if (!broken) { console.log(`  [OK]     blog_posts "${p.title}": ${p.cover_image}`); continue; }
    console.log(`  [BROKEN] blog_posts "${p.title}": ${p.cover_image}`);
    console.log(`       → ${FALLBACKS.blog}`);
    if (!isDryRun) {
      const { error } = await supabase
        .from('blog_posts')
        .update({ cover_image: FALLBACKS.blog })
        .eq('id', p.id);
      if (error) console.error(`    ERROR: ${error.message}`);
      else { console.log(`    ✓ Updated`); totalFixed++; }
    } else { totalFixed++; }
  }

  // ── Real weddings ─────────────────────────────────────────────────────────
  const { data: weddings } = await supabase
    .from('real_weddings')
    .select('id, bride_name, groom_name, cover_image, gallery_images');

  for (const w of weddings ?? []) {
    const label = `${w.bride_name ?? ''} & ${w.groom_name ?? ''}`;
    let changed = false;
    let newCover = w.cover_image;
    const newGallery = [...(w.gallery_images ?? [])];

    if (isExternal(w.cover_image)) {
      const broken = await isUrlBroken(w.cover_image);
      if (broken) {
        console.log(`  [BROKEN] real_weddings "${label}" cover_image: ${w.cover_image}`);
        console.log(`       → ${FALLBACKS.wedding}`);
        newCover = FALLBACKS.wedding;
        changed = true;
      }
    }
    for (let i = 0; i < newGallery.length; i++) {
      if (!isExternal(newGallery[i])) continue;
      const broken = await isUrlBroken(newGallery[i]);
      if (broken) {
        console.log(`  [BROKEN] real_weddings "${label}" gallery[${i}]: ${newGallery[i]}`);
        console.log(`       → ${FALLBACKS.wedding}`);
        newGallery[i] = FALLBACKS.wedding;
        changed = true;
      }
    }

    if (changed && !isDryRun) {
      const { error } = await supabase
        .from('real_weddings')
        .update({ cover_image: newCover, gallery_images: newGallery })
        .eq('id', w.id);
      if (error) console.error(`    ERROR: ${error.message}`);
      else { console.log(`    ✓ Updated`); totalFixed++; }
    } else if (changed) { totalFixed++; }
  }

  // ── Hero slides ───────────────────────────────────────────────────────────
  const { data: slides } = await supabase
    .from('hero_slides')
    .select('id, title, image_url');

  for (const s of slides ?? []) {
    if (!isExternal(s.image_url)) continue;
    const broken = await isUrlBroken(s.image_url);
    if (!broken) { console.log(`  [OK]     hero_slides "${s.title}": ${s.image_url}`); continue; }
    console.log(`  [BROKEN] hero_slides "${s.title}": ${s.image_url}`);
    console.log(`       → ${FALLBACKS.hero}`);
    if (!isDryRun) {
      const { error } = await supabase
        .from('hero_slides')
        .update({ image_url: FALLBACKS.hero })
        .eq('id', s.id);
      if (error) console.error(`    ERROR: ${error.message}`);
      else { console.log(`    ✓ Updated`); totalFixed++; }
    } else { totalFixed++; }
  }

  // ── Collections ───────────────────────────────────────────────────────────
  const { data: collections } = await supabase
    .from('collections')
    .select('id, title, image_url, type');

  for (const c of collections ?? []) {
    if (!isExternal(c.image_url)) continue;
    const broken = await isUrlBroken(c.image_url);
    if (!broken) { console.log(`  [OK]     collections "${c.title}": ${c.image_url}`); continue; }
    const fallback = c.type === 'suit' ? FALLBACKS.suit : FALLBACKS.collection;
    console.log(`  [BROKEN] collections "${c.title}": ${c.image_url}`);
    console.log(`       → ${fallback}`);
    if (!isDryRun) {
      const { error } = await supabase
        .from('collections')
        .update({ image_url: fallback })
        .eq('id', c.id);
      if (error) console.error(`    ERROR: ${error.message}`);
      else { console.log(`    ✓ Updated`); totalFixed++; }
    } else { totalFixed++; }
  }

  console.log(`\n${isDryRun ? 'Would fix' : 'Fixed'} ${totalFixed} broken image(s).`);
}

fix().catch(console.error);
