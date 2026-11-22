# __NAME__ repository guide

__NAME__ is a pnpm workspace written in TypeScript 7 with Effect v4, laid out like the Effect
repository. Read this file before changing anything, then load the skills under [Skills](#skills)
that match the task.

## Workspace map

__WORKSPACE_MAP__
- `packages/*`: publishable packages, each with its own public boundary.
- `apps/*`: runnable applications (private).
- `scripts/`: repository scripts (a private workspace package).
- `scratchpad/`: ad hoc probes: `scratchpad/<name>.ts`, run with `node`, deleted afterwards (git
  ignores everything there but its skeleton).
<!-- @@publish -->
- `.changeset/`: pending release notes.
<!-- @@end -->

Dependencies point inward: apps depend on packages, packages never depend on apps.

## Commands

| Command              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `pnpm check`         | Everything CI runs, in order. Run it before every push.              |
| `pnpm typecheck`     | Type-check everything with tsrs (TypeScript 7 + Effect diagnostics)  |
| `pnpm lint`          | oxlint with Effect's rules (`lint:fix` applies fixes)                |
| `pnpm format`        | Format with dprint (`format:check` only checks)                      |
| `pnpm test`          | Run every Vitest project once (`test:watch` for watch mode)          |
| `pnpm build`         | `tsc -b`, then each package's build                                  |
| `pnpm circular`      | Fail on import cycles between modules                                |
<!-- @@publish -->
| `pnpm test:types`    | Type tests (`packages/*/typetest/*.tst.ts`) with tstyche             |
| `pnpm test:docs`     | Run the `ts import.meta.vitest` examples in TSDoc                    |
| `pnpm docs:check`    | Check TSDoc against the documentation rules                          |
| `pnpm codegen`       | Regenerate the `@barrel` sections of `index.ts`                      |
| `pnpm check:dist`    | Type-check the built declarations like a consumer                    |
| `pnpm pack:check`    | Pack each package and check it with publint and attw                 |
| `pnpm changeset`     | Record a change to a published package                               |
<!-- @@end -->

`pnpm typecheck:tsc` runs the official `tsc` and is for CI. Agents use `pnpm typecheck`.

## Validation

Use the narrowest validation that covers the change, then `pnpm check` before pushing:

| Change                         | Validation                                                                  |
| ------------------------------ | --------------------------------------------------------------------------- |
| Source or tests                | `pnpm lint:fix`, `pnpm format`, `pnpm test <file>`, `pnpm typecheck`        |
<!-- @@publish -->
| Public API                     | Also `pnpm docs:check`, and `pnpm codegen` when a module is added or removed |
| Type-level behaviour           | `pnpm test:types <file>`, `pnpm typecheck`                                  |
| TSDoc examples                 | `pnpm test:docs <file>`, `pnpm docs:check`                                  |
| Exports, `package.json`, build | `pnpm build`, `pnpm check:dist`, `pnpm pack:check`                          |
<!-- @@end -->
| Docs only                      | `pnpm format`                                                               |

Report every command you could not run.

## Tooling

Configuration lives at the root: `dprint.json`, `.oxlintrc.json`, `tsconfig.base.json` (compiler
options and the Effect language service), `tsconfig.packages.json` and `tsconfig.tests.json`
(project references), `vitest.config.ts`, `lefthook.yml`, `commitlint.config.ts`.

TypeScript is TypeScript 7 (tsgo), patched with the Effect language service by `pnpm install`
(`effect-tsgo patch`), so `pnpm typecheck` reports Effect diagnostics. Fix what they flag; silence
one only when the flagged pattern is the point, for the next line only
(`// @effect-diagnostics-next-line <rule>:off`). oxlint runs Effect's own rules
(`@effect-kit/oxc`): import modules (`effect/Effect`), not barrels; relative imports end in `.ts`;
`Array<T>`, not `T[]`. Never disable a rule file-wide.

Packages export their source during development (`"./*": "./src/*.ts"`) and their build when
published (`publishConfig.exports` → `dist`), so tests and type checks never need a build. Builds
are `tsc -b` plus Babel's pure-call annotations, so bundlers tree-shake them like Effect.

## Dependencies

- Root and development dependencies are exact versions; published packages declare ranges
  (`^4.1.5`) for `dependencies` and `peerDependencies`. `effect` is a peer of every library.
- The pnpm catalog holds versions more than one package.json uses.
- New releases must be a day old before they install (`minimumReleaseAge`), except `effect`,
  `@effect/*` and `@effect-kit/*`. Dependency install scripts are denied unless listed in
  `allowBuilds`.

## Code guidelines

Load the `effect-conventions` skill before writing or reviewing code.

- Name things for what they are in the domain, consistently: one name per concept.
- Use what exists before writing a helper: Effect (`Array`, `String`, `Option`, `Schema`,
  `Predicate`, …), then the workspace's own modules. Never create catch-all `utils` or `helpers`.
- Inline one-off logic; extract only substantial or reused logic into a specifically named module.
- Every export of a published package has TSDoc with `@since`, `@category` and `@stability`, and
  examples as `**Example** (Title)` sections with a `ts import.meta.vitest` fence.
- Comments explain why, not what.

## Tests

Tests live in each package's `test/` folder and use `@effect/vitest` (`it.effect`, `assert`), never
`vitest` directly. Write the tests a behaviour needs: the documented contract, its failure cases and
regressions; leave what the type checker proves to `typetest/`. The landmines testing rules are
enforced: no test doubles (use real implementations, test layers, MSW for the network), no fixed
sleeps (`TestClock`, or await a signal), no polling races, and no retries or raised timeouts.

## Commits and pull requests

Conventional Commits with kebab-case scopes (`feat(core): add retries`); commitlint checks commits
and the `PR title` workflow checks PR titles, because PRs are squash-merged.
<!-- @@publish -->
Add a changeset for every change a consumer of a published package can observe.
<!-- @@end -->

## Skills

Installed globally (`npx skills add envoy1084/skills`); repository-specific skills go in
`.agents/skills/`.

| Skill                 | Load it when                                               |
| --------------------- | ---------------------------------------------------------- |
| `effect-conventions`  | Writing, reviewing, documenting or testing any Effect code |
| `package-development` | Adding, renaming or publishing a workspace package         |
| `dependencies`        | Adding, upgrading or removing a dependency                 |
| `changesets`          | A change affects a published package                       |

## Learning more about Effect

Before writing Effect code, read `node_modules/effect/AGENTS.md` completely and follow its links
when needed. For anything it does not cover, search `node_modules/effect/src`. Never rely on
Effect v3 knowledge.
