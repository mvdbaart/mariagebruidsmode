// Shared attribute lists — used by admin edit form, frontend filter, and product page.
// Keys are stored in the database; labels are display values.

export const PASVORM = [
  { key: 'a-lijn',         label: 'A-lijn' },
  { key: 'fit-and-flare',  label: 'Fit and flare' },
  { key: 'prinses',        label: 'Prinses' },
  { key: 'soepelvallend',  label: 'Soepelvallend' },
  { key: 'zeemeermin',     label: 'Zeemeermin' },
] as const;

export const HALS = [
  { key: 'strapless',       label: 'Strapless' },
  { key: 'hooggesloten',    label: 'Hooggesloten' },
  { key: 'v-hals',          label: 'V-hals' },
  { key: 'recht',           label: 'Recht' },
  { key: 'boothals',        label: 'Boothals' },
  { key: 'diep-decollote',  label: 'Diep decolleté' },
  { key: 'sweetheart',      label: 'Sweetheart' },
  { key: 'off-shoulder',    label: 'Off-shoulder' },
] as const;

export const MOUW = [
  { key: 'strapless',         label: 'Strapless' },
  { key: 'mouwloos',          label: 'Mouwloos' },
  { key: 'schouderbandjes',   label: 'Schouderbandjes' },
  { key: 'korte-mouwen',      label: 'Korte mouwen' },
  { key: 'lange-mouwen',      label: 'Lange mouwen' },
  { key: 'off-shoulder',      label: 'Off-shoulder' },
  { key: '3-kwart-mouwen',    label: '¾ mouwen' },
] as const;

export const MATERIALEN = [
  { key: 'crepe',     label: 'Crêpe' },
  { key: 'kant',      label: 'Kant' },
  { key: 'chiffon',   label: 'Chiffon' },
  { key: 'mikado',    label: 'Mikado' },
  { key: 'organza',   label: 'Organza' },
  { key: 'satijn',    label: 'Satijn' },
  { key: 'tule',      label: 'Tule' },
  { key: 'zijde',     label: 'Zijde' },
  { key: 'jersey',    label: 'Jersey' },
] as const;

export const KLEUREN = [
  { key: 'wit',           label: 'Wit' },
  { key: 'ivoor',         label: 'Ivoor' },
  { key: 'champagne',     label: 'Champagne' },
  { key: 'roze',          label: 'Roze' },
  { key: 'nude',          label: 'Nude' },
  { key: 'beige',         label: 'Beige' },
  { key: 'blauw',         label: 'Blauw' },
  { key: 'grijs',         label: 'Grijs' },
  { key: 'groen',         label: 'Groen' },
  { key: 'bruin',         label: 'Bruin' },
  { key: 'bordeaux-roze', label: 'Bordeaux & roze' },
] as const;

export const MATEN = [
  '34','36','38','40','42','44','46','48','50','52','54','56','58','60','62',
] as const;

export const CATEGORIEEN = [
  { key: 'klassiek',    label: 'Klassieke trouwjurk' },
  { key: 'bohemian',    label: 'Bohemian trouwjurk' },
  { key: 'romantisch',  label: 'Romantische trouwjurk' },
  { key: 'strak',       label: 'Strakke trouwjurk' },
  { key: 'open-rug',    label: 'Open rug' },
  { key: 'sexy',        label: 'Sexy trouwjurk' },
  { key: 'simpel',      label: 'Simpele trouwjurk' },
  { key: 'vintage',     label: 'Vintage trouwjurk' },
  { key: 'lange-sleep', label: 'Lange sleep' },
  { key: 'met-split',   label: 'Met split' },
  { key: 'grote-maat',  label: 'Grote maat' },
  { key: 'outlet',      label: 'Outlet' },
] as const;

export type PasvormKey    = typeof PASVORM[number]['key'];
export type HalsKey       = typeof HALS[number]['key'];
export type MouwKey       = typeof MOUW[number]['key'];
export type MateriaalKey  = typeof MATERIALEN[number]['key'];
export type KleurKey      = typeof KLEUREN[number]['key'];
export type CategorieKey  = typeof CATEGORIEEN[number]['key'];

// Helper: find display label for a key
export function labelFor(list: readonly { key: string; label: string }[], key: string | null | undefined): string {
  if (!key) return '';
  return list.find((i) => i.key === key)?.label ?? key;
}
