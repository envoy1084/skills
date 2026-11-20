---
name: package-development
description: Adding or changing a workspace package. Use when creating a package or app, making a private package publishable, renaming a package, or changing its entry points.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

Treat a new package as a registration change, not a directory copy. Start from the closest
existing package of the same kind (a published library, private tooling, or an app).

## Workflow

1. Decide what it is: published library, private package, or app. Published libraries go in
   `packages/`, apps in `apps/`, repository tooling in `tools/`.
2. Create only the files it needs: `package.json`, `tsconfig.json`, `src/index.ts`, and for a
   published library also `tsdown.config.ts`, `README.md`, `LICENSE` (copy of the root one) and
   `test/`.
3. Fill in the manifest (below), then run `pnpm install`.
4. Register it everywhere it applies:
   - `.config/vitest.config.ts`: a project for its `test/` folder;
   - `.github/ISSUE_TEMPLATE/bug.yml`: the package in the `Packages` dropdown (published only);
   - root `README.md`: the packages table (published only);
   - `AGENTS.md` and `CONTRIBUTING.md`: the workspace map;
   - `.changeset/config.json`: `fixed` or `linked` groups if versions move together.
5. Run `pnpm check` and, for a published package, `pnpm pack:check`.
6. Add a changeset for its first release (`minor` from `0.0.0`).

## Published library manifest

```json
{
  "name": "@<scope>/<name>",
  "version": "0.0.0",
  "description": "<What it does, for whom, in one sentence>",
  "keywords": ["<5-12 specific search terms>"],
  "homepage": "https://github.com/<owner>/<repo>/tree/main/packages/<name>#readme",
  "bugs": "https://github.com/<owner>/<repo>/issues",
  "license": "<SPDX id of the root LICENSE>",
  "author": "<Name> (<url>)",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/<repo>.git",
    "directory": "packages/<name>"
  },
  "files": ["CHANGELOG.md", "dist", "src"],
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": { "workspace-source": "./src/index.ts", "default": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "publishConfig": {
    "exports": { ".": "./dist/index.js", "./package.json": "./package.json" },
    "access": "public",
    "provenance": true
  },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "lint": "oxlint -c ../../.config/oxlint.config.ts --deny-warnings .",
    "pack:check": "publint && attw --pack . --profile esm-only",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": { "effect": "^4.1.5" },
  "devDependencies": { "@effect/vitest": "catalog:", "effect": "catalog:", "tsdown": "catalog:" },
  "engines": { "node": ">=22" }
}
```

- Every subpath entry appears in both `exports` (with `workspace-source` pointing at `src`) and
  `publishConfig.exports` (pointing at `dist`).
- `effect` is a peer dependency of libraries so consumers share one copy; it is also a
  devDependency from the catalog for development.
- Description and keywords are written for npm search: concrete, no marketing words.

## tsconfig and build

`tsconfig.json` extends the klarity preset for the runtime (`klarity/tsconfig/library`,
`library/node`, `library/browser`, `library/react`, or an `app/*` preset), sets
`customConditions: ["workspace-source"]`, includes `src` and `test`, and keeps the
`@effect/language-service` plugin block of the neighbouring packages.

Published libraries build with tsdown through the matching klarity factory (`klarity/tsdown/library`,
`/node`, `/browser`, `/react`):

```ts
import defineConfig from "klarity/tsdown/library";

export default defineConfig({
  // `exports` keeps pointing at `src` under `workspace-source`; built entries go to
  // `publishConfig.exports`.
  exports: { devExports: "workspace-source" },
  // TypeScript 7.0's declaration generator warns on every build; drop these once on TS 7.1+.
  suppressWarnings: [
    /^TypeScript 7\.0 does not yet have a stable API and is experimental\. Some options will be unavailable\.$/,
    /^The `tsgo` generator on TypeScript 7\.0 is deprecated/,
  ],
});
```

Add an `entry` map for subpath exports (`{ index: "src/index.ts", effect: "src/effect.ts" }`);
tsdown regenerates `exports` and `publishConfig.exports` from it on every build. Use plain `tsc`
only when a package needs one output file per source file (for example to keep `export * as`
re-exports tree-shakeable for app bundlers), and say why in its README.

## Private packages and apps

Set `"private": true`, skip `publishConfig`, `files`, `pack:check` and changesets. Apps use their
framework's build and dev scripts and keep `lint` and `typecheck` scripts so Turborepo runs them.
