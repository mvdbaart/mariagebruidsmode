---
name: supabase
description: Voer Supabase CLI-bewerkingen uit voor dit project — migraties pushen, status controleren, migraties bekijken, db resetten, etc.
argument-hint: [db push | db reset | status | migrations list | <andere supabase opdracht>]
allowed-tools: Bash, Read, Glob
---

# Supabase CLI Skill

Je voert Supabase CLI-bewerkingen uit voor het project **Mariage Bruidsmode** op `C:/Users/Maarten/Documents/vms/mariagebruidsmode.nl`.

Alle commando's worden uitgevoerd via `npx supabase` vanuit de projectmap.

## Standaardgedrag bij $ARGUMENTS

Verwerk het argument en voer de juiste actie uit:

| Argument | Actie |
|---|---|
| `db push` of leeg | Bekijk welke migraties nog niet zijn toegepast, bevestig met de gebruiker indien nodig, en push met `echo "Y" \| npx supabase db push` |
| `db reset` | Waarschuw de gebruiker dat dit **alle data wist**, vraag expliciete bevestiging, voer dan uit |
| `status` | Toon de verbindingsstatus en projectinfo |
| `migrations list` | Toon alle migraties en hun status (applied/pending) |
| `db diff` | Genereer een diff tussen lokaal schema en remote |
| `db pull` | Pull remote schema naar lokale migratie |
| `functions list` | Toon Edge Functions |
| `functions deploy <naam>` | Deploy een specifieke Edge Function |

## Werkwijze

1. **Analyseer het argument** — bepaal welk commando gepast is
2. **Toon het commando** dat uitgevoerd gaat worden vóórdat het gerund wordt
3. **Voer uit** vanuit de projectmap:
   ```bash
   cd "C:/Users/Maarten/Documents/vms/mariagebruidsmode.nl" && <commando>
   ```
4. **Interpreteer de uitvoer** — leg NOTICEs en ERRORs uit in begrijpelijke taal
5. **Stel vervolgstappen voor** indien relevant (bijv. `node scripts/setup_buckets.js` na een migratie die een nieuwe tabel aanmaakt)

## Veelgebruikte commando's

```bash
# Migraties pushen (met auto-bevestiging)
echo "Y" | npx supabase db push

# Status controleren
npx supabase status

# Migratielijst bekijken
npx supabase migration list

# Schema diff (lokaal vs remote)
npx supabase db diff

# Nieuwe migratie aanmaken
npx supabase migration new <naam>
```

## Aandachtspunten

- **`db reset` is destructief** — wist alle data en past migraties opnieuw toe. Vraag altijd om bevestiging.
- **NOTICE-meldingen** (bijv. "relation already exists, skipping") zijn normaal bij idempotente migraties — geen actie vereist.
- **ERROR-meldingen** zijn wel een probleem — analyseer en los op.
- Na een `db push` die nieuwe tabellen/buckets introduceert: check of `node scripts/setup_buckets.js` ook nodig is.
- Migraties staan in `supabase/migrations/` — bekijk ze als je context nodig hebt.

## Standaard: db push

Als `$ARGUMENTS` leeg is, voer dan altijd `db push` uit:

1. Toon eerst de pending migraties: `npx supabase migration list`
2. Vraag bevestiging indien er pending migraties zijn
3. Push: `echo "Y" | npx supabase db push`
4. Rapporteer het resultaat
