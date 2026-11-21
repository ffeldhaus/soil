---
name: soil-ui-layout
description: >-
  Angular 21, Tailwind CSS v4, CSS container-query, modal stacking, Capacitor
  safe-area, and incremental hydration invariants for SOIL UI components.
  Activate this skill whenever creating, editing, or debugging Angular `.html`
  templates, `.scss` styles, modals, responsive/foldable grids, or HUD views.
---

# SOIL UI, Layout, Container Query & Modal Invariants

## 1. Modal Stacking Contexts & `.space-y-*` Containers
- **No Stacking-Context Traps Above Modals**: Never add `relative z-10` (or `transform` / `filter` / `isolation`) to parent layout containers that host child `fixed` modals (`z-[80]`–`z-[110]`), as doing so creates an isolated stacking context that traps modals beneath root-level fixed elements such as the global footer (`z-20`).
- **Conditional Overlays Inside `.space-y-*`**: Never place a conditional `@if` modal or overlay as the first child of a Tailwind `.space-y-*` container. Tailwind's `> :not(:first-child)` margin selector will apply a top margin (e.g. `32px`) to the real first layout block whenever the overlay is mounted. Place fixed overlays at the end of the template outside flow containers.

## 2. CSS Container Queries, `aspect-square` Grids & Safe-Area Symmetry
- **Android Chromium `0px` Grid Collapse Guard**: Never combine `[container-type:size]` (`contain: size`) with `aspect-square` items and `grid-template-rows: repeat(N, max-content)` (such as `.game-grid` or crop tiles). On Android Chromium WebView, block-axis size containment collapses intrinsic row heights to `0px`.
  - Always use `[container-type:inline-size]` paired with `grid-template-rows: repeat(N, auto)` inside a `flex-1 min-h-0` stage.
- **Symmetric Horizontal Safe Areas on Foldables & Cutouts**: Preserve `env(safe-area-inset-*)` across headers, sticky footers, and modals. On centered game stages and grids, use symmetric horizontal padding (`px-[max(env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))]`) so one-sided camera cutouts on landscape phones or foldables never shift the board off-center.

## 3. Interactive Touch Semantics & Incremental Hydration
- **No Nested Interactive Controls**: Never nest `<button>` or `role="button"` elements inside a parent `<button>` tile (invalid HTML5; breaks mobile touch hit-testing and screen-reader focus). Use sibling action buttons inside a non-interactive card container or separate click targets cleanly.
- **Above-the-Fold Hydration**: Avoid `@defer (hydrate on idle)` on critical above-the-fold HUD components (`board`, `board-hud`) so touch interactivity is immediate and Tailwind v4 CSS-only HMR updates never leave deferred chunks unhydrated with stale classes.
- **Inline Label Spacing in Templates**: Ensure HTML templates preserve an explicit space after `<strong>Label:</strong> ` before adjacent inline `<a>` or `<span>` elements so Biome/Angular template minification does not concatenate words.
