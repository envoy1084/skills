---
name: dependencies
description: Dependency policy for this pnpm workspace. Use when adding, upgrading, removing or pinning a dependency, editing the pnpm catalog, or reviewing a Dependabot PR.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

## Rules

1. **Exact pins.** Every version in a package.json or the catalog is exact (`4.1.5`, not
   `^4.1.5`). `.npmrc` sets `save-exact=true`.
2. **Latest release, upgrades on request.** A newly added dependency uses its latest version.
   Existing pins are upgraded only when the user asks; then go to the latest. When something blocks
   the latest (a peer range, a regression), pin the newest working version and leave a one-line
   comment in `pnpm-workspace.yaml` or the PR saying why.
3. **Ranges for published libraries.** A published package's `dependencies` and
   `peerDependencies` use ranges that cover the versions it supports (`^4.1.5`, `>=2.14.0 <4`), so
   consumers are not forced onto one exact version. Its `devDependencies` stay exact.
4. **Catalog for shared versions only.** `pnpm-workspace.yaml`'s `catalog` holds the shared
   toolchain (TypeScript, `@types/node`, Oxlint, Vitest, Effect, klarity) and any dependency
   referenced by more than one package.json. Reference it with `"catalog:"`. A dependency used by
   one package is pinned in that package.json instead.
5. **One-day release age.** `minimumReleaseAge: 1440` blocks versions published less than a day
   ago. Effect (`effect`, `@effect/*`), Oxlint (`oxlint`, `oxlint-tsgolint` and their binaries) and
   Oxfmt are excluded and always run their latest release. Do not add other exclusions without a
   reason in a comment.
6. **Builds are opt-in.** A dependency that needs an install script goes in `allowBuilds` with a
   comment saying what the script does.

## Workflow

1. Check the latest version: `pnpm view <name> version` (and `time` for its publish date).
2. Add it at the right level: `pnpm add <name>@<version> --filter <package>` (add `-D` for
   tooling), or add it to the catalog and reference `catalog:` when rule 4 applies.
3. Run `pnpm install`, then `pnpm check`.
4. Prefer what the workspace already has (Effect modules, existing dependencies) over a new
   dependency. When adding one is justified, choose a maintained, focused package and say why in
   the PR.

When upgrading Effect, upgrade `effect` and every `@effect/*` package together, and update the
peer range of published libraries if they now need the newer version.
