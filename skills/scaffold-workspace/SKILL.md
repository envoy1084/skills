---
name: scaffold-workspace
description: Creates a new pnpm + Turborepo + TypeScript 7 + Effect v4 monorepo with the full house setup — klarity presets (oxlint with Effect and landmines rules, oxfmt, commitlint, lefthook), tsgo patched with the Effect language service, pinned catalog with a one-day release age, a thorough .gitignore, AGENTS.md, CONTRIBUTING, SECURITY, LICENSE, hardened GitHub workflows, and (for npm packages) changesets with verified, provenance-signed releases. Use when the user wants to start, create, scaffold, bootstrap or set up a new project, repo, workspace, monorepo or library. Not for adding a package to an existing workspace (use package-development).
---

# Scaffold a workspace

Creates a new repository from the templates in `assets/`, renders them with `scripts/scaffold.mjs`,
then installs, refreshes versions, writes the first code, verifies everything and makes the first
commit. The stack is fixed; this skill never asks the user to choose tools.

## What gets created

Every workspace:

- **Tooling**: pnpm 12 workspace (`apps/*`, `packages/*`, `tools/*`), Turborepo, TypeScript 7
  (tsgo) patched by `effect-tsgo` on install, klarity presets for tsconfig, oxlint (plus the
  `@effect/tsgo` presets: correctness, antipattern, effectNative, style, maintainers, and
  [landmines](https://github.com/interfere-inc/landmines)' recommended rules: no prose comments,
  no test doubles, sleeps or flake masking, colocated tests, no annotated return types), oxfmt,
  commitlint and lefthook (format + lint on commit, commitlint on commit-msg, lint + typecheck +
  tests on push), Vitest through `@effect/vitest`. Tool configs live in `.config/`.
- **Dependencies**: exact pins, a catalog holding only the shared toolchain, `minimumReleaseAge`
  of one day with `effect`, `@effect/*`, oxlint and oxfmt (and their binaries) excluded.
- **Files**: `.gitignore` (Node, Next.js, TanStack/Nitro/Vite, Astro, Expo, Rust, Python, Go,
  Foundry, Terraform, databases, secrets, agents, editors, OSes), `.node-version`, `.npmrc`,
  `.vscode/` (Oxc, Vitest, tsgo), `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `README.md`,
  `LICENSE`.
- **GitHub**: composite `setup` action (Node from `.node-version`, pnpm from `packageManager`,
  frozen install), `CODEOWNERS`, bug and feature issue forms, PR template, Dependabot (actions and
  npm, grouped, with cooldowns), zizmor config, `ci.yml` (`pnpm check` + a zizmor audit) and
  `pr-title.yml` (Conventional Commits).

Only when the repository publishes packages to npm (`publish: true`):

- `.changeset/`, `changeset-status.yml`, `release.yml` (dispatch-only: opens the version PR, then
  packs, verifies and publishes the exact tarballs with npm trusted publishing and provenance) and
  `release-smoke.yml` (compares npm with the verified tarballs and checks provenance).
- `tools/cli`: `<name>-dev release check|smoke`, an Effect CLI the release workflows run.
- One `packages/<name>` per library: tsdown build (klarity preset, `devExports:
  "workspace-source"`), full npm metadata, `effect` as a ranged peer dependency, publint + attw.

See [references/layout.md](references/layout.md) for every file and why it exists.

## Rules

- Scaffold only into a new or empty directory. The script refuses anything else; never work around
  it by deleting files. For an existing repository, stop and offer to add specific pieces by hand,
  reading the matching template under `assets/template/`.
- Never create the GitHub repository, push, publish to npm, or change GitHub settings unless the
  user explicitly asks. List them as next steps instead.
- Never add tools outside the stack (Prettier, ESLint, Husky, Jest, tsup, …) and never ask the user
  to choose between tools.
- Never skip hooks (`--no-verify`) to make the first commit pass; fix the cause.
- Never write the user's email into any file unless they ask. Authors are `Name (url)`.
- Leave no placeholder text: no `__TOKEN__`, no `<!-- … -->` usage stubs, no `TODO` in the result.

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
| Packages | The request | When publishing: each package's name, one-line description, platform (`neutral`, `node`, `browser`) and 3–10 keywords |
| **License** | Never infer | **Always ask**: MIT, Apache-2.0, ISC, BSD-3-Clause, or UNLICENSED (proprietary) |
| Copyright holder | `git config user.name` | Confirm (a company name is common) |
| Author | `git config user.name` + `https://github.com/<login>` | Confirm |

Check npm names before committing to them: `npm view <scope>/<package> name` returning E404 means
the name is free; for a new scope, the user must own the npm user or organisation of that name.

Platform: `neutral` for runtime-agnostic libraries (the default), `node` when the package uses Node
APIs, `browser` for DOM code. React component packages: use `browser`, then follow the
package-development skill to switch to klarity's React presets.

Apps (Next.js, TanStack Start, …) are not rendered by the script. Scaffold the workspace first, then
add each app as described in [references/apps.md](references/apps.md).

## Step 2: Render

1. Write the answers to a JSON file outside the target directory (your scratchpad or `$TMPDIR`), in
   the format of [references/config.md](references/config.md).
2. Preview: `node <skill>/scripts/scaffold.mjs --config <answers.json> --dry-run` lists the files.
3. Render: `node <skill>/scripts/scaffold.mjs --config <answers.json>`.

The script validates every answer before writing, copies the layers (`base`, plus `publish` and one
`library` copy per package), merges the release scripts into the root `package.json`, writes the
LICENSE with the year and holder, fills every placeholder, expands the package lists (README table,
issue-form dropdown, Vitest projects, workspace maps) and drops publish-only sections when not
publishing. It fails on any placeholder left behind.

## Step 3: Install and refresh versions

The templates pin versions that were latest when the skill was written. Bring them up to date:

1. `cd <dir> && git init -b main` (lefthook installs hooks during `pnpm install`, which needs git).
2. Update `.node-version` to the latest Node.js LTS
   (`curl -s https://nodejs.org/dist/index.json`, first entry with `lts` set) and
   `packageManager` in `package.json` to `pnpm@<npm view pnpm version>`. Update the Node and pnpm
   versions mentioned in README.md and CONTRIBUTING.md if their major changed.
3. `pnpm install`. It runs `prepare`: lefthook installs the hooks and `effect-tsgo` patches
   TypeScript and oxlint. Both must report success.
4. `pnpm outdated -r`, then `pnpm up -r --latest` to move every pin (catalog included) to its latest
   release. Versions younger than a day stay back because of `minimumReleaseAge`, except Effect and
   the Oxc tools; that is intended.
5. Set each library's `peerDependencies.effect` to `^<catalog effect version>`.
6. If a new major of anything breaks the check in step 5, pin the last working version, and add a
   one-line comment in `pnpm-workspace.yaml` (or tell the user, for root pins) saying why.

GitHub Action versions are left to Dependabot.

## Step 4: Write the first code

Every library needs a real first module, or publint, attw and the release check have nothing to
check. Load the `effect-style`, `jsdocs` and `test-development` skills, then for each package:

1. Write `src/<Module>.ts` with the package's first public API (from what the user described; ask if
   you have nothing to go on rather than inventing a domain) and `src/index.ts` re-exporting it as
   `export * as Module from "./Module.ts";`. The module's TSDoc (`@stability`, `@since 0.1.0`) goes
   on that re-export; the module file starts with its imports, and has no prose comments (landmines).
2. Write `test/<Module>.test.ts` covering its contract and a failure case.
3. Replace the README's Usage comment with a short runnable example, and add a Quick start to the
   root README if the repository has one main package.
4. Add the first changeset, `.changeset/initial-release.md`, bumping every package `minor`
   (0.0.0 → 0.1.0) with the line "Initial release.".

## Step 5: Verify

Run each and fix what fails; do not move on with a failing check:

1. `pnpm format` (the rendered files are not formatted yet), then `pnpm check`.
2. When publishing: `pnpm pack:check`, then a local release check:
   `pnpm build && pnpm exec changeset pack --out-dir "$TMPDIR/<name>-pack" && pnpm release:check --pack-dir "$TMPDIR/<name>-pack"`.
   It must end with `release-check: ok`. Delete the pack directory afterwards; `changeset pack`
   does not change the repository.
3. When `uvx` is available: `uvx zizmor --offline --config .github/zizmor.yml .github/workflows`
   and `uvx --from actionlint-py actionlint`. Report them as skipped otherwise.
4. `grep -rn "__[A-Z_]*__\|TODO" --exclude-dir=node_modules .` returns nothing.

## Step 6: Commit

Stage everything and commit `chore: scaffold workspace` (the hooks format, lint and check the
message). Do not push.

## Step 7: Report

Tell the user, briefly: where the workspace is, what was generated (publishing or not, the packages
with their platforms), the license, the checks that ran and their results, anything skipped, and
the next steps that need them:

- Create the repository (`gh repo create <owner>/<repo> --source . --push`, public or private) —
  offer to run it.
- Repository settings: enable private vulnerability reporting (SECURITY.md and the issue forms link
  to it) and Discussions (the issue forms link to them, or remove that link); protect `main`
  requiring the `CI` checks and `PR title`; squash merging with the PR title as the commit message.
- When publishing: allow GitHub Actions to create pull requests (Settings → Actions → General), so
  the release workflow can open the version PR; add an npm trusted publisher for each package
  (GitHub Actions, this repository, workflow `release.yml`). If npm does not allow configuring a
  trusted publisher before a package exists, the first version must be published once by hand.

## Troubleshooting

- **`ERR_PNPM_…MINIMUM_RELEASE_AGE` or "no matching version"**: a release is younger than a day. Wait,
  or pin the previous version; add an exclusion only for packages the policy already exempts.
- **`effect-tsgo patch` fails during `prepare`**: `@effect/tsgo` and `typescript` are out of step.
  Update both to latest, reinstall.
- **tsdown fails on a warning**: klarity builds with `failOnWarn`. The templates suppress the two
  known TypeScript 7.0 generator warnings; once TypeScript 7.1 is stable, remove those suppressions
  instead of adding new ones. Any other warning is a real problem to fix.
- **Vitest "No projects were found"**: a `projects` list must not be empty; the template omits it
  when there are no packages.
- **The commit hook fails on lint**: fix the code (Effect rules flag native methods with Effect
  equivalents, `yield*` in call arguments, missing brands; landmines flags prose comments, test
  doubles, sleeps and annotated return types); do not disable rules wholesale.
