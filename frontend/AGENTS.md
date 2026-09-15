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
- **Theme or token change:** `tailwind-design-system`, plus `shadcn` once it is set up.
- **Code review or performance work:** `vercel-react-best-practices`, plus the skills that cover the code under review.

## Project facts the skills depend on

- Next.js 16.3 App Router (`app/`), React 19.2, TypeScript.
- Tailwind CSS v4, configured in CSS (`app/globals.css`). There is no `tailwind.config.*` file.
- pnpm 11. Skills show `npm` and `npx` in their examples; use `pnpm add` and `pnpm dlx` instead.
- Geist and Geist Mono, loaded with `next/font` in `app/layout.tsx`.
- Not set up yet: shadcn/ui (no `components.json`) and TanStack Query (not in `package.json`). Check before relying on either.

## Precedence

When sources disagree, the higher one wins:

1. The user's explicit instructions and brief.
2. For Next.js APIs and file conventions, the docs in `node_modules/next/dist/docs/`. Skills may describe older Next.js versions; see the Next.js block at the end of this file.
3. The settled conflicts below.
4. The skill the index assigns to that area.

Settled conflicts:

- **Which design skill leads.** `design-taste-frontend` leads on landing, marketing and portfolio pages; `impeccable` leads on everything else. Don't run both skills' build workflows on the same surface. On a marketing page you can still run an `impeccable` evaluate or refine command such as `critique`, `audit` or `polish` when the user asks for it.
- **One component system.** This project's skills point to shadcn/ui on Tailwind. Don't bring in Fluent, Carbon, Material or another system suggested by `design-taste-frontend` section 2.A without asking.
- **shadcn/ui setup and rules.** Ask the user before running `shadcn init` or applying a preset, because that fixes the preset, base library and icon library for the whole project. Once it is set up, its rules win for component code: semantic color tokens, `gap-*` instead of `space-x-*`/`space-y-*`, its `Skeleton`, `Empty` and `Alert` components instead of custom markup, and the icon library named in `components.json` over `design-taste-frontend`'s icon preferences.
- **Client data fetching.** Use one library. If `@tanstack/react-query` is installed, use it and skip the `client-swr-dedup` rule in `vercel-react-best-practices`. If neither TanStack Query nor SWR is installed, ask the user which to add.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
