import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readEnvFile(path) {
  const raw = readFileSync(path, 'utf8');
  return Object.fromEntries(
    raw
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const i = line.indexOf('=');
        if (i === -1) return null;
        const key = line.slice(0, i).trim();
        const value = line.slice(i + 1).trim();
        return [key, value];
      })
      .filter(Boolean)
  );
}

const envPath = resolve(process.cwd(), '.env.local');
const env = readEnvFile(envPath);

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKETS = [
  {
    id: 'products',
    options: {
      public: true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },
  },
  {
    id: 'collections',
    options: {
      public: true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },
  },
  {
    id: 'blog',
    options: {
      public: true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },
  },
  {
    id: 'inspiration',
    options: {
      public: true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },
  },
  {
    id: 'settings',
    options: {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'],
    },
  },
  {
    id: 'employees',
    options: {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    },
  },
];

async function ensureBuckets() {
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existingIds = new Set(existingBuckets.map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (!existingIds.has(bucket.id)) {
      const { error: createError } = await supabase.storage.createBucket(
        bucket.id,
        bucket.options
      );
      if (createError) {
        console.error(`Failed to create bucket "${bucket.id}":`, createError.message);
        continue;
      }
      console.log(`Created bucket: ${bucket.id}`);
    } else {
      console.log(`Bucket already exists: ${bucket.id}`);
    }

    const { error: updateError } = await supabase.storage.updateBucket(
      bucket.id,
      bucket.options
    );
    if (updateError) {
      console.error(`Failed to update bucket "${bucket.id}":`, updateError.message);
      continue;
    }
    console.log(`Configured bucket: ${bucket.id}`);
  }

  const { data: finalBuckets, error: finalError } = await supabase.storage.listBuckets();
  if (finalError) {
    console.error('Failed to verify buckets:', finalError.message);
    process.exit(1);
  }

  console.log('\nCurrent buckets:');
  for (const b of finalBuckets) {
    const isManaged = BUCKETS.some((x) => x.id === b.id) ? ' (managed)' : '';
    console.log(`- ${b.id} | public=${b.public}${isManaged}`);
  }
}

ensureBuckets();

