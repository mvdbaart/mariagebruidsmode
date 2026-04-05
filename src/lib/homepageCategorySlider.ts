export type HomepageCategorySliderItem = {
  id: string;
  label: string;
  href: string;
  image_url: string;
};

const DEFAULT_ITEMS: HomepageCategorySliderItem[] = [
  { id: 'klassiek', label: 'Klassieke trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'bohemian', label: 'Bohemian trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'romantisch', label: 'Romantische trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'strak', label: 'Strakke trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'open-rug', label: 'Open rug', href: '/trouwjurken', image_url: '' },
  { id: 'sexy', label: 'Sexy trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'simpel', label: 'Simpele trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'vintage', label: 'Vintage trouwjurk', href: '/trouwjurken', image_url: '' },
  { id: 'lange-sleep', label: 'Lange sleep', href: '/trouwjurken', image_url: '' },
  { id: 'met-split', label: 'Met split', href: '/trouwjurken', image_url: '' },
  { id: 'grote-maat', label: 'Grote maat', href: '/trouwjurken', image_url: '' },
  { id: 'outlet', label: 'Outlet', href: '/outlet', image_url: '' },
];

const FALLBACK_IMAGES = [
  '/images/jurkvormen/a-lijn.png',
  '/images/jurkvormen/a-lijn-1.png',
  '/images/jurkvormen/a-lijn-silhouet.png',
  '/images/jurkvormen/photoshop-silhouet2.png',
];

const cleanString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  return value.trim();
};

export const getDefaultHomepageCategorySliderItems = (): HomepageCategorySliderItem[] =>
  DEFAULT_ITEMS.map((item, index) => ({
    ...item,
    image_url: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
  }));

export const normalizeHomepageCategorySliderItems = (input: unknown): HomepageCategorySliderItem[] => {
  const defaults = getDefaultHomepageCategorySliderItems();
  const source = Array.isArray(input) ? input : [];

  return defaults.map((fallback, index) => {
    const incoming = source[index];
    if (!incoming || typeof incoming !== 'object') return fallback;
    const record = incoming as Record<string, unknown>;
    return {
      id: fallback.id,
      label: cleanString(record.label, fallback.label) || fallback.label,
      href: cleanString(record.href, fallback.href) || fallback.href,
      image_url: cleanString(record.image_url, fallback.image_url) || fallback.image_url,
    };
  });
};
