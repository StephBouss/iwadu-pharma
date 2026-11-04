# Dashboard Admin — Banani → Next.js 16 + Tailwind v4

## Source

- Banani flow « Interface Verre Menthe » (`0a703blR_eKf`), screen `screens/AdminDashboard.jsx` (« Dashboard Admin », desktop).
- Fetched: 2026-11-04.

## Where it lives

- Preview: `/dev/admin` (development only, 404 in production), **fictitious data** from `src/lib/demo/admin-dashboard.ts`.
- Target: `/admin`, admin role only, real data (confirmed payments, business tables) — back-office lot. Not built yet: no server-side role check for pages exists today (only API `requireAdmin`), and the back-office must never show fictitious figures.

## Structure map

| Banani block | Component | Responsive |
|---|---|---|
| AdminSidebar (220 px, dark glass) | `components/admin/AdminSidebar` | `lg+` only, sticky full height |
| — (none in Banani) | `components/admin/AdminMobileNav` | `< lg`: 48 px pills, horizontal scroll |
| AdminTopBar | `components/admin/AdminTopBar` | search + bell from `md`; symbol logo `< lg` |
| 4 × StatCard | `components/admin/StatCard` | 2 cols → 4 cols at `lg` |
| MiniBarChart panel | `components/admin/WeeklyBarChart` in `GlassPanel` | full width at `md`, 2fr at `lg` |
| Guard pharmacies | `components/admin/OnDutyList` | — |
| « Statuts en temps réel » | `components/admin/StatusCounts` | — |
| RecentOrdersTable | `components/admin/RecentOrdersTable` | card list `< md`, `<table>` from `md` |
| GlassPanel / BgShapes | `components/ui/GlassPanel`, `components/brand/BgShapes` | shared with all Banani screens |

## Token mapping (Banani → project)

| Banani | Project |
|---|---|
| `background #F5F7F3`, `foreground #021916` | `ivory`, `ink` |
| `primary #0C7A68`, `accent #0F927C`, `mint #6FDCC0` | `action`, `brand`, `mint` |
| `border #D8E1DC`, `muted #E9EEEC`, `muted-foreground #4E5F5A` | `hairline`, `muted` (new), `ink-muted` |
| `secondary #D3EEE6` | `mint-soft` (new) |
| `status-*` | `available`, `low`, `unavailable`, `verify`, `on-duty`, `error` (+ `-soft`) |
| `rounded-sm/md/lg/xl` = 8/12/16/24 px | `rounded-lg` / `rounded-field` / `rounded-card` / `rounded-sheet` |
| `text-xs/sm` = 12/13 px | raised to the charter minimum: `type-caption` (13) / `type-body-small` (14) |
| Glass: `rgba(255,255,255,.72)`, blur 20 px, border `.6`, shadow `0 8px 32px rgba(2,25,22,.08)` | `bg-surface/72`, `backdrop-blur-glass`, `border-surface/60`, `shadow-glass` (fallback `bg-surface/92` without `backdrop-filter`) |

## Deliberate deviations from the mockup

- **Moon icon in ink, not mint**: the charter reserves mint for dark backgrounds.
- **« Statuts en temps réel » → « Statuts du jour »**: « en temps réel » only when stock is truly connected.
- **Trend colour = good/bad, not up/down**: « −3 » alerts is shown green.
- **Bar chart** (dataviz rules): highlighted bar in `brand` (validator: passes chroma + contrast; `action` failed the chroma floor), other bars neutral grey, value label only on the highlighted bar, native tooltips, « Voir les données » table. Bars capped at 24 px, 4 px rounded top.
- **Data adapted to Gabon**: Libreville districts (Akanda, Louis, Nzeng-Ayong) instead of Yaoundé ones, today's date instead of a 2025 date, clearly fictitious patient names (« Patient Démo »…), payments shown in full FCFA.
- **On-duty rows**: badge moved under the name so names never wrap on 3 lines in the narrow column.
- **« Total : 345 » pill** in neutral `muted`: status colours are reserved for statuses.

## Verification

- 1280 px: sidebar 220 px, 4 equal KPI cards, blur active, table shown, 7 bars, no console error.
- 768 px: sidebar hidden, mobile nav shown, KPI 2 cols, table kept, no horizontal scroll.
- 360 px: card list instead of table, no horizontal scroll, every target ≥ 44 px after fixing « Voir les données » (now 48 px).

## Open questions for user

- None blocking. The real `/admin` waits for the back-office lot (real data + admin-only access).
