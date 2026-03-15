# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/`: Route-based pages, including public pages, admin pages, and API endpoints (`src/pages/api/...`).
- `src/components/`, `src/layouts/`, `src/styles/`: Reusable UI building blocks and global styling.
- `src/lib/`: Shared runtime utilities (for example Supabase/auth helpers).
- `src/middleware.ts`: Request-time auth/route protection.
- `public/`: Static assets served as-is.
- `supabase/schema.sql` and `supabase/seed.sql`: Database schema and seed data.
- `scripts/`: Local maintenance scripts (e.g., DB/image checks, seeding).

## Build, Test, and Development Commands
- `npm run dev`: Start Astro dev server.
- `npm run build`: Build production server output into `dist/`.
- `npm run preview`: Run the built app locally for verification.
- `npm run astro -- check` (after installing `@astrojs/check`): Static type/content checks.

Example:
```bash
npm run dev
npm run build && npm run preview
```

## Coding Style & Naming Conventions
- Language: TypeScript/ESM in Astro files and API routes.
- Indentation: 2 spaces; keep imports grouped at top.
- Use descriptive names: `kebab-case` for route files (`afspraak-maken.astro`), `PascalCase` for component files (`Header.astro`).
- Keep page logic minimal; move reusable logic into `src/lib/`.
- Prefer server-side API routes for privileged operations (admin writes, auth-sensitive flows).

## Testing Guidelines
- No formal test framework is configured yet.
- Minimum validation for each change:
  - `npm run build` must pass.
  - Manually verify affected routes in browser (public and `/admin` when relevant).
  - For DB-related changes, verify against `supabase/schema.sql` and run relevant scripts from `scripts/`.

## Commit & Pull Request Guidelines
- Current history is minimal (`Initial commit`), so use clear imperative commit messages.
- Recommended format: `type(scope): summary` (e.g., `fix(admin): move product updates to API route`).
- PRs should include:
  - What changed and why.
  - Any env/config changes (e.g., `.env.local` keys).
  - Screenshots for UI changes.
  - Manual verification steps and results.

## Security & Configuration Tips
- Keep secrets only in `.env.local` (never commit real credentials).
- Required admin/auth env keys include `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`.
- Do not expose service-role keys to client-side code.