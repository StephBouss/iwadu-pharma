# Résultats ordonnance — Banani → Next.js 16 + Tailwind v4

## Source

- Banani flow « Interface Verre Menthe » (`0a703blR_eKf`), screen `screens/ResultsScreen.jsx` (« Résultats ordonnance », mobile).
- Fetched: 2026-11-04.
- Brief: reproduce the mobile screen, then **redesign it for desktop** while keeping the charter.

## Where it lives

- Preview: `/dev/resultat` (development only, 404 in production), **fictitious data** from `src/lib/demo/search-result.ts`, labelled « Exemple fictif ».
- Target: not decided. The real result belongs to the prescription search journey (not built yet); its URL and whether it unfolds on the same page as the search are decided with that journey.

## Structure map

| Banani block | Component | Responsive |
|---|---|---|
| App Header (glass, logo, « Près de votre position · Louis », account) | `components/layout/AppHeader` | subtitle wraps on 2 lines at 360 px |
| Title « Votre ordonnance » + count + update time | page | `type-title-1` → `type-display` at `lg` |
| Pharmacy cards (best one ringed) | `components/pharmacy/PharmacyCard` | 1 column; 2 equal-height columns from `xl` |
| — (desktop only) medicines at the best pharmacy | `components/pharmacy/MedicineList` (new) in `GlassPanel` | hidden below `lg` |
| Price summary | `components/pharmacy/PriceSummary` | — |
| Info « L’IA lit l’ordonnance… » | page (`AiReadingNote`) | after the price on mobile; under the cards on desktop |
| Bottom action bar | `components/pharmacy/ReserveBar` (new) | sticky at the bottom on mobile/tablet; static in the right column on desktop |

Logic: `sortPharmaciesForResult` (whole prescription first, then distance) and `prescriptionCoverage` (badge status + label) in `src/lib/prescription.ts`, unit-tested.

## Desktop redesign (lg, ≥ 1024 px)

- Container widens from the 480 px patient column to `max-w-6xl`; two columns: results `1fr` | summary `380px`.
- Right column is sticky (`top-6`) and holds what the visitor decides with: medicines at the best pharmacy, price, the single primary action. The AI note moves left so the action stays above the fold at 1280×800 and 1366×768.
- Cards go 2-up only from `xl` (1280 px): at 1024 px a 2-up grid left 270 px per card and the « De garde » badge collided with the name.
- Below `lg` (including 768 px tablets) the page keeps the charter's 480 px centre column and the Banani mobile order.

Technique: the right-column wrapper is `display: contents` below `lg`, so the action bar becomes a direct flex child of `<main>` and its `position: sticky` holds across the whole page on mobile, with a single primary button in the DOM.

## Token mapping

Same as `admin-dashboard.md` (Banani `background`/`primary`/`accent`/`mint`/`secondary`/status tokens → `ivory`, `action`, `brand`, `mint`, `mint-soft`, state tokens; glass → `GlassPanel`).

## Deliberate deviations from the mockup

- **Desktop layout** is a redesign (requested), not in Banani; the charter's « 480 px centre column on desktop » rule is deliberately set aside for this screen at `lg`+.
- **Medicines panel** added on desktop only (uses the extra width; confirms what the price covers).
- **Dosages and times** use no-break spaces (« 500 mg », « 21 h ») so they never wrap mid-value.
- **Long pharmacy names** wrap inside the card instead of overflowing (`wrap-break-word`).

## Verification

- 360 px: Banani order, no horizontal scroll, every target ≥ 44 px, one primary button, action bar sticky while scrolling and back in flow at the end.
- 768 px: 480 px centre column, no horizontal scroll.
- 1024 px: one column of cards, no collision, action visible at 1024×768.
- 1280 px: cards 2-up with aligned buttons, action fully visible at 1280×800, no console error.

## Open questions for user

- Where the real result lives (own URL vs. same page as the search) — decided with the search journey.
- Links « Voir la pharmacie » and « Réserver et payer » point to pages not built yet (`/pharmacie/…`, `/connexion`).
