# Banani implementation status

Last updated: 2026-11-11

Banani flows: « Interface Verre Menthe » (`0a703blR_eKf`), « Accueil Iwadu Pharma » (`sYxQQxtxND67`).
Mockup copy is adjusted to the product rules (no reservation, pass wording,
insurance on the pharmacy page, unlock without account) and to the charte V1.0
(Outfit / Figtree, project tokens), not to Banani's own fonts.

## Done

- [x] `admin-dashboard` — preview at `src/app/dev/admin/page.tsx` — plan: `admin-dashboard.md` — commit: f381c60
- [x] `resultats-ordonnance` — preview at `src/app/dev/resultat/page.tsx` — plan: `resultats-ordonnance.md` — commit: 7e2c3d0
- [x] `accueil` — `src/app/page.tsx` (hero with faint photo + hand-drawn map, free-preview example, FAQ grid)
- [x] `capture-camera` — `src/app/ordonnance/page.tsx`, `components/prescription/*`
- [x] `resultats-gratuit` — `src/app/resultat/[token]/page.tsx` (preview, locked cards, `UnlockCard`)
- [x] `paiement-mobile-money` — `components/payment/PaymentDialog.tsx`, `PaymentPanel.tsx`
- [x] `fiche-pharmacie` — `src/app/pharmacie/[slug]/page.tsx` (insurance calculator instead of reservation)
- [x] `pharmacies-garde` — `src/app/gardes/page.tsx`
- [x] `admin-tableau-de-bord` — `src/app/admin/page.tsx`, shared frame `components/dashboard/*` applied to `/admin/*`, `/compte/*`, `/settings` — plan: `admin-tableau-de-bord.md`

Verified in the browser on 2026-11-11 at 320, 360, 800, 1280 and 1440 px: no
horizontal scroll on public, account and admin pages; full journey (manual
entry → preview → simulated payment → unlocked result → pharmacy page →
insurance estimate → trip report) and offered unlock with an account.

## In progress

- None.

## Pending

- None.

## Open design questions

- Glassmorphism cost on entry-level Android phones: to measure on a real device. A « lite » mode without blur already exists.
- Hero photo is a public-domain pharmacy picture (`public/images/SOURCES.md`); replace with a local photo when one is available.
