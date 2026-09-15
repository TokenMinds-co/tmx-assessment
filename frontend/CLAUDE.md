@AGENTS.md

## Claude Code

- Claude Code doesn't scan `.agents/skills/`, so the project skills won't show up in your Skill tool list or trigger on their own. Load them with the Read tool, following "Before every request" in AGENTS.md.
- Check the Skill tool list too. When a personal or built-in skill covers the same ground as a project skill (a general frontend-design skill, for example), use the project skill in this repo.
- `shadcn`'s `SKILL.md` has a `` !`npx shadcn@latest info --json` `` block that only runs when the Skill tool loads the skill. Reading the file directly leaves it empty, so run `pnpm dlx shadcn@latest info --json` yourself.
- `impeccable` writes `<skill-base-dir>` in its commands. In this repo that is `.agents/skills/impeccable`.
