export interface ProductQuality {
  id: string;
  label: string;
  description: string;
  /** Inner SVG content — rendered inside <svg viewBox="0 0 80 80"> */
  svgContent: string;
}

export const PRODUCT_QUALITIES: ProductQuality[] = [
  {
    id: 'flexibility',
    label: 'Maximale flexibiliteit',
    description: 'Comfortabele pasvorm met een luxueus gevoel, met behoud van duurzaamheid.',
    svgContent: `
      <path class="q-path" d="M18,8 C18,18 28,28 18,40 C8,52 18,62 18,72" stroke-linecap="round"/>
      <path class="q-path" d="M40,4 C40,17 50,28 40,42 C30,56 40,66 40,74" stroke-linecap="round" style="animation-delay:0.15s"/>
      <path class="q-path" d="M62,8 C62,18 72,28 62,40 C52,52 62,62 62,72" stroke-linecap="round" style="animation-delay:0.3s"/>
      <circle class="q-path" cx="18" cy="74" r="2.5" style="animation-delay:0.45s"/>
    `,
  },
  {
    id: 'wrinkle-free',
    label: 'Kreukvrij',
    description: 'Niet meer strijken: machinewasbaar, ophangen en klaar om te dragen.',
    svgContent: `
      <path class="q-path" d="M8,24 C18,18 28,30 38,24 C48,18 58,30 68,24 C73,21 76,22 76,24" stroke-linecap="round"/>
      <path class="q-path" d="M8,40 C18,34 28,46 38,40 C48,34 58,46 68,40 C73,37 76,38 76,40" stroke-linecap="round" style="animation-delay:0.12s"/>
      <path class="q-path" d="M8,56 C18,50 28,62 38,56 C48,50 58,62 68,56 C73,53 76,54 76,56" stroke-linecap="round" style="animation-delay:0.24s"/>
      <line class="q-path" x1="62" y1="10" x2="14" y2="70" stroke-linecap="round" style="animation-delay:0.36s"/>
    `,
  },
  {
    id: 'breathable',
    label: 'Ademend & sneldrogend',
    description: 'Zacht en fris de hele dag door.',
    svgContent: `
      <line class="q-path" x1="8" y1="56" x2="72" y2="56" stroke-linecap="round"/>
      <line class="q-path" x1="22" y1="56" x2="22" y2="20" stroke-linecap="round" style="animation-delay:0.1s"/>
      <polyline class="q-path" points="14,30 22,20 30,30" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:0.2s"/>
      <line class="q-path" x1="40" y1="56" x2="40" y2="12" stroke-linecap="round" style="animation-delay:0.1s"/>
      <polyline class="q-path" points="32,22 40,12 48,22" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:0.2s"/>
      <line class="q-path" x1="58" y1="56" x2="58" y2="20" stroke-linecap="round" style="animation-delay:0.1s"/>
      <polyline class="q-path" points="50,30 58,20 66,30" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:0.2s"/>
    `,
  },
  {
    id: 'stain-resistant',
    label: 'Vlekbestendig',
    description: 'Vloeistoffen glijden van de stof zonder een spoor achter te laten.',
    svgContent: `
      <path class="q-path" d="M40,8 C40,8 18,36 18,50 A22,22 0 0,0 62,50 C62,36 40,8 40,8 Z" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="q-path" d="M8,68 C14,62 20,74 26,68 C32,62 38,74 44,68 C50,62 56,74 62,68 C68,62 72,66 74,68" stroke-linecap="round" style="animation-delay:0.4s"/>
    `,
  },
  {
    id: 'no-odor',
    label: 'Geurvrij',
    description: 'Neutraliseert bacteriën die lichaamsgeur veroorzaken bij transpiratie.',
    svgContent: `
      <path class="q-path" d="M40,6 L68,18 L68,44 C68,60 40,74 40,74 C40,74 12,60 12,44 L12,18 Z" stroke-linecap="round" stroke-linejoin="round"/>
      <line class="q-path" x1="40" y1="28" x2="40" y2="20" stroke-linecap="round" style="animation-delay:0.3s"/>
      <line class="q-path" x1="40" y1="56" x2="40" y2="64" stroke-linecap="round" style="animation-delay:0.35s"/>
      <line class="q-path" x1="28" y1="34" x2="22" y2="30" stroke-linecap="round" style="animation-delay:0.4s"/>
      <line class="q-path" x1="52" y1="34" x2="58" y2="30" stroke-linecap="round" style="animation-delay:0.45s"/>
      <line class="q-path" x1="28" y1="50" x2="22" y2="54" stroke-linecap="round" style="animation-delay:0.5s"/>
      <line class="q-path" x1="52" y1="50" x2="58" y2="54" stroke-linecap="round" style="animation-delay:0.55s"/>
      <circle class="q-path" cx="40" cy="42" r="4" style="animation-delay:0.6s"/>
    `,
  },
  {
    id: 'eco-friendly',
    label: 'Milieuvriendelijk',
    description: 'Duurzaam geproduceerd met respect voor mens en natuur.',
    svgContent: `
      <path class="q-path" d="M40,68 C40,68 40,30 40,22" stroke-linecap="round"/>
      <path class="q-path" d="M40,22 C40,22 14,18 10,40 C10,40 28,44 40,30" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:0.2s"/>
      <path class="q-path" d="M40,38 C40,38 58,16 68,24 C68,24 62,46 40,46" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:0.4s"/>
      <path class="q-path" d="M28,56 C32,62 36,66 40,68 C44,66 52,60 54,54" stroke-linecap="round" style="animation-delay:0.6s"/>
    `,
  },
  {
    id: 'handmade',
    label: 'Handgemaakt',
    description: 'Met zorg en vakmanschap met de hand vervaardigd.',
    svgContent: `
      <line class="q-path" x1="20" y1="20" x2="60" y2="60" stroke-linecap="round"/>
      <circle class="q-path" cx="18" cy="18" r="6" style="animation-delay:0.15s"/>
      <path class="q-path" d="M60,60 C62,66 58,72 52,70 C46,68 46,60 52,58 L70,50" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:0.3s"/>
      <path class="q-path" d="M30,46 C26,50 26,56 30,58 C34,60 38,58 40,54" stroke-linecap="round" style="animation-delay:0.45s"/>
      <path class="q-path" d="M46,30 C50,26 56,26 58,30 C60,34 58,38 54,40" stroke-linecap="round" style="animation-delay:0.45s"/>
    `,
  },
  {
    id: 'luxury',
    label: 'Luxe afwerking',
    description: 'Premium stoffen en details voor een onvergetelijk gevoel.',
    svgContent: `
      <polygon class="q-path" points="40,8 52,28 72,28 56,42 62,64 40,52 18,64 24,42 8,28 28,28" stroke-linecap="round" stroke-linejoin="round"/>
      <line class="q-path" x1="40" y1="8" x2="40" y2="52" stroke-linecap="round" style="animation-delay:0.3s;opacity:0.4"/>
      <line class="q-path" x1="28" y1="28" x2="52" y2="28" stroke-linecap="round" style="animation-delay:0.35s;opacity:0.4"/>
    `,
  },
];

export function getQualityById(id: string): ProductQuality | undefined {
  return PRODUCT_QUALITIES.find((q) => q.id === id);
}
