export const DRESS_STYLES = [
  { key: 'a-lijn',      label: 'A-lijn trouwjurk' },
  { key: 'strak',       label: 'Strakke trouwjurk' },
  { key: 'prinses',     label: 'Prinses trouwjurk' },
  { key: 'bohemian',    label: 'Bohemian trouwjurk' },
  { key: 'zeemeermin',  label: 'Zeemeermin trouwjurk' },
  { key: 'sexy',        label: 'Sexy trouwjurk' },
  { key: 'simpel',      label: 'Simpele trouwjurk' },
  { key: 'kort',        label: 'Korte trouwjurk' },
  { key: 'open-rug',    label: 'Trouwjurk met open rug' },
  { key: 'mouwen',      label: 'Trouwjurk met mouwen' },
  { key: 'grote-maat',  label: 'Grote maat trouwjurk' },
] as const;

export type DressStyleKey = typeof DRESS_STYLES[number]['key'];
