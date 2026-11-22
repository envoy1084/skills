# Generated layout

Paths marked **publish** exist only with `publish: true`; **package** ones once per library. The
layout follows the Effect repository; where it differs, the reason is given.

## Root

| Path | Purpose |
| --- | --- |
| `package.json` | Private root. Scripts below; exact pins for tools, `catalog:` for shared versions; `packageManager` pins pnpm; `engines.node >= 22.19.0`. `prepare` installs lefthook and runs `effect-tsgo patch`. |
| `pnpm-workspace.yaml` | Workspaces `apps/*`, `packages/*`, `scratchpad`, `scripts`. Catalog (`effect`, `@types/node`, React when several packages use it). `engineStrict`, `savePrefix: ""` (exact saves), `verifyDepsBeforeRun: error`, `minimumReleaseAge: 1440` with Effect and `@effect-kit` excluded, `allowBuilds` deny list. |
| `.node-version` | Node used locally and in CI. |
| `.gitignore` | Every common language and tool: Node and frameworks, deploy targets, caches, test reports, Rust, Python, Go, JVM, Swift, C/C++/Zig, Dart, Ruby, Solidity, infrastructure, databases, secrets, local work, agent state, logs, editors, OSes. Keeps the `scratchpad/` skeleton and committed screenshot baselines. Not Effect's ignore-all-dotfiles list: that silently drops files such as `.node-version`. |
| `dprint.json` | Effect's formatter config (no semicolons, double quotes, no trailing commas, 120 columns). |
| `.oxlintrc.json` | Extends `@effect-kit/oxc`'s preset (Effect's lint config) and loads its rules plugin; barrel-import patterns for `effect`, `@effect/*` and the scope; landmines' testing rules; relaxed rules for tests, scripts and the scratchpad; tests may not import `vitest`; React override when needed. |
| `tsconfig.base.json` | Effect's compiler options (NodeNext, `rewriteRelativeImportExtensions`, `erasableSyntaxOnly`, strict, `exactOptionalPropertyTypes`, composite) and the Effect language-service settings, including `apiStabilityLeak` outside internals, barrels and tests. |
| `tsconfig.json` | References `tsconfig.packages.json` and `tsconfig.tests.json`: `pnpm typecheck` checks everything in one incremental build. |
| `tsconfig.packages.json` | One reference per package. |
| `tsconfig.tests.json` | Tests, type tests, Vitest configs and `scripts/`, with `paths` from package names to `src`. |
| `vitest.config.ts`, `vitest.setup.ts` | One project per package (jsdom for React) plus `scripts`; `addEqualityTesters()` so Effect data types compare structurally. |
| `lefthook.yml` | pre-commit: dprint + oxlint on staged files; commit-msg: commitlint; pre-push: lint, typecheck, tests. Effect has no hooks; these catch problems before CI. |
| `commitlint.config.ts` | Conventional Commits, kebab-case scopes, 100-column lines. |
| `.vscode/` | dprint as formatter, Oxc fixes on save, TypeScript Native Preview. |
| `AGENTS.md` | Repository guide: workspace map, commands, validation table, tooling, dependency policy, code and test rules, commits, skills. Committed at the root (Effect symlinks it from `.agents/`, which leaves fresh clones without one). |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` | Packages table (publish), development, checks, commits, changesets, releases and the first-release steps (publish), vulnerability reporting, the chosen license. |
| `jsdocs.config.json`, `tstyche.json`, `vitest.docs.ts` | **publish** — TSDoc checks of `packages/*/src` `.ts` modules (model in `.data/`), type tests in `packages/*/typetest`, and TSDoc examples run by `@effect/doctest`. |

## Root scripts

One naming scheme: a verb, then `:qualifier` for a variant.

| Script | Runs |
| --- | --- |
| `check` | Everything CI runs, in order: `format:check`, `lint`, (`docs:check`), `typecheck`, `circular`, `test`, (`test:types`, `test:docs`, `build`, `check:dist`, `pack:check`) |
| `build` | `tsc -b tsconfig.packages.json`, then each package's build |
| `clean` | Remove build output and caches |
| `format`, `format:check` | dprint |
| `lint`, `lint:fix` | oxlint |
| `typecheck` | tsrs (`effect-tsgo tsrs -b`): fast, with Effect diagnostics |
| `typecheck:tsc` | The official `tsc -b`, for CI |
| `test`, `test:watch` | Vitest once (never watch mode by accident), or watching |
| `circular` | Import cycles between package modules (madge) |
| `test:types` | **publish** — tstyche |
| `test:docs` | **publish** — TSDoc examples |
| `docs:check` | **publish** — TSDoc rules |
| `codegen` | **publish** — regenerate `@barrel` sections |
| `check:dist` | **publish** — type-check built declarations with `skipLibCheck: false` |
| `pack:check` | **publish** — `pnpm pack` each package, then publint and attw |
| `changeset` | **publish** — record a release note |
| `release:version` | **publish** — `changeset version`, then a real install (scripts need it) and formatting |
| `release:pack` | **publish** — `changeset pack` into `tmp/release` |
| `release:check`, `release:smoke` | **publish** — the release CLI, before and after publishing |

## `scripts/` and `scratchpad/`

| Path | Purpose |
| --- | --- |
| `scripts/package.json`, `tsconfig.json` | A private workspace package, so scripts have real dependencies and are type-checked (through `tsconfig.tests.json`). |
| `scripts/circular.mjs`, `clean.mjs` | The `circular` and `clean` scripts. |
| `scripts/check-dist-types.mjs`, `pack-check.mjs` | **publish** — `check:dist` and `pack:check`. |
| `scripts/release/` | **publish** — `release check --pack-dir` (plan vs publishable packages, tarball integrity, publint, attw, a clean consumer install that imports every entry point, pattern exports expanded, and runs every bin with `--help`; writes `verification.json`; never changes the pack dir) and `release smoke --pack-dir [--provenance]` (npm integrity and tarballs against the packed ones, and SLSA provenance from this repository's `release.yml`). |
| `scripts/test/` | **publish** — tests for the release CLI. |
| `scratchpad/` | Ad hoc probes: only `index.ts`, `package.json` and `tsconfig.json` are committed. |

## `.github/`

| Path | Purpose |
| --- | --- |
| `actions/setup/action.yml` | Validates inputs, installs pnpm (from `packageManager`) and Node (`.node-version`, or a given version), optional pnpm cache, frozen install, optional `--ignore-scripts`. |
| `CODEOWNERS` | Owners review every change. |
| `ISSUE_TEMPLATE/` | Bug form (package dropdown when publishing), feature form, links to private security reporting and Discussions; blank issues off. |
| `PULL_REQUEST_TEMPLATE.md` | Summary, verification, checklist (tests, changeset when publishing, docs, no secrets). |
| `dependabot.yml` | Weekly Actions (7-day cooldown) and npm (1-day cooldown matching the release age, same exemptions) updates, grouped; TypeScript majors by hand. |
| `zizmor.yml` | Allows major-tag action references and the deliberate 1-day npm cooldown. |
| `workflows/ci.yml` | Static (format, lint, cycles; TSDoc and committed barrels when publishing), Types (`tsc`; type tests), Build (build; declarations and packed packages), Test (current and oldest Node; doc examples), and a zizmor audit. Read-only token; superseded PR runs are cancelled; the version PR is skipped (the release re-checks it). |
| `workflows/pr-title.yml` | Conventional Commits PR titles with commitlint's types and scope format; reads only the title (`pull_request_target`, nothing checked out). |
| `workflows/changeset-status.yml` | **publish** — Which packages a PR releases, in the job summary; never fails. |
| `workflows/release.yml` | **publish** — Dispatch-only, default dry run. Plans the mode; opens the version PR; or runs `pnpm check`, packs the publish plan, verifies the uploaded tarballs (`release:check`, checksums unchanged), publishes them with npm trusted publishing and provenance, tags and creates GitHub releases. The artifact download retries once, because the run's artifact list can lag behind an upload. |
| `workflows/release-smoke.yml` | **publish** — Given a successful release run and its pack artifact, checks npm's integrity, the registry tarballs and their provenance against the verified archives. |

## Publishing

| Path | Purpose |
| --- | --- |
| `.changeset/config.json` | **publish** — Effect's settings: GitHub changelog (PR and author links), `access: restricted` (each package opts in with `publishConfig.access: public`), `scripts` and `scratchpad` ignored, empty `fixed` (group packages that version together). |
| `packages/<name>/package.json` | **package** — Description, keywords, homepage, bugs, license, author, repository with `directory`, `engines`, `sideEffects: []`; source-first `exports` (`.`, `./*` → `src`, `./internal/*` and `./index` closed) and `publishConfig.exports` → `dist`; provenance; `files` with source, JavaScript, declarations and maps; `effect` as a ranged peer; `build` = `tsc -b` + Babel `annotate-pure-calls`. |
| `packages/<name>/tsconfig.json` | **package** — Extends the base, includes `src`; Node types for `node`. |
| `packages/<name>/src/index.ts` | **package** — Module TSDoc and the `@barrel` annotation that `pnpm codegen` fills (`*.{ts,tsx}` for React). |
| `packages/<name>/README.md`, `LICENSE` | **package** — Install, usage (written in step 4), license. |
| React packages | **package** — `react` peer range; React, React DOM, their types, jsdom and Testing Library as dev dependencies (catalog when several packages use them); jsdom test project; oxlint's `react`, `jsx-a11y` and `react-perf` plugins. Components live in `.tsx` modules and are imported from the package root during development (`"./*"` maps to `.ts` source). |
