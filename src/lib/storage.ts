const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? '';

export const STORAGE_BUCKETS = {
  products: 'products',
  collections: 'collections',
  blog: 'blog',
  inspiration: 'inspiration',
  settings: 'settings',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
export type StorageEntity = 'product' | 'collection' | 'blog' | 'inspiration';

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getBucketForEntity(entity: StorageEntity): StorageBucket {
  switch (entity) {
    case 'product':
      return STORAGE_BUCKETS.products;
    case 'collection':
      return STORAGE_BUCKETS.collections;
    case 'blog':
      return STORAGE_BUCKETS.blog;
    case 'inspiration':
      return STORAGE_BUCKETS.inspiration;
  }
}

function encodeStoragePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function detectExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex === -1) return '.jpg';
  const ext = normalized.slice(dotIndex);
  return /^[.][a-z0-9]{2,5}$/.test(ext) ? ext : '.jpg';
}

export function buildImageStoragePath(params: {
  entity: StorageEntity;
  slug: string;
  fileName: string;
  variant?: string;
}): { bucket: StorageBucket; path: string } {
  const bucket = getBucketForEntity(params.entity);
  const slug = sanitizeSegment(params.slug) || 'item';
  const variant = params.variant ? sanitizeSegment(params.variant) : 'image';
  const ext = detectExtension(params.fileName);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');

  return {
    bucket,
    path: `${slug}/${variant}-${stamp}${ext}`,
  };
}

export function getPublicStorageUrl(bucket: StorageBucket, path: string): string {
  if (!supabaseUrl) return '';
  const encodedPath = encodeStoragePath(path);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

