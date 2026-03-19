---
name: front-end-design
description: Design en implementeer frontend UI voor dit project. Volgt het Mariage Bruidsmode design system (kleuren, typografie, componenten). Gebruik bij het bouwen van nieuwe pagina's, componenten, of bij vragen over het visuele ontwerp.
argument-hint: [pagina of component naam]
allowed-tools: Read, Glob, Grep
---

# Front-End Design Skill

Je werkt aan **Mariage Bruidsmode** — een luxe bruidswinkel website. Het design is elegant, verfijnd en bridal-georiënteerd. Alle teksten zijn in het Nederlands.

## Design Systeem

Definieerd in `src/styles/global.css` via Tailwind v4 `@theme`.

### Kleuren
| Token | Gebruik |
|---|---|
| `ivory` | Achtergronden, hero secties |
| `cream` | Lichte achtergronden, kaarten |
| `blush` | Accenten, hover states, subtiele highlights |
| `champagne` | Warme achtergronden, borders |
| `linen` | Neutrale achtergronden |
| `charcoal` | Primaire tekst, donkere elementen |
| `taupe` | Secondaire tekst, subtiele UI |
| `gold` | Premium accenten, hover effecten, borders |

### Typografie
- `.font-display` — Cormorant Garamond (titels, koppen)
- `.font-body` — Jost (bodytekst, labels, knoppen)
- `.font-italic` — Cormorant Infant (quotes, subtitels)

### Herbruikbare klassen
- `.btn-premium` — donkere fill knop (primaire actie)
- `.btn-gold` — gold outline knop (secundaire actie)
- `.btn-blush` — blush fill knop (zachte actie)
- `.glass-card` — verhoogde kaart met glasmorphism effect
- `.ds-eyebrow` — kleine bovenliggende label tekst (bv. "Collectie 2025")
- `.ds-quote` — quote opmaak

### Afbeeldingen
- `.hero-image` — groot hero formaat
- `.gallery-image` — galerij formaat
- `.featured-image` — uitgelichte afbeelding
- Ken Burns animatie effect beschikbaar voor hero afbeeldingen

## Werkwijze bij $ARGUMENTS

1. **Lees eerst** de bestaande design tokens in `src/styles/global.css`
2. **Bekijk vergelijkbare pagina's** voor patterns (bijv. `src/pages/trouwjurken/index.astro` voor een collectiepagina)
3. **Gebruik Astro componenten** (`.astro`) voor statische/SSR structuur
4. **Gebruik React islands** (`.tsx`) alleen voor interactieve delen
5. **Volg de layout structuur**: `src/layouts/Layout.astro` wrapping alle publieke pagina's
6. **Admin pagina's**: consistent met bestaande admin UI in `src/pages/admin/`

## Design Principes

- **Elegantie boven drukheid** — witruimte, rustige compositie
- **Typografie als design element** — grote display fonts voor impact
- **Beelden centraal** — grote, kwalitatieve foto's met subtiele overlays
- **Mobiel-first responsief** — Tailwind breakpoints: `sm`, `md`, `lg`, `xl`
- **Toegankelijkheid** — voldoende contrast, focus-visible states, semantische HTML
- **Performance** — lazy loading op afbeeldingen, minimale JS

## Voorbeeld patroon: sectie opmaak

```astro
<section class="py-20 bg-ivory">
  <div class="max-w-6xl mx-auto px-6">
    <p class="ds-eyebrow text-center mb-3">Eyebrow label</p>
    <h2 class="font-display text-4xl text-charcoal text-center mb-12">Sectie Titel</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- kaarten -->
    </div>
  </div>
</section>
```
