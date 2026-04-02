export function normalizeImageUrl(
  url: string | null | undefined,
  fallback: string
): string {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;

  const raw = String(url).trim();
  if (!raw) return fallback;

  const cutAt = raw.search(/[?#]/);
  const pathPart = cutAt === -1 ? raw : raw.slice(0, cutAt);
  const suffix = cutAt === -1 ? '' : raw.slice(cutAt);

  const encodedPath = pathPart
    .split('/')
    .map((segment, index) => {
      if (segment === '' && index === 0) return '';
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');

  return `${encodedPath}${suffix}` || fallback;
}

export function normalizeImageList(
  urls: unknown,
  fallback: string
): string[] {
  const list = Array.isArray(urls) ? urls : [];
  const normalized = list
    .map((item) => (typeof item === 'string' ? normalizeImageUrl(item, fallback) : null))
    .filter((item): item is string => Boolean(item));

  return normalized.length > 0 ? normalized : [fallback];
}

