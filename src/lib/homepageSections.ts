import {
  getDefaultHomepageCategorySliderItems,
  normalizeHomepageCategorySliderItems,
  type HomepageCategorySliderItem,
} from './homepageCategorySlider.ts';

export const HOMEPAGE_SECTION_IDS = [
  'hero',
  'category_slider',
  'style_chips',
  'collections',
  'mens_brands',
  'product_grid',
  'stories',
  'style_finder',
  'style_guide',
  'experience',
  'team',
  'appointment_cta',
] as const;

export type HomepageSectionId = (typeof HOMEPAGE_SECTION_IDS)[number];
type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'boolean';
type PromoBannerTheme = 'charcoal' | 'blush' | 'champagne' | 'ivory';

export type PromoBannerSettingsNormalized = {
  enabled: boolean;
  theme: PromoBannerTheme;
  messages: string[];
  rotation_ms: number;
  transition_ms: number;
  pause_on_hover: boolean;
  dismissible: boolean;
  remember_dismissal: boolean;
  link_url: string;
  open_in_new_tab: boolean;
};

export type HomepageSectionDefinition = {
  id: HomepageSectionId;
  label: string;
  description: string;
  fields: Array<{ key: string; label: string; type: FieldType; min?: number; max?: number }>;
};

type HomepageSectionsContent = Record<HomepageSectionId, Record<string, string | number | boolean>>;

export type HomepageSettingsNormalized = {
  sections_order: HomepageSectionId[];
  sections_visibility: Record<HomepageSectionId, boolean>;
  sections_content: HomepageSectionsContent;
  promo_banner: PromoBannerSettingsNormalized;
  category_slider_items: HomepageCategorySliderItem[];
} & Record<string, unknown>;

export const HOMEPAGE_SECTION_DEFINITIONS: HomepageSectionDefinition[] = [
  {
    id: 'hero',
    label: 'Hero',
    description: 'Bovenste introductie met virtueel pashokje en primaire call-to-actions.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Titel', type: 'text' },
      { key: 'subtitle', label: 'Subtitel', type: 'textarea' },
      { key: 'button1_text', label: 'Knop 1 tekst', type: 'text' },
      { key: 'button1_url', label: 'Knop 1 URL', type: 'url' },
      { key: 'button2_text', label: 'Knop 2 tekst', type: 'text' },
      { key: 'button2_url', label: 'Knop 2 URL', type: 'url' },
      { key: 'autoplay_ms', label: 'Autoplay (ms)', type: 'number', min: 2000, max: 15000 },
      { key: 'transition_ms', label: 'Transitie (ms)', type: 'number', min: 250, max: 2000 },
      { key: 'show_arrows', label: 'Pijlen tonen', type: 'boolean' },
      { key: 'show_dots', label: 'Dots tonen', type: 'boolean' },
      { key: 'pause_on_hover', label: 'Pauzeren bij hover', type: 'boolean' },
    ],
  },
  {
    id: 'category_slider',
    label: 'Categorie Slider',
    description: 'Carousel met 12 jurkenstijlen onder de hero.',
    fields: [],
  },
  {
    id: 'style_chips',
    label: 'Style Chips',
    description: 'Horizontale stijlchips onder de hero op mobiel.',
    fields: [
      { key: 'chip1_label', label: 'Chip 1 label', type: 'text' },
      { key: 'chip1_url', label: 'Chip 1 URL', type: 'url' },
      { key: 'chip2_label', label: 'Chip 2 label', type: 'text' },
      { key: 'chip2_url', label: 'Chip 2 URL', type: 'url' },
      { key: 'chip3_label', label: 'Chip 3 label', type: 'text' },
      { key: 'chip3_url', label: 'Chip 3 URL', type: 'url' },
      { key: 'chip4_label', label: 'Chip 4 label', type: 'text' },
      { key: 'chip4_url', label: 'Chip 4 URL', type: 'url' },
      { key: 'chip5_label', label: 'Chip 5 label', type: 'text' },
      { key: 'chip5_url', label: 'Chip 5 URL', type: 'url' },
    ],
  },
  {
    id: 'collections',
    label: 'Collecties',
    description: 'Introtekst boven de collectie-tegels.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'textarea' },
    ],
  },
  {
    id: 'mens_brands',
    label: 'Herenmodemerken',
    description: 'Overzicht met herenmodemerken in dezelfde kaartstijl.',
    fields: [],
  },
  {
    id: 'product_grid',
    label: 'Productgrid',
    description: 'Grid met jurken/producten op de homepage.',
    fields: [
      { key: 'description', label: 'Beschrijving', type: 'textarea' },
      { key: 'max_items', label: 'Max items', type: 'number', min: 3, max: 12 },
    ],
  },
  {
    id: 'stories',
    label: 'Stories',
    description: 'Real brides / inspiratie blok.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'description', label: 'Beschrijving', type: 'textarea' },
      { key: 'cta1_text', label: 'CTA 1 tekst', type: 'text' },
      { key: 'cta1_url', label: 'CTA 1 URL', type: 'url' },
      { key: 'cta2_text', label: 'CTA 2 tekst', type: 'text' },
      { key: 'cta2_url', label: 'CTA 2 URL', type: 'url' },
    ],
  },
  {
    id: 'style_finder',
    label: 'Style Finder',
    description: 'Korte quiz-callout.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Tekst', type: 'textarea' },
      { key: 'cta_text', label: 'CTA tekst', type: 'text' },
      { key: 'cta_url', label: 'CTA URL', type: 'url' },
    ],
  },
  {
    id: 'style_guide',
    label: 'Stijlgids',
    description: '3 cards met inspiratietitels.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'card1_title', label: 'Card 1 titel', type: 'text' },
      { key: 'card2_title', label: 'Card 2 titel', type: 'text' },
      { key: 'card3_title', label: 'Card 3 titel', type: 'text' },
    ],
  },
  {
    id: 'experience',
    label: 'Ervaringen',
    description: 'Testimonials/ervaringen sectie.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    description: 'Team-intro en CTA naar teampagina.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'cta_text', label: 'CTA tekst', type: 'text' },
      { key: 'cta_url', label: 'CTA URL', type: 'url' },
    ],
  },
  {
    id: 'appointment_cta',
    label: 'Afspraak CTA',
    description: 'Onderste afspraak-callout.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Tekst', type: 'textarea' },
      { key: 'cta_text', label: 'CTA tekst', type: 'text' },
      { key: 'cta_url', label: 'CTA URL', type: 'url' },
    ],
  },
];

export const HOMEPAGE_DEFAULTS: HomepageSettingsNormalized = {
  sections_order: [...HOMEPAGE_SECTION_IDS],
  sections_visibility: {
    hero: true,
    category_slider: true,
    style_chips: true,
    collections: true,
    mens_brands: true,
    product_grid: true,
    stories: true,
    style_finder: true,
    style_guide: true,
    experience: true,
    team: true,
    appointment_cta: true,
  },
  promo_banner: {
    enabled: true,
    theme: 'charcoal',
    messages: [
      '🌸 Lenteactie | Accessoirecheque t.w.v. € 150,- bij elke aankoop',
      '🥂 Prosecco bij ontvangst | Plan jouw droomafspraak',
      '✨ Nieuwe collecties 2026 | Bekijk onze trouwjurken en pakken',
    ],
    rotation_ms: 4000,
    transition_ms: 450,
    pause_on_hover: true,
    dismissible: true,
    remember_dismissal: true,
    link_url: '',
    open_in_new_tab: false,
  },
  category_slider_items: getDefaultHomepageCategorySliderItems(),
  sections_content: {
    hero: {
      eyebrow: 'Virtueel pashokje',
      title: 'Zie direct hoe jouw droomjurk je staat',
      subtitle: 'Kies je favoriete stijl of merk, kies je favoriete jurk, upload een geschikte foto van jezelf en bekijk meteen hoe het jou staat. Een volledig virtuele passessie voordat je bij ons in de bruidszaak komt.',
      button1_text: 'Start virtuele passessie',
      button1_url: '/trouwjurken',
      button2_text: 'Plan pasafspraak',
      button2_url: '/afspraak-maken',
      autoplay_ms: 5000,
      transition_ms: 700,
      show_arrows: true,
      show_dots: true,
      pause_on_hover: true,
    },
    category_slider: {},
    style_chips: {
      chip1_label: 'A-Line',
      chip1_url: '/trouwjurken/a-lijn',
      chip2_label: 'Ball Gown',
      chip2_url: '/trouwjurken/prinses',
      chip3_label: 'Mermaid',
      chip3_url: '/trouwjurken/zeemeermin',
      chip4_label: 'Boho',
      chip4_url: '/boho',
      chip5_label: 'Outlet',
      chip5_url: '/outlet',
    },
    collections: {
      heading: 'Onze collecties',
      subheading: 'Kies jouw silhouet of stijl en ga direct naar de jurken die het beste bij je passen.',
    },
    mens_brands: {},
    product_grid: {
      description: 'Prachtige trouwjurk uit de nieuwste collectie. Vind vergelijkbare stijlen in de winkel.',
      max_items: 6,
    },
    stories: {
      eyebrow: 'Love stories',
      heading: 'Echte bruiden',
      description: 'Laat je inspireren door de prachtige verhalen en unieke stijlen van onze Mariage bruiden.',
      cta1_text: 'Bekijk alle verhalen',
      cta1_url: '/inspiratie',
      cta2_text: 'Lees ervaringen',
      cta2_url: '/reviews',
    },
    style_finder: {
      eyebrow: 'vind jouw stijl',
      heading: 'Ontdek jouw stijl-profiel',
      body: 'Niet zeker welk silhouet bij je past? Onze interactieve Style Finder helpt je in een paar stappen naar de perfecte selectie jurken voor jouw grote dag.',
      cta_text: 'Start style finder',
      cta_url: '/stijlquiz',
    },
    style_guide: {
      eyebrow: 'mariage selection',
      heading: 'Stijlgids',
      card1_title: 'Echte bruiloften en inspiratieverhalen',
      card2_title: 'Bruidsmode trends van dit seizoen',
      card3_title: 'Boutiquebeleving: persoonlijk en warm',
    },
    experience: {
      eyebrow: 'the',
      heading: 'De Mariage ervaring',
    },
    team: {
      eyebrow: 'Ons Team',
      heading: 'De mensen achter Mariage',
      cta_text: 'Bekijk het volledige team',
      cta_url: '/het-team',
    },
    appointment_cta: {
      eyebrow: 'the',
      heading: 'Plan je pasafspraak',
      body: 'Tijdens een persoonlijke afspraak nemen we rustig de tijd om jouw stijl, pasvorm en wensen te vertalen naar de jurk die echt bij je past.',
      cta_text: 'AFSPRAAK PLANNEN',
      cta_url: '/afspraak-maken',
    },
  },
};

const cloneDefaults = (): HomepageSettingsNormalized =>
  JSON.parse(JSON.stringify(HOMEPAGE_DEFAULTS)) as HomepageSettingsNormalized;

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

const toNumber = (value: unknown, fallback: number, min?: number, max?: number) => {
  const raw = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(raw)) return fallback;
  let next = raw;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return Math.round(next);
};

export const normalizeHomepageSettings = (input: unknown): HomepageSettingsNormalized => {
  const defaults = cloneDefaults();
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  const passthrough: Record<string, unknown> = { ...source };
  delete passthrough.promo_banner;
  delete passthrough.category_slider_items;
  delete passthrough.sections_order;
  delete passthrough.sections_visibility;
  delete passthrough.sections_content;

  const sourceOrder = Array.isArray(source.sections_order) ? source.sections_order : defaults.sections_order;
  const validOrder = sourceOrder
    .map((item) => String(item))
    .filter((item): item is HomepageSectionId => (HOMEPAGE_SECTION_IDS as readonly string[]).includes(item));
  const dedupOrder = Array.from(new Set(validOrder));
  for (const id of HOMEPAGE_SECTION_IDS) {
    if (!dedupOrder.includes(id)) dedupOrder.push(id);
  }

  const rawVisibility = (source.sections_visibility && typeof source.sections_visibility === 'object'
    ? source.sections_visibility
    : {}) as Record<string, unknown>;
  const visibility = { ...defaults.sections_visibility };
  for (const id of HOMEPAGE_SECTION_IDS) {
    visibility[id] = toBoolean(rawVisibility[id], defaults.sections_visibility[id]);
  }

  const rawContent = (source.sections_content && typeof source.sections_content === 'object'
    ? source.sections_content
    : {}) as Record<string, unknown>;
  const content = cloneDefaults().sections_content;

  for (const definition of HOMEPAGE_SECTION_DEFINITIONS) {
    const sectionValues = (rawContent[definition.id] && typeof rawContent[definition.id] === 'object'
      ? rawContent[definition.id]
      : {}) as Record<string, unknown>;
    const sectionTarget = content[definition.id];

    for (const field of definition.fields) {
      const fallback = sectionTarget[field.key];
      const value = sectionValues[field.key];
      if (field.type === 'boolean') {
        sectionTarget[field.key] = toBoolean(value, Boolean(fallback));
      } else if (field.type === 'number') {
        sectionTarget[field.key] = toNumber(value, Number(fallback), field.min, field.max);
      } else {
        sectionTarget[field.key] = typeof value === 'string' ? value : String(fallback ?? '');
      }
    }
  }

  const rawBanner = (source.promo_banner && typeof source.promo_banner === 'object'
    ? source.promo_banner
    : {}) as Record<string, unknown>;
  const bannerDefaults = cloneDefaults().promo_banner;
  const allowedThemes: PromoBannerTheme[] = ['charcoal', 'blush', 'champagne', 'ivory'];
  const rawMessages = rawBanner.messages;
  const messageLines = Array.isArray(rawMessages)
    ? rawMessages.map((line) => String(line))
    : typeof rawMessages === 'string'
      ? rawMessages.split(/\r?\n/)
      : [];
  const cleanedMessages = messageLines.map((line) => line.trim()).filter(Boolean);

  const rawTheme = String(rawBanner.theme ?? bannerDefaults.theme).toLowerCase();
  const normalizedTheme: PromoBannerTheme = allowedThemes.includes(rawTheme as PromoBannerTheme)
    ? (rawTheme as PromoBannerTheme)
    : bannerDefaults.theme;

  const normalizedBanner: PromoBannerSettingsNormalized = {
    enabled: toBoolean(rawBanner.enabled, bannerDefaults.enabled),
    theme: normalizedTheme,
    messages: cleanedMessages.length > 0 ? cleanedMessages : [...bannerDefaults.messages],
    rotation_ms: toNumber(rawBanner.rotation_ms, bannerDefaults.rotation_ms, 2000, 20000),
    transition_ms: toNumber(rawBanner.transition_ms, bannerDefaults.transition_ms, 250, 2000),
    pause_on_hover: toBoolean(rawBanner.pause_on_hover, bannerDefaults.pause_on_hover),
    dismissible: toBoolean(rawBanner.dismissible, bannerDefaults.dismissible),
    remember_dismissal: toBoolean(rawBanner.remember_dismissal, bannerDefaults.remember_dismissal),
    link_url: typeof rawBanner.link_url === 'string' ? rawBanner.link_url.trim() : String(bannerDefaults.link_url),
    open_in_new_tab: toBoolean(rawBanner.open_in_new_tab, bannerDefaults.open_in_new_tab),
  };

  const normalizedCategorySliderItems = normalizeHomepageCategorySliderItems(source.category_slider_items);

  return {
    ...passthrough,
    promo_banner: normalizedBanner,
    category_slider_items: normalizedCategorySliderItems,
    sections_order: dedupOrder,
    sections_visibility: visibility,
    sections_content: content,
  };
};
