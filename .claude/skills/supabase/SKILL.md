---
name: supabase
description: Voer Supabase CLI-bewerkingen uit voor dit project — migraties pushen, status controleren, migraties bekijken, db resetten, directe SQL uitvoeren, etc.
argument-hint: [db push | db reset | status | migrations list | sql "<query>" | <andere supabase opdracht>]
allowed-tools: Bash, Read, Glob
---

# Supabase CLI Skill

Je voert Supabase CLI-bewerkingen uit voor het project **Mariage Bruidsmode**.

## Credentials & connectie

Lees altijd eerst `.env.local` om de credentials op te halen:

```bash
# Lees de benodigde variabelen
source .env.local 2>/dev/null || true
```

Benodigde variabelen (staan in `.env.local`):
- `DATABASE_URL` — PostgreSQL connection string voor directe DB-toegang en `supabase db push --db-url`
- `PUBLIC_SUPABASE_URL` — REST API base URL (bijv. `https://[ref].supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role JWT voor REST API-aanroepen (bypast RLS)

**Belangrijk:** Gebruik altijd `--db-url "$DATABASE_URL"` zodat er geen `supabase link` nodig is.

## Standaardgedrag bij $ARGUMENTS

Verwerk het argument en voer de juiste actie uit:

| Argument | Actie |
|---|---|
| `db push` of leeg | Bekijk pending migraties, push met `--db-url` |
| `db reset` | Waarschuw: **wist alle data**, vraag expliciete bevestiging |
| `status` | Toon verbindingsstatus |
| `migrations list` | Toon alle migraties en hun status |
| `db diff` | Diff tussen lokaal schema en remote |
| `db pull` | Pull remote schema naar lokale migratie |
| `sql "<query>"` | Voer directe SQL uit via psql |
| `insert <tabel> <json>` | Insert een rij via REST API |
| `functions list` | Toon Edge Functions |
| `functions deploy <naam>` | Deploy een specifieke Edge Function |

## Werkwijze

1. **Lees credentials** uit `.env.local`
2. **Analyseer het argument** — bepaal welk commando gepast is
3. **Toon het commando** dat uitgevoerd gaat worden vóórdat het gerund wordt
4. **Voer uit** vanuit de projectmap
5. **Interpreteer de uitvoer** — leg NOTICEs en ERRORs uit in begrijpelijke taal
6. **Stel vervolgstappen voor** indien relevant

## Commando's

### Migraties pushen (zonder supabase link)

```bash
# Lees DATABASE_URL uit .env.local
export $(grep -v '^#' .env.local | xargs)

# Bekijk pending migraties
npx supabase migration list --db-url "$DATABASE_URL"

# Push migraties
echo "Y" | npx supabase db push --db-url "$DATABASE_URL"
```

### Directe SQL uitvoeren via psql

```bash
export $(grep -v '^#' .env.local | xargs)
psql "$DATABASE_URL" -c "<SQL-query>"

# Meerdere statements uit bestand:
psql "$DATABASE_URL" -f supabase/migrations/<bestand>.sql
```

### REST API — SELECT (lezen)

```bash
export $(grep -v '^#' .env.local | xargs)
curl -s "$PUBLIC_SUPABASE_URL/rest/v1/<tabel>?select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq .
```

### REST API — INSERT

```bash
export $(grep -v '^#' .env.local | xargs)
curl -s -X POST "$PUBLIC_SUPABASE_URL/rest/v1/<tabel>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '<json-data>'
```

### REST API — UPDATE

```bash
export $(grep -v '^#' .env.local | xargs)
curl -s -X PATCH "$PUBLIC_SUPABASE_URL/rest/v1/<tabel>?id=eq.<id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '<json-data>'
```

### REST API — DELETE

```bash
export $(grep -v '^#' .env.local | xargs)
curl -s -X DELETE "$PUBLIC_SUPABASE_URL/rest/v1/<tabel>?id=eq.<id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Schema diff

```bash
export $(grep -v '^#' .env.local | xargs)
npx supabase db diff --db-url "$DATABASE_URL"
```

### Status controleren

```bash
export $(grep -v '^#' .env.local | xargs)
# Controleer connectie via psql
psql "$DATABASE_URL" -c "SELECT current_database(), current_user, version();"
```

## Aandachtspunten

- **`DATABASE_URL` ontbreekt in `.env.local`?** Haal de URI op via Supabase Dashboard → Project Settings → Database → Connection String (gebruik "Session mode", poort 5432). Voeg toe aan `.env.local`.
- **`db reset` is destructief** — wist alle data en past migraties opnieuw toe. Vraag altijd om expliciete bevestiging.
- **NOTICE-meldingen** (bijv. "relation already exists, skipping") zijn normaal bij idempotente migraties.
- **ERROR-meldingen** zijn een probleem — analyseer en los op.
- **RLS**: alle tabellen hebben RLS aan met policy `FOR ALL USING (false)`. De service role key en DATABASE_URL bypassen RLS allebei.
- Na een `db push` die nieuwe tabellen introduceert: check of `node scripts/setup_buckets.js` ook nodig is.

## Standaard: db push

Als `$ARGUMENTS` leeg is of `db push`:

1. Lees credentials: `export $(grep -v '^#' .env.local | xargs)`
2. Toon pending migraties: `npx supabase migration list --db-url "$DATABASE_URL"`
3. Push: `echo "Y" | npx supabase db push --db-url "$DATABASE_URL"`
4. Rapporteer het resultaat
