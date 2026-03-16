# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev        # Start dev server at localhost:4321
npm run build      # Build production site to ./dist/
npm run preview    # Preview production build locally
```

Utility scripts (run with `node scripts/<name>.js`):
- `setup_buckets.js` — create Supabase storage buckets
- `extract_site_content.js` — extract content from the live site
- `mirror_and_extract.js` — mirror and extract site content
- `check_db.js` / `check_images.js` — diagnostics

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=                  # comma-separated list of admin email addresses
```

## Architecture

**Stack:** Astro 6 (SSR, `output: 'server'`) + Node adapter (standalone) + React (islands) + Tailwind CSS v4 + Supabase.

### Data layer

- `src/lib/supabase.ts` — public anon client for use in `.astro` frontmatter and client-side code.
- `src/lib/serverAuth.ts` — server-only helpers: `getAdminAuthFromCookies`, `getServiceRoleClient`, `isAdminUser`, `setAuthCookies`, `clearAuthCookies`. Use `getServiceRoleClient()` for any write operation that bypasses RLS.
- `src/lib/storage.ts` — helpers for building Supabase Storage paths (`buildImageStoragePath`) and public URLs (`getPublicStorageUrl`). Four buckets: `products`, `collections`, `blog`, `inspiration`.

### Auth / Admin

- `src/middleware.ts` guards all `/admin/*` routes: validates cookies via `getAdminAuthFromCookies` and redirects to `/login` if unauthenticated.
- Admin status is determined by either `ADMIN_EMAILS` env var or `user.app_metadata.role === 'admin'`.
- Auth cookies: `sb-access-token` (httpOnly) and `sb-refresh-token` (httpOnly, 30-day maxAge).
- Login/logout API routes: `src/pages/api/auth/login.ts` and `logout.ts`.

### Page structure

- `src/layouts/Layout.astro` — base layout with Header, Footer, Google Fonts (Cormorant Garamond, Cormorant Infant, Jost), and skip-link for accessibility. All pages are in Dutch (`lang="nl"`).
- Public pages: `/`, `/trouwjurken/`, `/trouwjurken/[slug]`, `/trouwpakken/`, `/product/[slug]`, `/inspiratie/`, `/inspiratie/[slug]`, `/blog/`, `/blog/[slug]`, `/over-ons`, `/afspraak-maken`, `/privacy`.
- Admin pages (protected): `/admin/`, `/admin/collecties`, `/admin/producten`, `/admin/blog`, `/admin/inspiratie`, plus edit routes for products/collections.
- API routes: `/api/appointments` (POST, public), `/api/admin/products/[id]` (PUT), `/api/admin/collections/[id]`.

### Supabase tables referenced

`products`, `collections`, `blog_posts`, `real_weddings`, `appointments`.

### Design system

Defined in `src/styles/global.css` using Tailwind v4 `@theme`. Key tokens:
- Colors: `ivory`, `cream`, `blush`, `champagne`, `linen`, `charcoal`, `taupe`, `gold`.
- Fonts: `font-display` (Cormorant Garamond), `font-body` (Jost), `font-italic` (Cormorant Infant).
- Reusable button classes: `.btn-premium` (dark fill), `.btn-gold` (gold outline), `.btn-blush` (blush fill).
- Card class: `.glass-card`. Eyebrow text: `.ds-eyebrow`. Quote text: `.ds-quote`.

Images that are not yet in Supabase Storage fall back to `/wp-content/uploads/…` paths (static files from the old WordPress site).
