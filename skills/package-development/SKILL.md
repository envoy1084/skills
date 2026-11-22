---
name: package-development
description: Adding or changing a workspace package. Use when creating a package or app, making a private package publishable, renaming a package, or changing its entry points.
---

These conventions are for pnpm + Effect v4 workspaces laid out like the Effect repository (the
`scaffold-workspace` skill). When the repository's own `AGENTS.md` or neighbouring code says
otherwise, follow the repository.

Treat a new package as a registration change, not a directory copy. Start from the closest existing
package of the same kind.

## Workflow

1. Decide what it is: a published library (`packages/<name>`, or `packages/<family>/<name>`
   published as `<scope>/<family>-<name>`), an app (`apps/`, see the scaffold skill's
   `references/apps.md`), or repository tooling, which is never a package: add a command to the
   Effect CLI in `scripts/` (`scripts/commands/<name>.ts`, registered in `scripts/cli.ts`, tested in
   `scripts/test/`), never a JavaScript file.
2. Create only the files it needs: `package.json`, `tsconfig.json`, `README.md`, `LICENSE` (copy of
   the root one), `src/index.ts` with an `@barrel` annotation, `test/`, and `typetest/` when its
   types are part of the contract.
3. Fill in the manifest (below), then run `pnpm install`.
4. Register it everywhere it applies:
   - `tsconfig.packages.json`: a reference to the package;
   - `tsconfig.tests.json`: `paths` from its name (and `name/*`) to its `src`;
   - `vitest.config.ts`: a `project(...)` for it (with `environment: "jsdom"` for React);
   - `.oxlintrc.json`: its React override, when it has components;
   - `.github/ISSUE_TEMPLATE/bug.yml`: the `Packages` dropdown;
   - root `README.md`: the packages table; `AGENTS.md` and `CONTRIBUTING.md`: the workspace map;
   - `.changeset/config.json`: a `fixed` group if its versions move with others.
5. Write the first module, then `pnpm codegen` to fill the barrel, and `pnpm check`.
6. Add a changeset for its first release (`minor` from `0.0.0`).

## Published library manifest

```json
{
  "name": "@<scope>/<name>",
  "version": "0.0.0",
  "type": "module",
  "license": "<SPDX id of the root LICENSE>",
  "description": "<What it does, for whom, in one sentence>",
  "keywords": ["<3-10 specific search terms>"],
  "homepage": "https://github.com/<owner>/<repo>/tree/main/packages/<name>#readme",
  "bugs": { "url": "https://github.com/<owner>/<repo>/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/<repo>.git",
    "directory": "packages/<name>"
  },
  "author": "<Name> (<url>)",
  "engines": { "node": ">=22.19.0" },
  "sideEffects": [],
  "exports": {
    "./package.json": "./package.json",
    ".": "./src/index.ts",
    "./*": "./src/*.ts",
    "./internal/*": null,
    "./index": null
  },
  "files": ["src/**/*.ts", "src/**/*.tsx", "dist/**/*.js", "dist/**/*.js.map", "dist/**/*.d.ts", "dist/**/*.d.ts.map", "CHANGELOG.md"],
  "publishConfig": {
    "access": "public",
    "provenance": true,
    "exports": {
      "./package.json": "./package.json",
      ".": "./dist/index.js",
      "./*": "./dist/*.js",
      "./internal/*": null,
      "./index": null
    }
  },
  "scripts": {
    "build": "tsc -b tsconfig.json && babel dist --plugins annotate-pure-calls --out-dir dist --source-maps"
  },
  "peerDependencies": { "effect": "^4.1.5" },
  "devDependencies": { "effect": "catalog:" }
}
```

- `exports` point at source, so the workspace, its tests and type checks never need a build;
  `publishConfig.exports` repeats every entry against `dist`. Keep the two in step.
- Every module is a subpath (`<scope>/<name>/Module`) as well as a namespace of the barrel
  (`import { Module } from "<scope>/<name>"`). `internal/` stays closed.
- A package with a command adds `bin` pointing at `./src/bin.ts` and `publishConfig.bin` pointing
  at `./dist/bin.js`: Node refuses to strip types from files inside `node_modules`, so published
  bins and exports must be JavaScript.
- `effect` is a peer of every library so consumers share one copy, and a catalog devDependency for
  development. Other dependencies: ranges for `dependencies` and `peerDependencies`, exact pins for
  `devDependencies` (the `dependencies` skill).
- Description and keywords are written for npm search: concrete, no marketing words.

## tsconfig and build

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": {}
}
```

Add `"types": ["node"]` when the package uses Node APIs. Everything else (strictness, NodeNext,
`rewriteRelativeImportExtensions`, the Effect language service) comes from `tsconfig.base.json`; do
not repeat it. Tests are type-checked by the root `tsconfig.tests.json`, not the package.

`build` runs `tsc -b` (one `.js`, `.d.ts` and map per module in `dist`) and Babel's
`annotate-pure-calls`, so bundlers tree-shake the package like Effect. No bundler.

React packages put components in `.tsx` modules (the barrel is `@barrel(*.{ts,tsx})`), declare
`react` as a ranged peer, and import components from the package root during development, because
`"./*"` maps to `.ts` source. `docs:check` reads `.ts` modules only.

## Private packages and apps

Set `"private": true` and skip `publishConfig`, `files` and changesets. Apps keep their framework's
`dev`, `build` and `start` scripts and add `typecheck`; see the scaffold skill's
`references/apps.md` for wiring them into the root scripts, lint and tests.
