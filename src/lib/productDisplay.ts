export function normalizeProductName(name: string | null | undefined): string {
  const value = String(name ?? '').trim();
  if (!value) return '';

  const lettersOnly = value.replace(/[^\p{L}]/gu, '');
  if (!lettersOnly || lettersOnly !== lettersOnly.toUpperCase()) {
    return value;
  }

  const lower = value.toLowerCase();
  return lower.replace(/\b([\p{L}])/gu, (_, letter: string) => letter.toUpperCase());
}

export type CollectionTitleFont = 'bridal' | 'tailored';

export function resolveCollectionTitleFont(
  titleFont: string | null | undefined,
  collectionType: string | null | undefined,
): CollectionTitleFont {
  const value = String(titleFont ?? '').trim().toLowerCase();
  if (value === 'tailored' || value === 'suit') return 'tailored';
  if (value === 'bridal' || value === 'dress') return 'bridal';
  return collectionType === 'suit' ? 'tailored' : 'bridal';
}

export function collectionTitleClass(
  titleFont: string | null | undefined,
  collectionType: string | null | undefined,
): string {
  return resolveCollectionTitleFont(titleFont, collectionType) === 'tailored'
    ? 'font-tailored-title'
    : 'font-bridal-title';
}

export function productTitleClass(
  titleFontOrIsSuit: string | boolean | null | undefined,
  collectionType?: string | null,
): string {
  if (typeof titleFontOrIsSuit === 'boolean') {
    return titleFontOrIsSuit ? 'font-tailored-title' : 'font-bridal-title';
  }

  return collectionTitleClass(titleFontOrIsSuit, collectionType);
}
