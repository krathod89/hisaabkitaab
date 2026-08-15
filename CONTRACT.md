# Tally — Screen implementation contract

Read this before editing any screen. The foundation (data, theme, navigation) is
built and typechecks. Your job: implement ONE screen file to match its design,
wiring it to the APIs below. **Do not edit foundation files** (`src/**`, other
screens, layouts). If you think the contract is missing something, add a small
_new_ colocated component under `src/components/` rather than changing shared files.

## Environment
- Expo SDK 57, React Native 0.86, React 19, expo-router (file-based), TypeScript strict.
- Run `npx tsc --noEmit` from `tally/` — it must stay green.

## Design sources (recreate pixel-close, not the DOM structure)
Under `../_design_extract/mobile-app-design-screens/project/`:
`ScreenOnboarding.dc.html`, `ScreenHome.dc.html`, `ScreenAddItem.dc.html`,
`ScreenBill.dc.html`, `ScreenShare.dc.html`, `ScreenHistory.dc.html`.
Colors in the design are OKLCH; use the **hex tokens** below instead (already converted).

## Theme — `import { color, radius, space, shadow, text, font } from '../../src/theme'`
- `color`: `bg` #fbf4ed, `card` #fff, `chipBg`, `accent` #c26300, `accentDeep`,
  `accentSoftBg`, `textPrimary`, `text32`, `text40`, `textSecondary`, `textMuted`,
  `onAccent`, `greenBg`, `greenText`, `greenIcon`, `blueIcon`, `googleBlue`,
  `border`, `borderSoft`, `divider`, `dashed`, `dotIdle`, `iconIdle`.
- `text`: ready-made styles — `h1 h2 h3 h4 amount amountMd body bodyStrong label
  caption captionMuted tab`. Spread into `<Text style={text.h2}>`.
- `radius` (sm..cardLg, pill), `space` (xs..gutter), `shadow.card`, `shadow.accentButton`.
- Fonts already loaded: Sora (display) + Work Sans (body). Use `font.*` family names if needed.

## UI primitives — `import { ... } from '../../src/components/ui'`
`PrimaryButton`, `OutlineButton`, `Card`, `Swatch` (colored item square),
`Badge` (pill), `Icon` (Material Symbols by ligature name, e.g. `<Icon name="chevron_right" />`),
`IconButton`, `Row`. Prefer these over re-styling from scratch.
**No emoji as icons** — use `Icon`.

## Data / state — `import { useApp, useItems, useBill, useSession } from '../../src/store'`
- `useItems(): Item[]` — active items (reactive).
- `useBill(cycleId?): BillSummary` — `{ cycle, lines: BillLine[], grandTotal, dayOfCycle, daysInCycle, progress }`. Defaults to current open cycle.
- `useSession(): Session | null`.
- `const { mutate, refresh } = useApp()` — wrap every write: `mutate(() => logEntry(...))`. This re-renders dependent screens.

## Repositories (call inside `mutate`) — `import { ... } from '../../src/repositories/...'`
- `items`: `createItem`, `updateItem`, `archiveItem`, `getItem`, `addPriceVersion`, `currentPrice`, `priceAt`.
- `entries`: `logEntry`, `updateEntry`, `deleteEntry`, `isLoggedToday`.
- `cycles`: `currentCycle`, `getCycle`, `listLockedCycles`.
- `billing/engine`: `buildBill`, `billLinesWithQty`, `closeCycle`.

## Helpers
- `src/lib/currency`: `formatMoney(n)`, `formatUnitPrice(price, unitSuffix)`, `formatQty(n)`, `CURRENCY_SYMBOL` ('¤').
- `src/lib/date`: `weekdayDate()`, `greeting()`, `cycleRangeLabel(start,end)`, `longDate(day)`, `cycleLabel(id)`, `toDayString()`.
- `src/models/types`: `Item, Unit, UNIT_LABELS, UNIT_SUFFIX, Entry, Cycle, BillLine, BillSummary`.

## Layout conventions
- Screens fill the device; use `react-native-safe-area-context` `useSafeAreaInsets()` for top/bottom padding (the design's `padding-top:64px` ≈ `insets.top + 24`). Tab screens already sit above the tab bar.
- Background is `color.bg`. Cards are white with `shadow.card` (focus/receipt) or a hairline border.
- Navigation: `useRouter()` from expo-router. Routes: `/(tabs)/home`, `/(tabs)/bill`,
  `/(tabs)/history`, `/(tabs)/settings`, `/item/edit` (modal, optional `?id=`),
  `/bill/[cycleId]`, `/(auth)/onboarding`.
- Keep numbers in Sora (`text.amount`/`amountMd`/`h*`), body copy in Work Sans.
