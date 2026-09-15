# Project structure

**Status:** Done · **Last updated:** 2026-09-15

## Scope

Where components, helpers and types go in the frontend, and how they're imported. The route map and route groups are in [routing.md](routing.md). The shadcn/ui components and how they're customized are in [design-system.md](design-system.md).

## Current state

```text
app/
├── (auth)/
│   ├── layout.tsx                      # Logo above one card
│   ├── login/
│   │   ├── page.tsx
│   │   └── _components/                # login-form
│   ├── forgot-password/_components/    # forgot-password-form
│   ├── reset-password/_components/     # reset-password-form
│   └── accept-invite/_components/      # accept-invite-form
└── (app)/
    ├── layout.tsx                      # App shell
    ├── page.tsx                        # Dashboard
    └── _components/                    # The dashboard's cards
components/
├── shared/    # Used by more than one page: the app shell (sidebar, topbar, account menu, nav items, page header),
│              # the logo, the sign-in card, the invalid-link state and the password fields
└── ui/        # shadcn/ui
lib/           # Used across folders: form validation, dashboard types, formatting, sample data, cn()
```

## Requirements

Agreed with the user on 2026-09-15:

- A component that only one page uses goes in a `_components/` folder next to that page.
- A component that more than one page uses goes in `components/shared/`.
- shadcn/ui components go in `components/ui/`.
- The rules are written in [AGENTS.md](../AGENTS.md#where-components-go), so every coding agent follows them.

## How it works

The placement rules, with examples, are in [AGENTS.md](../AGENTS.md#where-components-go). In short: find the pages that use the component. If it's one page, the component goes in that page's `_components/`. If it's more than one, or a layout renders it, it goes in `components/shared/`.

`_components/` is a Next.js private folder: the underscore keeps it and everything in it out of routing, so none of its files can become a URL.

## Decisions

"Requested" means the team asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Components used by one page | A `_components/` folder next to that page | | Requested |
| Components used by more than one page | `components/shared/` | | Requested |
| shadcn/ui components | `components/ui/`, where the shadcn CLI writes them | | Requested |
| Where the rules live | AGENTS.md | Coding agents read it before every task | Requested |
| Components a layout renders | `components/shared/` | A layout renders on every page below it. `app/(app)/` also holds the dashboard page, so otherwise the shell and the dashboard would share one `_components/` folder. | Build default |
| `PageHeader` | `components/shared/`, though only the dashboard uses it so far | [design-system.md](design-system.md#app-shell) makes it the header of every app page | Build default |
| Helpers, types and constants | Next to the components that use them, or in `lib/` when those are in different folders. `lib/` and `components/` never import from `app/`. | The form validation serves four pages, and `lib/sample-data.ts` uses the dashboard types | Build default |
| Importing a page's own components | A relative path (`./_components/login-form`). Everything else uses `@/`. | Shorter than `@/app/(auth)/login/_components/…`, and shows the file belongs to the page | Build default |
| Subfolders and barrel files | Neither: `components/shared/` and each `_components/` are flat, with no `index.ts` | Ten shared files don't need grouping yet, and `vercel-react-best-practices` says to import directly ([`bundle-barrel-imports`](../.agents/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md)) | Build default |

## Open decisions

- Once `components/shared/` grows, whether to group it into subfolders such as `shell/` and `auth/`.

## References

- Next.js 16 project structure docs, "Colocation" and "Private folders": `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- [AGENTS.md](../AGENTS.md#where-components-go)
- [routing.md](routing.md)
- [design-system.md](design-system.md)
