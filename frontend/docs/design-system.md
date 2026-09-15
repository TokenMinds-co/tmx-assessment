# Design system

**Status:** Scaffold only · **Last updated:** 2026-09-15

## Scope

The UI component library, design tokens, theming and dark mode, typography and icons.

## Current state

- **Tailwind CSS 4,** configured in CSS in [app/globals.css](../app/globals.css). There's no `tailwind.config.*` file.
- **Two tokens,** `--background` and `--foreground`, exposed to Tailwind through `@theme inline`. Dark mode switches them with `prefers-color-scheme`.
- **Fonts:** Geist and Geist Mono load through `next/font` in [app/layout.tsx](../app/layout.tsx) and map to `--font-sans` and `--font-mono`. However, `body` in `globals.css` sets `font-family: Arial, Helvetica, sans-serif`, so text only gets Geist where the `font-sans` class is applied.
- **No component library yet.** shadcn/ui isn't set up; there's no `components.json`.
- The starter page ([app/page.tsx](../app/page.tsx)) uses hard-coded colors (`zinc-*` classes and hex values) and will be replaced.

## Proposed approach

- **shadcn/ui on Tailwind** is the one component system (see "Settled conflicts" in [AGENTS.md](../AGENTS.md)). Ask before running `shadcn init`, because it fixes the preset, base library and icon library for the whole project.
- **Components use semantic color tokens only,** such as `bg-background`, defined in `globals.css`. No raw color values in components.
- **Design work goes through the [`impeccable`](../.agents/skills/impeccable/SKILL.md) skill,** and token changes through [`tailwind-design-system`](../.agents/skills/tailwind-design-system/SKILL.md), as [AGENTS.md](../AGENTS.md) describes.

## Open decisions

- The shadcn/ui preset, base library and icon library.
- Brand colors, and whether the app follows the TokenMinds brand.
- Whether an internal tool needs dark mode at launch.

## References

- [`shadcn` skill](../.agents/skills/shadcn/SKILL.md)
- [`tailwind-design-system` skill](../.agents/skills/tailwind-design-system/SKILL.md)
