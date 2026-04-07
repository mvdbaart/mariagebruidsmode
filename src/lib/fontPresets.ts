export interface FontOption {
  label: string;
  value: string;
}

export const DEFAULT_BRIDAL_TITLE_FONT = "'Sacramento', cursive";
export const DEFAULT_TAILORED_TITLE_FONT = "'Oswald', sans-serif";
export const DEFAULT_ADMIN_HEADING_FONT = "'Montserrat', sans-serif";

export const BRIDAL_TITLE_FONT_OPTIONS: FontOption[] = [
  { label: 'Sacramento', value: "'Sacramento', cursive" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'DM Serif Display', value: "'DM Serif Display', serif" },
  { label: 'Great Vibes', value: "'Great Vibes', cursive" },
];

export const TAILORED_TITLE_FONT_OPTIONS: FontOption[] = [
  { label: 'Oswald', value: "'Oswald', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Anton', value: "'Anton', sans-serif" },
];

export const ADMIN_HEADING_FONT_OPTIONS: FontOption[] = [
  { label: 'Montserrat', value: "'Montserrat', sans-serif" },
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Source Sans 3', value: "'Source Sans 3', sans-serif" },
  { label: 'Lato', value: "'Lato', sans-serif" },
];

export function normalizeFontChoice(value: unknown, options: FontOption[], fallback: string): string {
  const candidate = String(value ?? '').trim();
  if (!candidate) return fallback;
  return options.some((option) => option.value === candidate) ? candidate : fallback;
}
