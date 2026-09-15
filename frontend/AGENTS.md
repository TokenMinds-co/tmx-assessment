# Agent instructions

## Before every request: check the project skills

This project has agent skills installed in `.agents/skills/` and tracked in `skills-lock.json`. Each skill is a folder whose `SKILL.md` holds the rules and workflow for one kind of task. Check them before you act on any request, including small edits, bug fixes, code reviews and questions about the code:

1. **Match.** Compare the request with the [skill index](#skill-index) below. Once per session, also list `.agents/skills/`; for any folder the index doesn't mention, read the frontmatter of its `SKILL.md` and treat it as part of the index.
2. **Load.** Before writing any code, read the whole `SKILL.md` of every skill that matches. After that, open only the rule and reference files that apply to the task, not every file in the skill.
3. **Announce.** Start your reply with one line naming the skills you loaded, for example `Skills: shadcn, vercel-react-best-practices`. Write `Skills: none` if nothing matched.
4. **Apply.** Follow the loaded skills' workflows and checklists to the end of the task. Where they disagree, use [Precedence](#precedence).

Repeat the check whenever the task changes during a session, for example when a UI tweak turns into data-fetching work.

Don't edit files under `.agents/skills/`: the skills installer manages them and `skills-lock.json` pins their content hashes. If a skill's advice is wrong for this project, write the override in this file.

## Skill index

| Skill | Load it when the task involves | Start with |
| --- | --- | --- |
| `impeccable` | UI design work on any surface except marketing pages: new screens, redesigns, critique, audit, polish, hardening, motion, typography, color, layout, UX copy, empty and error states | Run `.agents/skills/impeccable/scripts/impeccable context` from the repo root, once per session. Each named command (`critique`, `audit`, `polish`, `harden` and so on) has a playbook in `reference/<command>.md`. Read `reference/craft-floor.md` before every UI edit. |
| `design-taste-frontend` | Landing pages, marketing pages, portfolios, and redesigns of them | Before coding, state the one-line "Design Read" and the three dial values. Before handing over, pass the Pre-Flight Check in section 14. Section 13 rules out dashboards, data tables, multi-step forms and admin UI. |
| `shadcn` | Setting up, adding, finding, composing, styling or debugging shadcn/ui components | `pnpm dlx shadcn@latest info --json` for project context, then `pnpm dlx shadcn@latest docs <component>` before using a component. |
| `tailwind-design-system` | Design tokens, theming, dark mode, component variants, shared UI patterns, edits to `app/globals.css` | `SKILL.md`, then `references/details.md` or `references/advanced-patterns.md` when you need more. |
| `vercel-react-best-practices` | Writing, reviewing or refactoring React components, Next.js pages and layouts, route handlers, server actions, data fetching, bundle size | Rule files in `rules/`, grouped by prefix. The CRITICAL groups are `async-` (request waterfalls) and `bundle-`. |
| `vercel-composition-patterns` | Reusable component APIs, components piling up boolean props, compound components, context providers | `rules/architecture-*` first. Its React 19 rules apply here: no `forwardRef`, and `use()` instead of `useContext()`. |
| `tanstack-query-best-practices` | Client-side server state: `useQuery`, `useMutation`, query keys, caching, invalidation, optimistic updates, prefetching, SSR hydration | Rule files in `rules/`, grouped by prefix. The CRITICAL groups are `qk-` (query keys) and `cache-`. |
| `seo-aeo-best-practices` | `metadata` and `generateMetadata`, Open Graph, sitemaps, `robots`, JSON-LD, content meant to rank in search or be quoted by AI assistants | The one file in `references/` that matches the task. |

Most tasks need more than one skill:

- **App screen or feature** (list, form, settings, dashboard): `impeccable`, `shadcn` and `vercel-react-best-practices`. Add `vercel-composition-patterns` for shared components and `tanstack-query-best-practices` for client-side fetching.
- **Landing or marketing page:** `design-taste-frontend`, `seo-aeo-best-practices` and `vercel-react-best-practices`.
- **Theme or token change:** `tailwind-design-system` and `shadcn`.
- **Code review or performance work:** `vercel-react-best-practices`, plus the skills that cover the code under review.

## Project facts the skills depend on

- Next.js 16.3 App Router (`app/`), React 19.2, TypeScript.
- Tailwind CSS v4, configured in CSS (`app/globals.css`). There is no `tailwind.config.*` file.
- pnpm 11. Skills show `npm` and `npx` in their examples; use `pnpm add` and `pnpm dlx` instead.
- Inter (UI) and Geist Mono, loaded with `next/font` in `app/layout.tsx`.
- shadcn/ui is set up (`components.json`): style `radix-vega` on Radix primitives, `lucide-react` icons, components in `components/ui/`. Several components are customized to the TMX theme. [docs/design-system.md](docs/design-system.md) lists the tokens and every change; read it before editing a component or adding a color.
- `lib/sample-data.ts` holds invented data for screens built before the API. A screen that renders it shows a "Sample data" badge ([docs/dashboard.md](docs/dashboard.md)).
- The browser calls the backend at `/api/*` on this app's own origin, and `next.config.ts` rewrites it to `API_URL`. Call it with `apiFetch` from `lib/api/client.ts`, with one module per domain in `lib/api/` ([docs/api-client.md](docs/api-client.md)). Server code that loads or changes staff data calls `requireUser()` from `lib/session.ts` first ([docs/authentication.md](docs/authentication.md)).
- Next.js 16 renamed Middleware to Proxy. `proxy.ts` at the root sends signed-out visitors to `/login`.
- Not set up yet: TanStack Query (not in `package.json`). Check before relying on it.

## Where components go

Place a component by where it's used:

| The component is | Put it in | Import it with |
| --- | --- | --- |
| Used by one page only | A `_components/` folder next to that page's `page.tsx`, for example `app/(auth)/login/_components/login-form.tsx` | A relative path from the page: `./_components/login-form` |
| Used by more than one page | `components/shared/`, for example `components/shared/auth-card.tsx` | `@/components/shared/auth-card` |
| A shadcn/ui component | `components/ui/`, added with `pnpm dlx shadcn@latest add <name>` | `@/components/ui/button` |

- **A `_components/` folder belongs to the `page.tsx` beside it.** `app/(app)/_components/` holds the dashboard's cards, not parts of the `(app)` layout.
- **The app shell is shared.** A layout renders on every page below it, so its components go in `components/shared/`: the sidebar and topbar of `app/(app)/layout.tsx`, and the logo of `app/(auth)/layout.tsx`. So does `page-header`, which [docs/design-system.md](docs/design-system.md#app-shell) makes the header of every app page.
- **A part goes where its parent is.** A component used only inside another component sits in the same folder. `user-menu` is used only by `topbar`, so both are in `components/shared/`.
- **When a second page needs a component from a `_components/` folder,** move it to `components/shared/` and update the imports. Never import from another page's `_components/`.
- **Helpers, types and constants** sit next to the components that use them, like `components/shared/nav-items.ts`. When those components are in different folders, put the file in `lib/`, like `lib/validation.ts` and `lib/dashboard-types.ts`. Code in `components/` and `lib/` never imports from `app/`.
- **`components/ui/` is for shadcn/ui only.** Customize those components in place and record the change in [docs/design-system.md](docs/design-system.md). Build your own components in `components/shared/` or a `_components/` folder.
- **Keep it flat.** No subfolders in `components/shared/` or `_components/`, and no `index.ts` barrel files (see `bundle-barrel-imports` in `vercel-react-best-practices`). File names are kebab-case.
- The leading underscore makes `_components/` a Next.js private folder, which routing ignores. See "Private folders" in `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`.

Why each rule was chosen is in [docs/project-structure.md](docs/project-structure.md).

## Precedence

When sources disagree, the higher one wins:

1. The user's explicit instructions and brief.
2. For Next.js APIs and file conventions, the docs in `node_modules/next/dist/docs/`. Skills may describe older Next.js versions; see the Next.js block at the end of this file.
3. The settled conflicts below.
4. The skill the index assigns to that area.

Settled conflicts:

- **Which design skill leads.** `design-taste-frontend` leads on landing, marketing and portfolio pages; `impeccable` leads on everything else. Don't run both skills' build workflows on the same surface. On a marketing page you can still run an `impeccable` evaluate or refine command such as `critique`, `audit` or `polish` when the user asks for it.
- **One component system.** This project uses shadcn/ui on Tailwind. Don't bring in Fluent, Carbon, Material or another system suggested by `design-taste-frontend` section 2.A without asking.
- **shadcn/ui preset and rules.** shadcn/ui is set up with the `radix-vega` style. Ask the user before applying a different preset or running `shadcn init` again, because either one overwrites the TMX theme and the component changes. Its rules win for component code: semantic color tokens, `gap-*` instead of `space-x-*`/`space-y-*`, its `Skeleton`, `Empty` and `Alert` components instead of custom markup, and the icon library named in `components.json` over `design-taste-frontend`'s icon preferences.
- **Design documentation.** The design system is documented in [docs/design-system.md](docs/design-system.md), following the doc rules in the root README. `impeccable` looks for a root `DESIGN.md`; don't create one. Read and update `docs/design-system.md` instead. Product context for `impeccable` is in [PRODUCT.md](PRODUCT.md).
- **Client data fetching.** Use one library. If `@tanstack/react-query` is installed, use it and skip the `client-swr-dedup` rule in `vercel-react-best-practices`. If neither TanStack Query nor SWR is installed, ask the user which to add.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
