# Updating versions

Only when the user explicitly asks ("use the latest versions", "update the scaffold to latest").
Never update versions on your own initiative, during scaffolding or otherwise.

There are two targets. Ask which one if the request does not say.

## A. A workspace you just scaffolded

Run inside the new workspace, after `pnpm install`:

1. `.node-version`: the latest Node.js LTS (`curl -s https://nodejs.org/dist/index.json`, first entry
   with `lts` set). `packageManager` in `package.json`: `pnpm@<npm view pnpm version>`. Update the
   Node and pnpm majors mentioned in README.md and CONTRIBUTING.md if they changed.
2. `pnpm outdated -r`, then `pnpm up -r --latest`. This moves every pin, the catalog included, to
   its latest release. Versions younger than a day stay back because of `minimumReleaseAge`, except
   Effect and the Oxc tools; that is intended.
3. Set each library's `peerDependencies.effect` to `^<catalog effect version>`, and `react` to
   `^<react version>` in React packages.
4. `pnpm format && pnpm check` (and the publish checks). If a new major breaks something, pin the
   last working version and tell the user which and why.

## B. The skill's templates

Update the files under `assets/` so future scaffolds start current:

| Versions | Where |
| --- | --- |
| Catalog (Effect, `@effect/*`, TypeScript, Oxlint, landmines, klarity, Vitest, tsdown) | `assets/template/base/pnpm-workspace.yaml` |
| Root-only tools (turbo, lefthook, commitlint, oxfmt) and `packageManager` | `assets/template/base/package.json` |
| Release tools (changesets, publint, attw) | `assets/template/publish/package.publish.json` |
| `@effect/platform-node` | `assets/template/publish/tools/cli/package.json` |
| React, React DOM, their types, jsdom, Testing Library | `assets/template/react.json` |
| Node.js | `assets/template/base/dot_node-version`, plus README/CONTRIBUTING if the major changed |
| Actions (`actions/checkout@v7`, …), zizmor | `assets/template/*/dot_github/**` |

Look each up with `npm view <name> version` (and `npm view <name> time --json` for the publish
date), keep exact pins, and keep `@effect/*` on the same version as `effect`. Then prove the
templates still work: render a publishing workspace with a `neutral`, a `node` and a `react` package
and a non-publishing one into a scratch directory, write a small module and test per package, and
run `pnpm install`, `pnpm format`, `pnpm check`, `pnpm pack:check`, the local release check and a
commit through the hooks. Commit the template changes as `chore(scaffold-workspace): update
versions`.
