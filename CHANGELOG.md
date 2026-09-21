# Changelog

There is no combined changelog. `backend/` and `frontend/` are separate pnpm projects that
change at their own pace, so each keeps its own:

- [backend/docs/CHANGELOG.md](backend/docs/CHANGELOG.md)
- [frontend/docs/CHANGELOG.md](frontend/docs/CHANGELOG.md)

Both follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): newest first, with
entries grouped under `Added`, `Changed`, `Fixed` and `Removed`.

**Adding an entry.** Put it under `## [Unreleased]` in the changelog of the package you
changed, in the same pull request as the code, and link the area doc it belongs to. See
[CONTRIBUTING.md](CONTRIBUTING.md#documentation-is-part-of-the-change).

**Releases are tagged `vX.Y.Z` across the whole repository,** covering both packages at once.
When a release goes out, the `Unreleased` lines in each changelog move under a new version
heading with its date.
