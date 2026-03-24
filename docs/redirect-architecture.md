# Redirect Engine — Architectuur

## Overzicht

De redirect engine bestaat uit drie lagen die samenwerken om SEO-veilige URL-migratie van de oude WordPress/WooCommerce-site naar de nieuwe Astro-site te garanderen.

```
Inkomend verzoek
      │
      ▼
┌─────────────────────────────┐
│  src/middleware.ts          │  ← Eerste lijn
│  1. Exact match             │
│  2. Prefix match            │
│  (in-memory cache, 5 min)   │
└────────────┬────────────────┘
             │ Geen redirect gevonden
             ▼
┌─────────────────────────────┐
│  Astro SSR — route handler  │
└────────────┬────────────────┘
             │ response.status === 404?
             ▼
┌─────────────────────────────┐
│  notFoundLogger.ts          │  ← Fire-and-forget
│  - getSuggestions(path)     │
│  - upsert_404_log (DB)      │
└─────────────────────────────┘
```

---

## Componenten

### `src/middleware.ts`

Voert redirect lookups uit vóór elke SSR-render. Na de render detecteert het 404-responses en trigger het de logger (non-blocking).

**Veiligheidsgaranties:**
- Redirect loop-preventie: de cache slaat alleen paden op die beginnen met `/`. Open redirects zijn structureel onmogelijk omdat `to_path` in de DB niet extern kan zijn (geen `://`-controle vereist maar aanwezig in suggesties).
- Redirect chains: niet mogelijk via de engine zelf — een `from_path` kan ook als `to_path` in een ander record staan, maar de middleware voert maximaal één lookup uit per request.
- Admin/API paden worden overgeslagen voor redirect-lookup.

### `src/lib/redirects.ts`

**`getActiveRedirects()`** — Laadt alle actieve redirects uit Supabase, cached voor 5 minuten. Exact-matches worden opgeslagen in een `Map` (O(1) lookup). Prefix-matches in een array, gesorteerd op lengte (langste prefix wint).

**`getSuggestions(path)`** — Pure, synchrone functie zonder DB-toegang. Probeert drie strategieën:
1. **Alias map** — bekende oude URL's met vaste mapping (bijv. `/online-agenda` → `/afspraak-maken`)
2. **Pattern rules** — regex-patronen voor WordPress taxonomieën, categoriepaden en product-URLs
3. **Slug normalisatie** — strippt bekende WP-prefixen als fallback

Resultaat: array van `{ path, confidence, method }`, max 3 items, gesorteerd op confidence.

**Confidence-drempelwaarden:**
| Drempel | Actie |
|---------|-------|
| ≥ 0.85  | Auto-approve → `redirects` tabel, `is_active: true` |
| 0.40–0.84 | Suggestion → `redirect_suggestions` tabel, `status: pending` |
| < 0.40  | Overgeslagen |

### `src/lib/notFoundLogger.ts`

**`logNotFound(path, request)`** — Schrijft 404-hits naar `redirect_404_log` via `upsert_404_log` (Postgres-functie). Herhaalde hits voor hetzelfde pad verhogen `hit_count` in plaats van nieuwe rijen aan te maken.

**Gefilterd (nooit gelogd):**
- Statische assets: `.css`, `.js`, `.ico`, `.png`, etc.
- `/_astro/`, `/wp-content/`, `/admin/`, `/api/`
- `/robots.txt`, `/sitemap.xml`

### `src/lib/sitemapImporter.ts`

**`importFromSitemap(url?)`** — Importeert alle URLs uit de Yoast sitemap index:

1. Fetch sitemap index → lijst van child-sitemap-URLs
2. Fetch alle child sitemaps parallel (max 10 gelijktijdig)
3. Laad bestaande redirects + suggesties + product-slugs uit DB (bulkload)
4. Per URL: skip als al gemapped of zelfde pad in nieuwe site
5. Voer `getSuggestions()` uit → beste suggestie
6. Voor product-URLs (`/online-bruidsmode/{slug}`): verifieer slug in `products` tabel
7. Batch-upsert naar `redirects` (high confidence) of `redirect_suggestions` (low confidence)

**Skiplogica:**
- Reeds bestaande `from_path` entries (geen overschrijven)
- Inspiratie-posts en blog-posts (zelfde padstructuur in nieuwe site)
- WP-interne paden (`/wp-*`, `/feed/`, paginering)

---

## Database

### Tabellen

#### `redirects` (bestaand)
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `from_path` | text | Oud pad (begint met `/`) |
| `to_path` | text | Nieuw pad |
| `status_code` | integer | 301 of 302 |
| `match_type` | text | `exact` of `prefix` |
| `is_active` | boolean | Alleen actieve redirects worden geladen |
| `note` | text | Optionele omschrijving |

Unique index op `(from_path, match_type)`.

#### `redirect_suggestions` (nieuw in v2)
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `from_path` | text | Oud pad |
| `to_path` | text | Voorgesteld nieuw pad |
| `confidence` | numeric(4,3) | Zekerheidscore 0.0–1.0 |
| `source` | text | `sitemap` of `404` |
| `status` | text | `pending`, `approved`, `rejected` |

Unique index op `from_path`.

#### `redirect_404_log` (nieuw in v2)
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `path` | text | Aangevraagd pad |
| `hit_count` | integer | Aantal keer dit pad een 404 gaf |
| `first_seen_at` | timestamptz | Eerste hit |
| `last_seen_at` | timestamptz | Laatste hit |
| `suggestions` | jsonb | Beste suggesties op moment van eerste hit |
| `referer`, `user_agent`, `query_string` | text | Laatste request-metadata |

Unique index op `path` (upsert incrementeert `hit_count`).

### SQL-functie: `upsert_404_log`

```sql
SELECT upsert_404_log(p_path, p_query_string, p_referer, p_user_agent, p_suggestions);
```

Atomaire INSERT … ON CONFLICT DO UPDATE zodat `hit_count` altijd correct is, ook bij gelijktijdige requests.

---

## API Routes

| Route | Methode | Beschrijving |
|-------|---------|-------------|
| `/api/admin/redirects` | GET, POST | Lijst + aanmaken |
| `/api/admin/redirects/[id]` | PUT, DELETE | Bewerken + verwijderen |
| `/api/admin/redirect-suggestions` | GET | Lijst suggesties (filterable) |
| `/api/admin/redirect-suggestions/[id]` | PUT, DELETE | Goedkeuren/afwijzen |
| `/api/admin/404-log` | GET, DELETE | Log ophalen, log wissen |
| `/api/admin/sitemap-import` | POST | Import starten |

Alle routes vereisen admin-authenticatie via `getAdminAuthFromCookies`.

---

## Admin UI

Locatie: `/admin/instellingen/redirects`

Vier tabs:
- **Redirects** — bestaand CRUD-formulier + tabel
- **Suggesties** — pending suggestions met Goedkeuren/Afwijzen; filterable op status
- **404 Monitor** — 404-log gesorteerd op `hit_count`, met beste suggestie per pad
- **Sitemap import** — one-click import van de Yoast sitemap met resultaat-samenvatting

Suggesties en 404-log worden lazy geladen (fetch bij tab-klik) om de initiële paginasnelheid te bewaren.

---

## Bekende beperkingen

- **Redirect chains**: de engine voorkomt geen chains via DB-controle. Als `/a` → `/b` en `/b` → `/c` in de tabel staan, krijgt een bezoeker twee redirects. Handmatige controle bij het aanmaken van redirects is vereist.
- **Open redirects via DB**: de API-validatie eist dat `from_path` begint met `/` maar valideert `to_path` niet als intern pad. Vertrouw op admin-toegangscontrole.
- **Serverless fire-and-forget**: 404-logging is best-effort. In zeldzame gevallen van vroege functie-terminatie kan een hit verloren gaan.
- **Sitemap-import verifiëert alleen product-slugs**: andere entiteiten (blogs, inspiratie) worden niet geverifieerd in de DB.
