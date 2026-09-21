# Design system

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

The UI component library, design tokens, theming, typography, icons, brand assets, the app shell layout and chart colors. What each page shows belongs in that area's doc, for example [dashboard.md](dashboard.md).

## Current state

- **shadcn/ui is set up** ([components.json](../components.json)): style `radix-vega`, Radix primitives, lucide icons. Components live in [components/ui/](../components/ui/), with kebab-case file names as the shadcn CLI writes them.
- **The TMX theme** is in [app/globals.css](../app/globals.css): colors, fonts, type scale, radii, shadows and gradients, mapped onto shadcn's semantic tokens. It was matched to an existing in-house app, which the rest of this doc calls **the reference**.
- **Brand assets** are in [public/brand/](../public/brand/). The favicon is [app/icon.png](../app/icon.png), plus [app/apple-icon.png](../app/apple-icon.png).
- **Shared UI built on top** is in [components/shared/](../components/shared/): the TMX HR logo, the app shell, the sign-in card, and the assessment pieces such as the test runner, the status badges and the score summary. Where components go is in [project-structure.md](project-structure.md).
- **Motion** uses `motion` (13.2), with the test runner's timings in one file (see [Motion](#motion)). **Toasts** use sonner.
- **Light theme only.**

## Requirements

Agreed with the maintainers on 2026-09-15:

- Use the reference app's theme: its colors, font, layout and buttons.
- Name the app **TMX HR** and update the logo to match.
- Build on **shadcn/ui themed to TMX**, rather than copying the reference app's hand-rolled components.

## How it works

### Components

- Add components with `pnpm dlx shadcn@latest add <name>`. They land in `components/ui/` and are ours to edit.
- **Icons** come from `lucide-react`, the library named in `components.json`.
- **Class merging** uses `cn` from [lib/utils.ts](../lib/utils.ts), which re-exports shadcn's `cn` package (a drop-in for clsx plus tailwind-merge).
- **Busy buttons** pair shadcn's `Spinner` ([spinner.tsx](../components/ui/spinner.tsx), unchanged from shadcn) with `data-icon="inline-start"` and `disabled`, as shadcn's rules ask. The sign-in forms share this as [submit-button.tsx](../components/shared/submit-button.tsx).
- **Form errors:** the browser's own checks sit under each field in `FieldError`. A failure from the API sits above the fields in a destructive `Alert` ([form-error.tsx](../components/shared/form-error.tsx)).
- **Added for the assessments, unchanged from shadcn:** `alert-dialog`, `checkbox`, `collapsible`, `command` (on `cmdk`), `dialog`, `empty`, `kbd`, `pagination`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `switch` and `tabs`. The Assessments page and the editor use the tabs' `line` variant.
- **Customized so far,** to match the reference app:

| Component | Change |
| --- | --- |
| `button` | `default` is the gradient CTA with a violet shadow. `outline` is the reference's white "secondary" button. `destructive` is its soft red "danger" button. 40px tall (`sm` is 32px) with 12px corners (`rounded-button`). |
| `input`, `input-group`, `textarea` | 40px tall, white fill, no shadow, and the stronger `--input` border. In an invalid field the typed text keeps the normal text color, while shadcn's `Field` turns the label and message red. |
| `card` | A 1px border plus the soft `shadow-card`, 14px corners, a semibold title, and `size="lg"` with 32px padding for the sign-in card. |
| `badge` | Adds `soft` (violet), `success`, `warning` and `info`. `destructive` uses the soft red fill. |
| `alert` | `destructive`, `success`, `warning` and `info` use a soft fill with text in the same hue. |
| `field` | 8px between a label and its control. |
| `dropdown-menu` | 14px corners, the card shadow, roomier items and a pointer cursor. |
| `table` | Small, uppercase, muted headers and roomier cells. |
| `sidebar` | TMX rail widths and gradient, 45px rows, uppercase group headings, full-width rows when collapsed, a centered "Soon" badge, and `SidebarInset` renders a `div` so pages own `<main>`. |
| `sonner` | Light only: the theme is fixed, instead of read from `next-themes` as shadcn's version does, and `next-themes` isn't installed. Toasts use the popover colors, the `border` token, 14px corners and the card shadow, and their icons wear the status colors. |
| `use-mobile` hook | Rewritten with `useSyncExternalStore`. The generated version set state inside an effect, which the React Compiler lint rules in `eslint-config-next` reject. |

### Tokens

Components use the semantic classes below, never raw colors. The values are in `:root` in [app/globals.css](../app/globals.css).

| Role | Reference name | Value | Token |
| --- | --- | --- | --- |
| Page background | canvas | `#f7f5fa` | `background` |
| Cards, menus, inputs | paper | `#ffffff` | `card`, `popover` |
| Hover fills, muted areas | paper-2 | `#f4f0f9` | `secondary`, `muted`, `accent` |
| Text | ink | `#111827` | `foreground` |
| Secondary text | ink-soft | `#636a78`* | `muted-foreground` |
| Hairlines | line | `#e9e3ef` | `border` |
| Input and outline-button borders | rule-2 | `#d9cfe6` | `input`, `border-strong` |
| Brand violet | accent | `#7c3aed` | `primary` |
| Soft violet fill | accent-soft | `#f5f0ff` | `primary-soft` |
| Focus ring | focus | `#8b5cf6`* | `ring` |
| Logo ink | (from the logo artwork) | `#1e0452` | `brand-ink` |
| Danger | danger | `#cf2424`* | `destructive`, `destructive-soft` |
| Success | success | `#15803d` | `success`, `success-soft` |
| Warning | warning-strong | `#b45309`* | `warning`, `warning-soft` |
| Info | info | `#2563eb` | `info`, `info-soft` |
| Sidebar text | brand-muted | `#b8a7c6` | `sidebar-foreground` |
| Sidebar group headings | (hardcoded `#8f7fa0`) | `#a092b1`* | `sidebar-muted` |
| Sidebar hover and active fill | brand-tint | `rgb(255 255 255 / 14%)` | `sidebar-accent` |

The gradients are `--gradient-sidebar` and `--gradient-cta`, painted with the `bg-sidebar-gradient` and `bg-cta-gradient` utilities.

\* **Darkened to pass WCAG AA.** Checked on 2026-09-15 with the contrast function from the dataviz skill's palette validator:

| Token | Reference | Now | Why |
| --- | --- | --- | --- |
| `muted-foreground` | `#6b7280` | `#636a78` | 4.47:1 on the page background, below 4.5. Now 5.02:1. |
| `destructive` | `#ef4444` | `#cf2424` | 3.76:1 on white. Now 5.34:1, and 4.91:1 on its soft fill. |
| `warning` | `#d97706` | `#b45309` | 3.07:1 on its soft fill. `#b45309` is the reference's own `warning-strong`, at 4.84:1. |
| `ring` | `#a78bfa` | `#8b5cf6` | A focus indicator needs 3:1. The old value was 2.72:1. |
| `sidebar-muted` | `#8f7fa0` | `#a092b1` | Headings dropped to 3.74:1 halfway down the gradient. Now 4.74:1. |

Two more contrast fixes live in components. Inputs use the `rule-2` border instead of `line`, so their edge is easier to see. The sidebar's Collapse button has a dark fill (`bg-black/15`) instead of the reference's white one: it sits on the magenta end of the gradient, where white text on a white tint measured 3.2:1. It's now about 4.9:1 or better.

### Typography

- **Inter** for all UI text and **Geist Mono** for code, loaded with `next/font` in [app/layout.tsx](../app/layout.tsx) as `--font-inter` and `--font-geist-mono`. The variables sit on `<html>`, so `--font-sans` resolves on every element.
- **Type scale** from the reference (a 1.25 major third), which changes some of Tailwind's defaults:

| Class | Size | Used for |
| --- | --- | --- |
| `text-xs` | 0.75rem | Hints, meta |
| `text-sm` | 0.875rem | Body, controls |
| `text-base` | 1rem | Card titles |
| `text-md` | 1.125rem | (new step) |
| `text-lg` | 1.25rem | |
| `text-xl` | 1.5rem | Sign-in card titles |
| `text-2xl` | 1.875rem | Page titles |
| `text-3xl` | 2.25rem | |

- Page titles are `text-2xl font-bold`, and card titles `text-base font-semibold`. Small labels (table headers and the like) are 10–11px, uppercase, with `tracking-wide`.
- `tabular-nums` only where numbers line up in a column.

### Radius and elevation

- `--radius` is 10px. That gives 8px controls (`rounded-md`), 10px sidebar rows (`rounded-lg`), 12px buttons (`rounded-button`) and 14px cards and menus (`rounded-xl`), as in the reference.
- Cards have a border and `shadow-card`, like the reference. Primary buttons carry `shadow-cta`.

### Brand and logo

- **TMX HR lockup** ([components/shared/tmx-hr-logo.tsx](../components/shared/tmx-hr-logo.tsx)), used on the sign-in pages: the TMX wordmark artwork, then "HR" set in Inter at the same cap height, in the logo's ink color. The wordmark ([public/brand/tmx-wordmark.png](../public/brand/tmx-wordmark.png)) is cropped from the brand's existing logo artwork, so only "HR" is type.
- **Mark** ([public/brand/tmx-mark.png](../public/brand/tmx-mark.png)): the white TMX tile, shown at 36px in the sidebar next to "TMX HR".
- **Favicon:** the TMX mark, copied from the reference. The Next.js `favicon.ico` is gone.

### App shell

Built from shadcn's `Sidebar` in [app/(app)/layout.tsx](<../app/(app)/layout.tsx>):

- **Sidebar rail** ([components/shared/app-sidebar.tsx](../components/shared/app-sidebar.tsx)): the violet gradient, 270px wide or 68px collapsed. The Collapse button and Ctrl/⌘+B toggle it. The choice is kept in the `sidebar_state` cookie, which the layout reads so the first paint has the right width. Under 768px ([hooks/use-mobile.ts](../hooks/use-mobile.ts)) the rail becomes a 276px sheet, opened from the topbar's menu button and closed when a link is picked. The sheet has no footer: its version line would sit on the gradient's lightest end at about 4:1 contrast.
- **Navigation** comes from one list, [components/shared/nav-items.ts](../components/shared/nav-items.ts). Every row sits under a group heading. When the rail is collapsed, headings turn into hairlines and labels into tooltips. Rows marked `soon` are dimmed, carry a "Soon" badge, and are neither links nor tab stops.
- **Topbar** ([components/shared/topbar.tsx](../components/shared/topbar.tsx)): 77px tall (60px on phones), white, with a breadcrumb ("TMX HR › page") and the account menu.
- **Pages** render inside `<main>` on the page background with `p-4 md:p-6`, and open with [PageHeader](../components/shared/page-header.tsx).
- **Sign-in pages** use their own layout: the logo above one centered card ([app/(auth)/layout.tsx](<../app/(auth)/layout.tsx>)).

Two differences from the reference shell: the whole page scrolls (the rail is fixed and the topbar sticky) instead of only `<main>`, and the rail doesn't force itself collapsed below 1280px. The reference did that to fit its editor's chat column, which TMX HR doesn't have.

### Candidate pages

- **No app shell.** The `(candidate)` layout is just the page background, and each page draws its own header.
- **The company wordmark** ([candidate-brand.tsx](../components/shared/candidate-brand.tsx)), not the TMX HR lockup, because candidates know the company they applied to, not the internal app. The name beside it comes from `COMPANY_NAME` in [lib/brand.ts](../lib/brand.ts), which reads `NEXT_PUBLIC_COMPANY_NAME` and falls back to `TMX HR`; it is the wordmark's alt text and the candidate pages' titles. The artwork itself is a file — replace [public/brand/tmx-wordmark.png](../public/brand/tmx-wordmark.png) to match the name you set. See [configuration.md](configuration.md).
- **The test runner** ([assessment-runner.tsx](../components/shared/assessment-runner.tsx)) has a sticky white header with the test's name and a countdown pill, a 4px progress line in the brand violet under it, one question per screen in a column up to 42rem wide, and a fixed footer with the save status, "3 of 16", and previous and next buttons. Options are large rows lettered A to F, or numbered buttons on a rating scale with the end labels beneath; the chosen one gets the soft violet fill and a check.
- **The countdown pill** ([runner-timer.tsx](../components/shared/runner-timer.tsx)) turns to the warning colors in the last minute.
- **A link that doesn't work** gets one card with a warning icon, a title and a plain explanation.

### Motion

The runner's motion is in [runner-motion.ts](../components/shared/runner-motion.ts), on `motion`:

- **Questions move like Typeform's.** The next question rises from 56px below, fading in and sharpening from a 6px blur, over 0.42 s with a fast-start, long-settle ease, `cubic-bezier(0.16, 1, 0.3, 1)` (`EASE_OUT`). The old one leaves upwards by 36px with a 4px blur in 0.18 s. Going back reverses both, so the previous question drops in from above.
- **A question's parts arrive a beat apart:** each rises 14px over 0.34 s, 0.04 s after the one above it, and the options follow 0.035 s apart.
- **A choice blinks twice** (its opacity dips to 0.35 twice over 0.44 s), and the runner moves on 520 ms after the choice.
- **The progress line** fills with a spring (stiffness 160, damping 26).
- **With reduced motion,** questions only fade (0.18 s in, 0.12 s out), nothing blinks, the runner moves on after 260 ms, and the progress line jumps.
- **Elsewhere, `EASE_OUT` is reused:** the save bar rises 16px over 0.22 s, question cards glide to their new place over 0.28 s when reordered, a new question's form slides in over 0.26 s, and the finish mark ([done-mark.tsx](../components/shared/done-mark.tsx)) draws its ring, then its tick, over 0.55 s each. With reduced motion they fade or simply appear.

### Status badges

[status-badges.tsx](../components/shared/status-badges.tsx) gives every status a badge with an icon and a label, never color alone:

| For | Status | Badge variant |
| --- | --- | --- |
| A test | Draft · Published · Archived | `outline` · `success` · `secondary` |
| A sent link | Not started · In progress · Completed · Link expired · Revoked | `secondary` · `info` · `success` · `warning` · `outline` |
| A test in a link | Not started · In progress · Done · Timed out | `secondary` · `info` · `success` · `warning` |

### Save bar

[save-bar.tsx](<../app/(app)/assessments/[id]/_components/save-bar.tsx>) rises from the bottom of a form while it has unsaved changes and sticks 16px above the bottom of the window. It says "You have unsaved changes." and offers Discard and "Save changes"; the Save button submits the form it sits in. The editor's Scoring and Settings tabs use it.

### Toasts

sonner's `Toaster` sits at the bottom right, mounted once in [app/providers.tsx](../app/providers.tsx). Toasts confirm saves, and show errors that a page doesn't show in place.

### Charts

These follow the dataviz skill, and the palette was checked with its validator against the white card surface:

- **One series** (average scores) uses the brand violet, `chart-1`.
- **Ordered steps** (test progress: not started, in progress, completed) use a three-step violet ramp, `chart-progress-1` to `chart-progress-3` (`#ae99f9`, `#8a59f5`, `#651dcb`). It passes the validator's ordinal checks: lightness gaps of at least 0.06, and the light end at 2.41:1 on white.
- **Marks:** bars at most 24px thick, with a 4px rounded end and a square baseline, a 2px gap between stacked segments, and meter tracks in a lighter step of the same hue.
- **Section scores** on results pages are `chart-1` bars on a lighter violet track, with the percentage in text beside them.
- **The band bar** on the editor's Scoring tab ([scoring-tab.tsx](<../app/(app)/assessments/[id]/_components/scoring-tab.tsx>)) mixes `chart-1` into `primary-soft` with `color-mix()`, from 18% for the lowest band to 100% for the highest, with a thin `card` divider between bands. It stripes any range no band covers. A legend below names each band and its range beside a swatch, so no text sits on the bar.
- **Text never wears a chart color.** Values sit in text colors next to a colored swatch or bar.
- **Every chart has a text twin,** a table or a legend with the numbers, so hover tooltips add detail but never hide it.
- **Status colors carry meaning** and always come with an icon and a label.

### Browser details

Themed from the palette in [app/globals.css](../app/globals.css): text selection (a violet tint), the text caret, scrollbar colors, and the focus outline on plain links.

### Light only

There is no dark theme. `dark:` classes only apply under a `.dark` class, which the app never sets, so the shadcn components' dark styles stay off even when the OS is in dark mode. `color-scheme: light` keeps native controls light too. The toasts are fixed to light as well, so `next-themes` isn't needed.

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Visual design | The reference app's theme: its colors, font (Inter), type scale, layout and buttons | | Requested |
| Product name | TMX HR | | Requested |
| Logo | The TMX wordmark artwork, then "HR" set in Inter | Keeps the brand's own artwork, and there's no vector source to redraw it from | Build default |
| Component system | shadcn/ui, themed to TMX | Keeps the plan in AGENTS.md, and later screens get ready-made tables, dialogs and menus | Requested |
| shadcn style, base and icons | `radix-vega`, Radix, lucide | The reference app uses Radix and lucide. `vega` is the classic shadcn look, the closest starting point to the reference's sizes. | Build default |
| Token names | shadcn's semantic names, holding the reference's values | Every shadcn component picks up the theme without edits | Build default |
| Contrast | Five tokens darkened a step (see [Tokens](#tokens)) | WCAG AA: 4.5:1 for text, 3:1 for focus rings | Build default |
| Theme | Light only | The reference is light only, and one theme is less to maintain while the app is small | Build default |
| Sidebar | shadcn's `Sidebar`, restyled, instead of the reference's hand-built rail | The keyboard shortcut, collapsed tooltips, the phone sheet with focus handling and the saved state come built in | Build default |
| Chart colors | One violet for a single series, a three-step violet ramp for ordered progress | Stays on brand, and passes the dataviz validator | Build default |
| Animation library | `motion` | | Requested |
| The runner's motion | Inspired by Typeform: the next question rises from below, going back drops the previous one from above, with a short blur, and a choice blinks before the runner moves on | | Requested |
| Motion timings | All in `runner-motion.ts`. Reduced motion fades only. | One place to tune them, and nothing moves for people who ask the OS for less motion. | Build default |
| Toasts | sonner, fixed to light, without `next-themes` | shadcn's toast component. The app has one theme. | Build default |
| Candidate pages' brand | The company wordmark, not the TMX HR lockup | Candidates know the company they applied to, not the internal app. | Build default |
| The company name candidates see | `NEXT_PUBLIC_COMPANY_NAME`, read through [lib/brand.ts](../lib/brand.ts) and defaulting to `TMX HR` | It was hardcoded, so a fork would greet candidates under someone else's name. The wordmark is still an image to replace, but everything set in type follows the variable. Keep it the same as the backend's `COMPANY_NAME`, which names the company in candidates' emails. | Requested |
| Unsaved changes | A save bar that appears only while a form has changes | Saving stays explicit, and unsaved edits are hard to miss. | Build default |
| Design doc | This file, with no root `DESIGN.md` | One doc per area, as the root README asks | Build default |

## Open decisions

- Dark mode, if staff ask for it. The tokens are in one place, so it would be a `.dark` block plus a toggle.
- A vector (SVG) TMX HR logo, once the brand's source files are available.

## References

- [PRODUCT.md](../PRODUCT.md) (product context for design work)
- [dashboard.md](dashboard.md)
- [`shadcn` skill](../.agents/skills/shadcn/SKILL.md)
- [`tailwind-design-system` skill](../.agents/skills/tailwind-design-system/SKILL.md)
- [`impeccable` skill](../.agents/skills/impeccable/SKILL.md)
- [configuration.md](configuration.md) (`NEXT_PUBLIC_COMPANY_NAME`)
