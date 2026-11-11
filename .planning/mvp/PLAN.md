# MVP web — build plan

Last updated: 2026-11-11. Technical plan only: no business figures here (prices,
quotas, rates and delays live in the `settings` table, see "Settings").

## Ground rules

- Next.js 16 App Router + Prisma/Neon (option B). Supabase Auth → kit auth;
  Postgres RLS → access checks in `lib/server` services; Realtime → polling;
  Edge Functions → Route Handlers; analytics → own `AnalyticsEvent` table.
- Reads: Server Components call `lib/server/*` services directly.
  Writes: Route Handlers under `/api/*` (same API for the future mobile app).
- Pages: charter tokens only, one primary button per screen, French « vous »,
  fictitious data labelled « Exemple fictif » / « Démonstration ».
- Copy is not tied to one city or country: the product is meant for several
  African countries (no « Libreville » / « Gabon » in visible text).
- Payments: BambooPay adapter waits for its API docs; a simulator signs a
  webhook (amount included) and posts it through the protected webhook factory,
  so unlocks and passes are only ever granted by a verified webhook. The
  simulator runs in production only with `PAYMENT_SIMULATOR=1` (demo).
  Bictorys stays in the code, inactive (empty keys).
- Prescription reading: DeepSeek vision (OpenAI-compatible API), env-gated;
  `PRESCRIPTION_READER=simulated` for demos. Photos are cropped and compressed
  in the browser and never stored; a visible person's name blocks the read.
- Map: Leaflet, lazy-loaded; tile URL from env.
- Silent session refresh on every page: `src/proxy.ts` (Next 16 proxy) +
  `/api/auth/refresh-and-return`.

## Settings (keys only; values in /admin/parametres, seeded locally from the
git-ignored `frontend/settings.local.json`)

Unlock and pass prices and durations, solo-pass search quota, free previews per
device and window, first unlock offered with an account, result-link lifetime,
fair-use daily cap and monthly average, guarantees (trip report delay, pass
refund conditions and texts), AI free reads, search radius, stock thresholds,
stale-stock delay, payment countdown, provider fee rate, partner share rate and
name, sync alert delay, contact and legal texts. V2 keys (reservations,
pharmacy subscription, ads) are hidden.

## Lots

| Lot | Scope | Status |
|---|---|---|
| A | Domain models, settings registry, pricing / entitlement / match / CSV utils (TDD), fictitious seed | done |
| B | Public shell, home (Banani), `/gardes`, `/pharmacie/[slug]`, `/tarifs`, `/pharmacies`, `/aide` (FAQ grid), legal pages | done |
| C | `/ordonnance`: camera or import (PDF → image), crop, read, list check, position | done |
| D | `/resultat/[token]`: free preview, unlock (pay, pass, offered, credit), payment dialog + simulator, receipt, unlocked list/map, share, trip report | done |
| E | `/connexion`, `/inscription`, `/compte/*` (home, carnet, pass, paiements, profil) | done |
| F | Reservations | V2 (flag off) |
| G | `/pro/*` pharmacy space | V2 (flag off) |
| H | `/admin/*`: KPIs, demo view for the software partner, CSV stock import, credits, fair-use alerts, settings | done |
| I | Browser pass at 360/768/1280, gates (format, lint, typecheck, tests, build) | done 2026-11-11; commits pending |

## Open items

- BambooPay adapter (API docs awaited).
- DeepSeek key for real reading; simulated reader until then.
- Phone numbers are still parsed with Gabon rules (`lib/phone.ts`); make them
  country-aware before a second country.
- Time zone defaults to UTC+1 (`DEFAULT_TIME_ZONE`); make it per country before
  a second country.
