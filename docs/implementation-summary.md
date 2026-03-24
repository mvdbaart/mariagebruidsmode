# Redirect Engine v2 — Implementatiesamenvatting

## Aanpak

De redirect engine is modulair opgebouwd rondom de bestaande `redirects`-tabel en middleware. Nieuwe functionaliteit is toegevoegd als aparte modules zonder de bestaande werking te breken.

**Kernprincipes:**
- Logging is altijd fire-and-forget (nooit blocking)
- Suggestie-logica is puur in-memory (`getSuggestions` raakt de DB niet)
- Auto-approve uitsluitend bij confidence ≥ 0.85
- Nooit redirect naar externe URL's (structureel geblokkeerd)
- Nooit homepage-fallback auto-approven voor ambigu paden (confidence < 0.70)

---

## Gewijzigde bestanden

### `src/lib/redirects.ts`
**Wat toegevoegd:**
- `CONFIDENCE_AUTO_APPROVE = 0.85` — gedeelde drempelwaarde
- `Suggestion` interface (geëxporteerd)
- `ALIAS_MAP` — 15 bekende WordPress/WooCommerce-alias-URL's met vaste confidence
- `PATTERN_RULES` — 10 regex-patronen voor taxonomieën, categoriepaden en product-URLs
- `getSuggestions(path)` — publieke pure functie
- `normalizeSlug()` — interne fallback helper

**Niet aangeraakt:** `getActiveRedirects()`, `invalidateRedirectCache()`, `RedirectCache`.

### `src/middleware.ts`
**Wat toegevoegd:**
- Import van `shouldLog404`, `logNotFound`
- Na `next()`: check op `response.status === 404` + fire-and-forget `logNotFound()`
- Scope: alleen niet-admin, niet-api, niet-asset paden

---

## Nieuwe bestanden

### `supabase/migrations/20260321300000_redirect_engine_v2.sql`
- Tabel `redirect_404_log` met uniek index op `path`
- Tabel `redirect_suggestions` met uniek index op `from_path`
- SQL-functie `upsert_404_log` (atomaire INSERT … ON CONFLICT DO UPDATE)
- RLS ingeschakeld op beide tabellen

### `src/lib/notFoundLogger.ts`
- `shouldLog404(path)` — filtert assets en systeem-paden
- `logNotFound(path, request)` — async, swallows alle exceptions

### `src/lib/sitemapImporter.ts`
- `importFromSitemap(url?)` — volledige import flow
- Haalt sitemap index en alle child sitemaps op
- Verifiëert product-slugs in `products` tabel
- Batch-upsert naar `redirects` (auto-approve) of `redirect_suggestions`

### `src/pages/api/admin/sitemap-import.ts`
- POST — triggert import, invalideert redirect-cache bij nieuwe redirects

### `src/pages/api/admin/redirect-suggestions.ts`
- GET — lijst suggesties, filterable op status

### `src/pages/api/admin/redirect-suggestions/[id].ts`
- PUT — approve (maakt redirect aan + markeert suggestion) of reject
- DELETE — verwijdert suggestion

### `src/pages/api/admin/404-log.ts`
- GET — lijst 404-entries, gesorteerd op `hit_count` DESC
- DELETE — wist het volledige log

### `docs/redirect-architecture.md`
- Volledige architectuurdocumentatie

---

## Uitgebreide bestanden

### `src/pages/admin/instellingen/redirects.astro`
- Frontmatter: telt `pendingSuggestions` en `total404` voor header stats
- Tab-navigatie (4 tabs, pure JS)
- Tab "Suggesties": lazy-load, filterable, approve/reject per suggestie
- Tab "404 Monitor": lazy-load, gesorteerd op hits, log wissen
- Tab "Sitemap import": URL-input, trigger-knop, resultaat-samenvatting

---

## Aannames

1. **`/inspiratie/[slug]` en `/blog/[slug]`** hebben dezelfde padstructuur als de oude site — geen redirect nodig. De importer slaat deze over.

2. **Product-URLs** (`/online-bruidsmode/{slug}`) worden gemapt naar `/product/{slug}`. Als de slug niet in de `products` tabel staat, wordt confidence verlaagd naar 0.70 (suggestion, niet auto-approve).

3. **WooCommerce-pagina's** (`/cart`, `/afrekenen`, `/wishlist`) zijn al voorzien van redirects in de initiële migratie. De importer slaat ze over.

4. **Sitemap-fetch** gebruikt de live URL `https://www.mariagebruidsmode.nl/sitemap_index.xml`. Als de site offline is of de sitemap verandert, werkt de importer met wat beschikbaar is.

5. **`upsert_404_log`** is een `SECURITY DEFINER` functie. Dit is nodig omdat de `redirect_404_log` tabel RLS heeft ingeschakeld en de service-role client de functie aanroept vanuit server-side code.

6. **Redirect-chain detectie** is bewust niet geïmplementeerd in de write-laag. Dit is een monitoring-verantwoordelijkheid (admincheck bij aanmaken) en geen runtime-vereiste.

---

## Automatisch goedgekeurde mappings (bij import)

Patronen met confidence ≥ 0.85 die direct als actieve redirect worden opgeslagen:

| Oud patroon | Nieuw pad | Confidence | Methode |
|-------------|-----------|-----------|---------|
| `/online-bruidsmode/{slug}` (als slug bestaat in DB) | `/product/{slug}` | 0.92 | pattern |
| `/bruidsmode-eigenschap/silhouet/{slug}` | `/trouwjurken/vormen` | 0.85 | pattern |
| `/inspiratie/categorie/{slug}` | `/inspiratie/` | 0.85 | pattern |
| `/online-agenda` | `/afspraak-maken` | 0.90 | alias |
| `/online-bruidsmode/vip-arrangement-ticket` | `/vip-arrangement/` | 0.90 | alias |
| `/afspraak-maken/vip-afspraak` | `/vip-arrangement/` | 0.85 | alias |
| `/algemene-voorwaarden` | `/voorwaarden` | 0.90 | alias |

---

## Opgeslagen als suggestion (voor review)

Patronen met confidence < 0.85 die wachten op handmatige goedkeuring:

| Oud patroon | Suggestie | Confidence | Reden voor review |
|-------------|-----------|-----------|------------------|
| `/online-bruidsmode/{slug}` (slug niet in DB) | `/product/{slug}` | 0.70 | Product nog niet gemigreerd |
| `/bruidsmode/trouwjurken/{stijl}` | `/trouwjurken/` | 0.82 | Stijlpagina heeft geen directe equivalent |
| `/bruidsmode-eigenschap/merk/{slug}` | `/trouwjurken/` | 0.75 | Merken-filtering niet aanwezig in nieuwe site |
| `/bruidsmode-eigenschap/kleur/{slug}` | `/trouwjurken/` | 0.75 | Kleurfilter niet aanwezig in nieuwe site |
| `/bruidsmode-eindhoven` | `/` | 0.55 | Lokale landingspagina, beste match onduidelijk |
| `/trouwjurken-en-trouwpakken-in-geldrop` | `/` | 0.55 | Lokale landingspagina, beste match onduidelijk |
| `/wishlist` | `/trouwjurken/` | 0.50 | WooCommerce wishlist, geen equivalent |
