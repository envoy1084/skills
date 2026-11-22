---
name: scaffold-workspace
description: Creates a new pnpm + TypeScript 7 + Effect v4 workspace laid out like the Effect repository — dprint, oxlint with Effect's rules, tsc -b + Babel builds with source-first exports, one root Vitest config, tsrs type checking with the Effect language service, plus TSDoc checks, barrel codegen, doctest and tstyche for libraries — with exact pins, a one-day release age, lefthook + commitlint, a thorough .gitignore, AGENTS.md, CONTRIBUTING, SECURITY, LICENSE, hardened GitHub workflows (CI, PR title, Dependabot, zizmor) and, for npm packages, changesets with verified, provenance-signed releases and smoke checks. Use when the user wants to start, create, scaffold, bootstrap or set up a new project, repo, workspace, monorepo or library. Not for adding a package to an existing workspace (use package-development).
---

# Scaffold a workspace

Creates a new repository from the templates in `assets/`, renders them with `scripts/scaffold.mjs`,
then installs, writes the first code, verifies everything and makes the first commit. The stack is
fixed; this skill never asks the user to choose tools.

## What gets created

Every workspace:

- **Layout** (as in Effect): `packages/*` (publishable), `apps/*` (private), `scripts/` (repository
  scripts) and `scratchpad/` (ad hoc probes, ignored by git), all pnpm workspace packages. Every
  tool config sits at the root.
- **TypeScript**: TypeScript 7 patched with the Effect language service (`@effect/tsgo`, on
  install). `tsconfig.base.json` holds every compiler option and the language-service settings;
  `tsconfig.packages.json` and `tsconfig.tests.json` are project references, so `pnpm typecheck`
  (tsrs) checks source and tests incrementally.
- **Lint and format**: dprint with Effect's configuration; oxlint with Effect's rules and preset
  (`@effect-kit/oxc`) and landmines' testing rules. lefthook formats and lints staged files,
  commitlint checks messages, and lint + typecheck + tests run before a push.
- **Tests**: one root `vitest.config.ts` with a project per package, `@effect/vitest` only.
- **Repository scripts**: one Effect CLI in `scripts/` (`node scripts/bin.ts <command>`: `circular`,
  `clean`, `lint`, plus `dist-types`, `pack-check` and `release check|smoke` when publishing), with
  tests. Scripts are TypeScript only; `pnpm lint` fails on JavaScript there.
- **Dependencies**: exact pins, a catalog for shared versions, `minimumReleaseAge` of one day,
  dependency install scripts denied unless allowed.
- **Files**: a multi-language `.gitignore`, `.node-version`, `.vscode/`, `AGENTS.md`,
  `CONTRIBUTING.md`, `SECURITY.md`, `README.md`, `LICENSE`.
- **GitHub**: a `setup` action, `CODEOWNERS`, issue forms, PR template, Dependabot with cooldowns,
  zizmor config, `ci.yml` (Static, Types, Build, Test on the current and oldest Node, workflow
  audit) and `pr-title.yml`.

With `publish: true` (npm packages), also:

- One `packages/<name>` per library: source-first exports (`"./*": "./src/*.ts"`) with
  `publishConfig.exports` → `dist`, built by `tsc -b` + Babel pure-call annotations, `effect` as a
  ranged peer, an `@barrel` index.
- Library tooling: TSDoc checks (`@effect-kit/jsdocs`), barrel codegen (`@effect-kit/codegen`),
  TSDoc examples as tests (`@effect/doctest`), type tests (tstyche), declaration and package checks.
- Releases: `.changeset/`, `release.yml` (dispatch only: opens the version PR, then checks, packs,
  verifies and publishes the exact tarballs with npm trusted publishing and provenance),
  `release-smoke.yml`, `changeset-status.yml`, and the `release` commands of the scripts CLI.

See [references/layout.md](references/layout.md) for every file and why it exists.

## Rules

- Scaffold only into a new or empty directory. The script refuses anything else; never work around
  it by deleting files. For an existing repository, stop and offer to add specific pieces by hand,
  reading the matching template under `assets/template/`.
- Never create the GitHub repository, push, publish to npm, or change GitHub settings unless the
  user explicitly asks. List them as next steps instead.
- Never add tools outside the stack (Prettier, ESLint, Biome, oxfmt, Husky, Jest, tsup, tsdown,
  Turborepo for libraries, …) and never ask the user to choose between tools.
- Never skip hooks (`--no-verify`) to make the first commit pass; fix the cause.
- Never write the user's email into any file unless they ask. Authors are `Name (url)`.
- Leave no placeholder text: no `__TOKEN__`, no `TODO` in the result.

## Step 1: Gather the answers

Infer what you can first, then ask everything that is left **in one round** (use the
AskUserQuestion tool when available, with your inferred values as the recommended options):

| Answer | Infer from | Ask? |
| --- | --- | --- |
| Project name (kebab-case) | The user's request | Only if missing |
| One-sentence description | The user's request | Only if missing; it goes into README and package.json |
| Target directory | Default `./<name>` from the current directory | Confirm |
| GitHub repository `<owner>/<repo>` | `gh api user --jq .login` + the name | Confirm |
| Code owners | `@<gh login>` | Only if a team owns it |
| Publishes npm packages? | The request ("library", "sdk", "package" → yes; "app", "service", "site" → no) | Confirm |
| npm scope | `@<name>` | When publishing: confirm, and check it is free (below) |
| Packages | The request | When publishing: each package's name, one-line description, platform (`neutral`, `node`, `browser`, `react`) and 3–10 keywords |
| **License** | Never infer | **Always ask**: MIT, Apache-2.0, ISC, BSD-3-Clause, or UNLICENSED (proprietary) |
| Copyright holder | `git config user.name` | Confirm (a company name is common) |
| Author | `git config user.name` + `https://github.com/<login>` | Confirm |

Check npm names before committing to them: `npm view <scope>/<package> name` returning E404 means
the name is free; for a new scope, the user must own the npm user or organisation of that name.

Platform: `neutral` for runtime-agnostic libraries (the default), `node` when the package uses Node
APIs (adds Node types), `browser` for DOM code, `react` for React components (`.tsx` modules,
`react` as a ranged peer, React and Testing Library dev dependencies, a jsdom test project and
oxlint's React plugins).

Apps (Next.js, TanStack Start, …) are not rendered by the script. Scaffold the workspace first, then
add each app as described in [references/apps.md](references/apps.md).

## Step 2: Render

1. Write the answers to a JSON file outside the target directory (your scratchpad or `$TMPDIR`), in
   the format of [references/config.md](references/config.md).
2. Preview: `node <skill>/scripts/scaffold.mjs --config <answers.json> --dry-run` lists the files.
3. Render: `node <skill>/scripts/scaffold.mjs --config <answers.json>`.

The script validates every answer before writing, copies the layers (`base`, plus `publish` and one
`package` copy per library), merges the publish scripts into the root `package.json`, writes the
LICENSE with the year and holder, fills every placeholder and package list, and drops
publish-only sections when not publishing. It fails on any placeholder left behind.

## Step 3: Install

Use the versions pinned in the templates as they are. Do not upgrade anything unless the user
explicitly asks for latest versions; then follow [references/versions.md](references/versions.md).

1. `cd <dir> && git init -b main` (lefthook installs its hooks during `pnpm install`, which needs
   git).
2. `pnpm install`. Its `prepare` script installs the hooks and runs `effect-tsgo patch`; both must
   report success.

## Step 4: Write the first code (publishing workspaces)

Every library needs a real first module, or the documentation, type and release checks have nothing
to check. Load the `effect-conventions` skill, then for each package:

1. Write `src/<Module>.ts` (`.tsx` for React components) with the package's first public API, from
   what the user described; ask if you have nothing to go on rather than inventing a domain. The
   module starts with a TSDoc block carrying `@stability` and `@since 0.1.0`. Every export has a
   one-paragraph description, `@stability`, `@category` and `@since 0.1.0`, and the main ones an
   example:

   ````ts
   /**
    * Creates a widget, failing when the width is not 1 to 12 columns.
    *
    * **Example** (Creating a widget)
    *
    * ```ts import.meta.vitest
    * import { Widget } from "@scope/core"
    * import * as Effect from "effect/Effect"
    *
    * Effect.runSync(Widget.make("cpu", 4)) // => { name: "cpu", columns: 4 }
    * ```
    *
    * @stability unstable
    * @category constructors
    * @since 0.1.0
    */
   ````

2. `pnpm codegen` fills `src/index.ts` (`export * as Module from "./Module.ts"`); never edit the
   generated section by hand.
3. Write `test/<Module>.test.ts` (`@effect/vitest`) covering the contract and a failure case, and
   `typetest/<Module>.tst.ts` (tstyche) pinning the public types.
4. Replace the `TODO` in the package README with a short, runnable usage example, and add a Quick
   start to the root README if the repository has one main package.
5. Add the first changeset, `.changeset/initial-release.md`, bumping every package `minor`
   (0.0.0 → 0.1.0) with the line "Initial release.".

## Step 5: Verify

Run each and fix what fails; do not move on with a failing check:

1. `pnpm format`, then `pnpm check` (format, lint, TSDoc, types, cycles, tests, type tests, doc
   examples, build, declarations, packed packages).
2. When publishing, a local release check:
   `pnpm release:pack && pnpm release:check --pack-dir tmp/release`. It must end with
   `release-check: ok`. Delete `tmp/release` afterwards.
3. When `uvx` is available: `uvx zizmor --offline --config .github/zizmor.yml .github` and
   `uvx --from actionlint-py actionlint`. Report them as skipped otherwise.
4. `grep -rn "__[A-Z_]*__\|TODO" --exclude-dir=node_modules --exclude-dir=.git .` returns nothing.
5. After `git add -A`, `git status --ignored --short` lists nothing the scaffold wrote (only
   `node_modules`, build output and `.data/`).

## Step 6: Commit

Stage everything (`git add -A`; lefthook cannot stash partly staged files before the first commit)
and commit `chore: scaffold workspace`. The hooks format, lint and check the message. Do not push.

## Step 7: Report

Tell the user, briefly: where the workspace is, what was generated (publishing or not, the packages
with their platforms), the license, the checks that ran and their results, anything skipped, and
the next steps that need them:

- Create the repository (`gh repo create <owner>/<repo> --source . --push`, public or private) —
  offer to run it. Pushing workflow files needs SSH or a token with the `workflow` scope.
- Repository settings: enable private vulnerability reporting (SECURITY.md and the issue forms link
  to it) and Discussions (the issue forms link to them, or remove that link); protect `main`
  requiring the CI jobs and `PR title`; squash merging with the PR title as the commit message.
- When publishing, the first release of each package (also in CONTRIBUTING.md):
  1. Publish a placeholder once by hand so npm knows the package: from an empty folder with a
     `package.json` holding only its `name`, `"version": "0.0.0"`, `license` and `repository`, run
     `npm publish --access public --tag bootstrap`.
  2. On npmjs.com, add a trusted publisher: GitHub Actions, this repository, workflow
     `release.yml`, no environment. Allow `npm publish`; leave `npm dist-tag` unchecked.
  3. Allow GitHub Actions to create pull requests (Settings → Actions → General).
  4. Dispatch **Release** as a dry run, then for real (opens the version PR); merge it and dispatch
     again to publish; then dispatch **Release smoke** with the IDs from the release summary.

## Troubleshooting

- **`ERR_PNPM_…MINIMUM_RELEASE_AGE` or "no matching version"**: a pinned release is younger than a
  day (only after a version update). Wait, or pin the previous version; add an exclusion only for
  packages the policy already exempts.
- **`ERR_PNPM_IGNORED_BUILDS`**: a new dependency has an install script. Add it to `allowBuilds`:
  `false` when it works without the script (most binaries ship as optional dependencies), `true`
  with a comment when it needs it.
- **`ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`**: `node_modules` no longer matches the lockfile (after a
  pull or a version bump). Run `pnpm install`.
- **`effect-tsgo patch` fails during `prepare`**: `@effect/tsgo` and `typescript` are out of step.
  Tell the user; with their go-ahead, update both together (references/versions.md) and reinstall.
- **`pnpm docs:check` reports a module**: follow the message; the rules are in the
  `effect-conventions` skill. `.tsx` modules are outside its scope (it reads `.ts` only).
- **The commit hook fails on lint**: fix the code (Effect rules flag barrel imports, `.js` import
  extensions, `T[]`; landmines flags test doubles, sleeps and flake masking); do not disable rules
  wholesale.
