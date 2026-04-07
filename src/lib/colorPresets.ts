export type ColorPalette = Record<string, string>;

export interface ColorGuide {
  key: string;
  label: string;
  defaultValue: string;
  usage: string;
}

export const BRIDAL_COLOR_KEYS = [
  'primary',
  'secondary',
  'accent',
  'blush',
  'taupe',
  'champagne',
  'linen',
  'charcoal',
  'cream',
  'blush_deep',
] as const;

export const BRIDAL_COLOR_GUIDES: ColorGuide[] = [
  {
    key: 'primary',
    label: 'Pearl base',
    defaultValue: '#FAF7F4',
    usage: 'Zachte parel-basis voor achtergronden, rustige contentvlakken en lichte secties.',
  },
  {
    key: 'cream',
    label: 'Ivory cream',
    defaultValue: '#F3EDE6',
    usage: 'Warme ivoortinten voor sectie-achtergronden en rustige overgangsvlakken.',
  },
  {
    key: 'linen',
    label: 'Linen mist',
    defaultValue: '#EDE5DC',
    usage: 'Kaarten, panelen, zachte achtergronden en formulier-oppervlakken.',
  },
  {
    key: 'champagne',
    label: 'Champagne glow',
    defaultValue: '#E8DDD0',
    usage: 'Borders, scheidingslijnen, invoervelden en subtiele randen.',
  },
  {
    key: 'blush',
    label: 'Blush veil',
    defaultValue: '#E8C9BB',
    usage: 'Zachte accentvlakken, hover-tonen en romantische highlight-elementen.',
  },
  {
    key: 'secondary',
    label: 'Rose accent',
    defaultValue: '#A66352',
    usage: 'Warme rose-accentkleur voor links, actieve toestanden en ondersteunende CTAâ€™s.',
  },
  {
    key: 'blush_deep',
    label: 'Blush rose',
    defaultValue: '#D4A395',
    usage: 'Primaire knoppen, actieve badges, wishlist-iconen en sterke CTAâ€™s.',
  },
  {
    key: 'taupe',
    label: 'Mink taupe',
    defaultValue: '#5E534D',
    usage: 'Subteksten, labels, metadata en overige hulptekst.',
  },
  {
    key: 'charcoal',
    label: 'Charcoal',
    defaultValue: '#2C2A28',
    usage: 'Footer, donkere blokken en sterke contrasterende tekst.',
  },
  {
    key: 'accent',
    label: 'Ink contrast',
    defaultValue: '#2C2A28',
    usage: 'Donkere contrastkleur voor tekst, iconen en duidelijke focuspunten.',
  },
];

export const DEFAULT_BRIDAL_COLOR_PALETTE: ColorPalette = {
  primary: '#FAF7F4',
  secondary: '#A66352',
  accent: '#2C2A28',
  blush: '#E8C9BB',
  taupe: '#5E534D',
  champagne: '#E8DDD0',
  linen: '#EDE5DC',
  charcoal: '#2C2A28',
  cream: '#F3EDE6',
  blush_deep: '#D4A395',
};

export const SUIT_COLOR_KEYS = BRIDAL_COLOR_KEYS;

export const SUIT_COLOR_GUIDES: ColorGuide[] = [
  {
    key: 'primary',
    label: 'Ivory basis',
    defaultValue: '#F5F3F0',
    usage: "Warm neutrale basis voor trouwpakken, bruidegomspagina's en rustige contentvlakken.",
  },
  {
    key: 'cream',
    label: 'Soft white',
    defaultValue: '#FBFAF8',
    usage: 'Lichte secties en ademruimte tussen contentblokken.',
  },
  {
    key: 'linen',
    label: 'Soft linen',
    defaultValue: '#EAE6E0',
    usage: 'Lichte kaarten, panelen en zachte neutrale achtergronden met een luxe feel.',
  },
  {
    key: 'champagne',
    label: 'Warm sand',
    defaultValue: '#D8D1C8',
    usage: 'Warme champagnekleur voor borders, scheidingslijnen en lichte interface-randen.',
  },
  {
    key: 'blush',
    label: 'Silver mist',
    defaultValue: '#C7CDD3',
    usage: 'Silver-tint voor vlakken, hover-states en subtiele achtergrondaccenten.',
  },
  {
    key: 'secondary',
    label: 'Navy accent',
    defaultValue: '#3D5673',
    usage: 'Diepe navy-accentkleur voor knoppen, links en elegante visuele triggers.',
  },
  {
    key: 'blush_deep',
    label: 'Cognac',
    defaultValue: '#A46F4A',
    usage: 'Cognac accent voor primaire acties, badges en nadrukkelijke CTAs.',
  },
  {
    key: 'taupe',
    label: 'Steel grey',
    defaultValue: '#666F79',
    usage: 'Koelgrijze ondersteunende kleur voor hulptekst, labels en secundaire informatie.',
  },
  {
    key: 'charcoal',
    label: 'Charcoal',
    defaultValue: '#24292F',
    usage: 'Donkere blokken, footer-contrast en headline-anker.',
  },
  {
    key: 'accent',
    label: 'Ink text',
    defaultValue: '#1F2328',
    usage: 'Charcoal contrastkleur voor tekst, iconen en sterke nadruk.',
  },
];

export const DEFAULT_SUIT_COLOR_PALETTE: ColorPalette = {
  primary: '#F5F3F0',
  secondary: '#3D5673',
  accent: '#1F2328',
  blush: '#C7CDD3',
  taupe: '#666F79',
  champagne: '#D8D1C8',
  linen: '#EAE6E0',
  charcoal: '#24292F',
  cream: '#FBFAF8',
  blush_deep: '#A46F4A',
};

export function normalizeColorPalette(value: unknown, fallback: ColorPalette): ColorPalette {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const palette: ColorPalette = {};

  for (const [key, defaultValue] of Object.entries(fallback)) {
    const candidate = source[key];
    palette[key] = typeof candidate === 'string' && candidate.trim() ? candidate.trim() : defaultValue;
  }

  return palette;
}

export function normalizeThemeColorPalettes(value: unknown) {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const bridal = normalizeColorPalette(source, DEFAULT_BRIDAL_COLOR_PALETTE);
  const suit = normalizeColorPalette(source.suit, DEFAULT_SUIT_COLOR_PALETTE);
  return { bridal, suit };
}

