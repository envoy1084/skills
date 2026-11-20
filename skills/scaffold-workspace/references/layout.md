# Generated layout

Paths marked **publish** exist only with `publish: true`; **package** ones once per library.

## Root

| Path | Purpose |
| --- | --- |
| `package.json` | Private root. Scripts run Turborepo with `--root-turbo-json .config/turbo.json`. `prepare` installs lefthook hooks and runs `effect-tsgo patch --typescript --oxlint`. Exact pins for root-only tools; `catalog:` for the shared toolchain. `packageManager` pins pnpm; `engines.node` requires Node 26. |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*`, `tools/*`. Catalog of shared versions. `minimumReleaseAge: 1440` with Effect and Oxc tools (and their binaries) excluded. `allowBuilds` only for lefthook. |
| `.npmrc` | `engine-strict`, `link-workspace-packages`, `save-exact`. |
| `.node-version` | Node LTS used locally and by the setup action. |
| `tsconfig.json` | `klarity/tsconfig/base` with `files: []`; packages extend their own preset. |
| `lefthook.yml` | pre-commit: oxfmt + oxlint on staged files; commit-msg: commitlint; pre-push: lint, typecheck, tests. |
| `.gitignore` | Node, frameworks (Next.js, TanStack Start/Nitro/Vite, Astro, Svelte, Expo, Storybook), deploy targets, caches, test reports, Rust, Python, Go, Foundry/Hardhat, Terraform, databases, secrets, local research, agent state, logs, editors, OSes. |
| `.vscode/` | Oxc as formatter and linter with the `.config/` files, Vitest root config, TypeScript Native Preview (tsgo). |
| `README.md` | Name, description, packages table (when publishing), development commands, license. |
| `AGENTS.md` | Repository guide for agents: workspace map, commands, tooling and Effect diagnostics, dependency policy, code guidelines, landmines rules, tests, commits, the global skills to load, and where Effect's own docs live. Claude Code and Codex both read it. |
| `CONTRIBUTING.md` | Prerequisites, setup, structure, checks, tests, commits and PR titles; changesets, releases and npm trusted publishing (publish). |
| `SECURITY.md` | Private vulnerability reporting, supported versions, scope, disclosure. |
| `LICENSE` | Chosen license with year and holder. |

## `.config/`

| File | Purpose |
| --- | --- |
| `oxlint.config.ts` | klarity's base rules, the `@effect/tsgo` presets, then landmines' recommended rules last so they take precedence. `_tag` allowed for `no-underscore-dangle`. Tests must import `@effect/vitest`, not `vitest`. Stability-leak checks off for internals, tests and tools; pipeable-signature check off for tools. |
| `oxfmt.config.ts` | klarity's oxfmt preset (100 columns, double quotes, sorted imports and package.json). |
| `oxfmtignore` | Generated files (router trees, framework output), the lockfile and changelogs. |
| `commitlint.config.ts` | klarity's Conventional Commits preset (kebab-case scopes, 100-column lines). |
| `turbo.json` | `build` (depends on dependencies' builds, caches `dist`, `.output`, `.next`), `dev`, `lint`, `typecheck`, `pack:check`, `clean`. |
| `vitest.config.ts` | klarity's Node preset at the repository root, `workspace-source` resolution, one project per package. klarity's 10s `testTimeout` is removed so Vitest's 5s default applies, as landmines' `no-flake-masking` expects. |

## `.github/`

| Path | Purpose |
| --- | --- |
| `actions/setup/action.yml` | Validates inputs, installs pnpm (from `packageManager`) and Node (from `.node-version`), optional pnpm cache, frozen install, optional `--ignore-scripts`. |
| `CODEOWNERS` | Owners review every change. |
| `ISSUE_TEMPLATE/` | Bug form (package dropdown when publishing, versions, reproduction, behavior), feature form, and links to private security reporting and Discussions; blank issues off. |
| `PULL_REQUEST_TEMPLATE.md` | Summary, verification, checklist (tests, changeset when publishing, docs, no secrets). |
| `dependabot.yml` | Weekly GitHub Actions updates (7-day cooldown) and npm updates (1-day cooldown, Effect and Oxc exempt), grouped. |
| `zizmor.yml` | Allows major-tag action pins (kept current by Dependabot) and `./` local actions. |
| `workflows/ci.yml` | `pnpm check` (+ `pnpm pack:check` when publishing) and a zizmor audit on PRs, `main`, the merge queue and dispatch. Read-only token, cancels superseded PR runs. |
| `workflows/pr-title.yml` | Conventional Commits PR titles with commitlint's types and scope format; reads only the title. |
| `workflows/changeset-status.yml` | **publish** — Which packages a PR releases, in the job summary; never fails. |
| `workflows/release.yml` | **publish** — Dispatch-only, default dry run. Plans the mode, opens the version PR, or packs, verifies (`pnpm check`, `release:check`, checksums) and publishes the exact tarballs with npm trusted publishing and provenance, then tags and creates GitHub releases. |
| `workflows/release-smoke.yml` | **publish** — Given a release run and its pack artifact, checks npm's integrity, the registry tarballs and their provenance against the verified archives. |

## Publishing

| Path | Purpose |
| --- | --- |
| `.changeset/` | **publish** — Config (public access, `main`, private packages unversioned) and a README. |
| `tools/cli/` | **publish** — `<scope>/tools`, private, bin `<name>-dev`, run from source by Node. `release check --pack-dir` (plan vs publishable packages, integrity, publint, attw, consumer install, import every entry, writes `verification.json`) and `release smoke --pack-dir [--provenance <repo url>]`. |
| `packages/<name>/package.json` | **package** — Description, keywords, homepage, bugs, license, author, repository with `directory`, `files`, `sideEffects: false`, `exports` with `workspace-source` → `src` and `publishConfig.exports` → `dist`, provenance, `effect` peer range, tsdown/publint/attw scripts. |
| `packages/<name>/tsconfig.json` | **package** — klarity library preset for the platform, `workspace-source` condition, Effect language service plugin. |
| React packages | **package** — `src/index.tsx` entry, `react` peer range, React, React DOM, their types, jsdom and Testing Library as dev dependencies (catalog when several packages use them), a jsdom Vitest project, and klarity's React oxlint preset as an override. |
| `packages/<name>/tsdown.config.ts` | **package** — klarity tsdown factory for the platform with `devExports: "workspace-source"`. |
| `packages/<name>/README.md`, `LICENSE` | **package** — Install, usage (written in step 4), license. |
