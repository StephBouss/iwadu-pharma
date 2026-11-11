# Admin – Tableau de bord — Banani → Next.js 16 / Tailwind v4

## Source
- Banani screen: « Admin – Tableau de bord – Iwadu Pharma »
- Fetched: 2026-11-11
- Used as the single template for every signed-in space: back-office (`/admin/*`), « Mon espace » (`/compte/*`) and `/settings`.

## Structure map
- Sidebar 280 px, gradient deep → action (Banani uses deep → brand; action keeps white text AA), mint orbs, active item white/15 glass, user card + logout at the bottom. Hidden below `lg`, replaced by scrollable nav pills.
- Thin top strip: optional leading slot (admin search), trailing slot (admin alerts bell), FAQ and Déconnexion.
- Page heading: H1 Outfit 32/40 px `text-brand`, muted subtitle (date by default).
- Section title (h2 xl `text-brand`) sits ABOVE a light glass card (white/85, blur 20, radius 20, shadow 0 12 40 ink/10).
- Admin dashboard: 4 KPI cards with trend pill → « Ordonnances par jour » line chart + « Distribution des ordonnances » donut → « Top pharmacies » table + « Activité récente » → existing finance / accounts / funnel / demand panels.

## Components
- **NEW** `components/dashboard/{DashboardFrame,DashboardSidebar,DashboardTopStrip,DashboardMobileNav,PageHeading,LogoutAction,types}` — shared frame.
- **NEW** `components/admin/AdminChrome.tsx`, `components/account/AccountChrome.tsx` — nav per space, same frame.
- **NEW** `components/admin/DailyLineChart.tsx` (client: crosshair + tooltip on hover and arrow keys, legend, table view), `components/admin/OverviewBlocks.tsx` (donut, top pharmacies, activity).
- **NEW** `lib/server/iwadu/admin-overview.ts` — trends (month-to-date vs same span last month), 14 days series, outcome split, top pharmacies (sessions where the pharmacy had every item), recent activity.
- **REUSE / restyled** `StatCard`, `KpiPanel` (title outside the card), `GlassPanel` (`glass-panel` hook for the `.dashboard` light glass).

## Token mapping
| Banani | Project |
| DM Sans | Outfit (titles) / Figtree (text) — charte V1.0 |
| `#0f5f51 → #0f927c` sidebar | `from-deep to-action` (contrast) |
| chart lines | `--color-chart-1` #0f927c, `--color-chart-2` #3b6fd0 (CVD-validated) |
| donut | chart-1 complete, `--color-chart-3` #b0610d partial, `--color-chart-rest` #c9d3ce none |
| card shadow / radius | `--shadow-glass-lg`, `--radius-panel` (20 px) |

## Deviations
- « Aide » label → « FAQ » (owner request).
- Charts always carry a legend, values in text and a table view; a status never relies on colour alone.
- « Mon espace » keeps its own links (Carnet, Pass, Reçus, Assurance et profil) plus Administration for admins, Pharmacies de garde and Tarifs.

## Verification (2026-11-11)
- 1440 and 360 px: admin dashboard, every admin page, every `/compte` page, `/settings`, `/auth/error` — HTTP 200, no horizontal scroll.
- lint, typecheck, 704 unit tests, production build: pass.
