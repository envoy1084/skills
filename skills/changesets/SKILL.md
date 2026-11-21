---
name: changesets
description: Release notes with Changesets. Use when a change affects a published package, when choosing a version bump, or when preparing or reviewing a release.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

## When a changeset is needed

Add one for every change a consumer of a published package can observe: new APIs, behaviour
changes, bug fixes, dependency range changes, removed exports. Tests, docs-only changes, tooling,
CI and private packages need none.

## Writing one

Run `pnpm changeset`, or create `.changeset/<kebab-summary>.md`:

```md
---
"@scope/core": minor
---

Add `Slug.Slug`, a schema that validates existing slugs.
```

- **patch**: bug fixes and internal changes with no API change.
- **minor**: new APIs and backwards-compatible behaviour.
- **major**: breaking changes. Before 1.0.0, breaking changes are `minor`.

Write for users reading the changelog: what changed and what to do, in one or two sentences. Name
the API, use backticks for code, and for breaking changes show the migration. One changeset per
logical change; a PR may contain several.

New APIs get `@since` set to the version this bump produces (see the `effect-conventions` skill).

## Releases

Never run `changeset version` or `changeset publish` locally to release. Releases go through the
`Release` workflow (see CONTRIBUTING.md): it opens the version PR, then packs, verifies with
`pnpm release:check` and publishes with provenance.
