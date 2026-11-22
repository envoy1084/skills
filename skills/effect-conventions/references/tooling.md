# Tooling, validation and releases

## Formatter: dprint

`dprint.json` in the clone:

```json
{
  "indentWidth": 2,
  "lineWidth": 120,
  "newLineKind": "lf",
  "typescript": {
    "semiColons": "asi",
    "quoteStyle": "alwaysDouble",
    "trailingCommas": "never",
    "operatorPosition": "maintain",
    "arrowFunction.useParentheses": "force"
  }
}
```

So: no semicolons, double quotes, no trailing commas, `(x) => …` always parenthesised, 120
columns, 2 spaces, `function*()` without a space. dprint also formats Markdown and JSON.

## Linter: oxlint with the Effect preset

`.oxlintrc.json` extends `packages/tools/oxc/oxlintrc.json` and loads the `@effect/oxc/oxlint`
JS plugin. Categories `correctness`, `suspicious`, `perf` are errors. Notable rules:

| Rule | Effect |
| --- | --- |
| `effect/no-import-from-barrel-package` | library source imports `effect/Effect`, not `effect`; no relative `index` imports |
| `effect/no-js-extension-imports` | relative imports use `.ts` |
| `effect/no-unused-internal` | public signatures never reference `@internal` exports |
| `effect/no-opaque-instance-fields` | `Schema.Opaque` classes have no instance members |
| `effect/no-bigint-literals` | write `BigInt(1)`, not `1n` |
| `typescript/consistent-type-imports` (inline) | `import { type X, y }` |
| `typescript/array-type` (generic) | `Array<T>`, `ReadonlyArray<T>`, never `T[]` |
| `typescript/no-unused-vars` | unused names must start with `_` |
| `typescript/no-useless-empty-export` | no `export {}` placeholders (error in `packages/tools/oxc/oxlintrc.json`) |
| `eslint/no-console`, `no-var`, `no-useless-constructor`, `import/no-duplicates` | as named |

`@effect/oxc` (`packages/tools/oxc/src/oxlint/rules/`: the five `effect/*` rules) is private to the
Effect repo. To lint exactly like Effect, vendor the package (MIT, keep the license and record the
source commit) and extend `no-import-from-barrel-package`'s check patterns to your scope; standard
rules cannot express `no-unused-internal`.

## Compiler and language service

- TypeScript 7 (`tsgo`) with the Effect language service patched in:
  `prepare: "effect-tsgo patch"`; `check: "effect-tsgo tsrs -b tsconfig.json"`.
- The language-service plugin config lives in `tsconfig.base.json` (see [packages.md](packages.md)).
  Diagnostics like `effectFnOpportunity`, `apiStabilityLeak`, floating effects and misused
  `yield` surface during `check`.
- Fix what the diagnostics flag. Suppress one only when the flagged pattern is the point, for the
  next line only, as the core library does:
  - language service: `// @effect-diagnostics-next-line returnEffectInGen:off`
    (also seen: `tryCatchInEffectGen`, `overriddenSchemaConstructor`, `floatingEffect`)
  - oxlint: `// oxlint-disable-next-line no-console`
  - never a blanket file-wide disable (`unicorn/no-abusive-eslint-disable`)
- Install **`@effect/tsgo` only** (Effect's root devDependency `^0.69.0`): it ships TypeScript 7
  with the language service built in. Effect has no `@effect/language-service` devDependency; the
  `"@effect/language-service"` name appears only as the plugin entry in `tsconfig.base.json`.
- `pnpm check` (tsrs) is the agents' type check. `pnpm check-tsc` runs the official `tsc` and is
  reserved for CI; agents must not run it (`.agents/AGENTS.md`).

## Root scripts (Effect)

| Script | Purpose |
| --- | --- |
| `pnpm check` | type-check everything (tsrs) |
| `pnpm lint` / `pnpm lint-fix` | oxlint + dprint check / fix |
| `pnpm test --run <files>` | Vitest, targeted (never bare `pnpm test`: watch mode) |
| `pnpm test-types <file>` | tstyche against every configured TypeScript version |
| `pnpm doctest --run <files>` | run TSDoc examples |
| `pnpm jsdocs --check` | TSDoc convention checker |
| `pnpm codegen` | regenerate `@barrel` sections |
| `pnpm build` | `tsc -b` + Babel pure annotations, per package |
| `pnpm circular` | detect import cycles (madge) |
| `pnpm check-dist-types` | type-check built declarations |
| `pnpm typeperf`, `pnpm runtimeperf` (+ `-compare`) | compiler and runtime regression harnesses (see [testing.md](testing.md)) |
| `pnpm ai-docgen` | regenerate `LLMS.md` from `ai-docs/src` |
| `pnpm check-tsc` | official `tsc` build check, CI only |

Validation by change type (from `.agents/AGENTS.md`):

| Change | Validation |
| --- | --- |
| runtime source or tests | `pnpm lint-fix`, targeted `pnpm test --run <file>`, `pnpm check` |
| type behaviour or type tests | targeted `pnpm test-types <file>`, plus `pnpm check` |
| TSDoc text/category/link | `pnpm jsdocs --check`, `pnpm lint` |
| TSDoc examples | the above plus `pnpm doctest --run <files>` |
| docs only | `pnpm lint-fix` |

Ad hoc probes go in `scratchpad/<name>.ts` (a workspace package whose contents are gitignored),
run with plain `node`, and are deleted afterwards. Never run bare `pnpm test` or `pnpm doctest`
(watch mode). Report every command you could not run.

The maintainers keep their working rules **in the repository**: `.agents/AGENTS.md` (symlinked to
`AGENTS.md` by `scripts/setup-agents.mjs`) and 13 skills in `.agents/skills/` (`ai-docs`,
`bundle-analysis`, `changesets`, `ci-maintenance`, `dependency-maintenance`, `effect-development`,
`jsdocs`, `migration-guidance`, `package-development`, `performance-analysis`, `pull-requests`,
`test-development`, `vendored-assets`). A repository built like Effect carries adapted copies of the
ones that apply.

## Generated files

Never edit generated output: `@barrel` sections of `index.ts` (run `pnpm codegen`), `LLMS.md`
(from `ai-docs/src`), migration guides, vendored assets. Hand-written parts of `index.ts` outside
the marker are fine to edit.

## Changesets and versions

- One changeset per PR in `.changeset/<descriptive-name>.md`; update it rather than adding more.
- Body: **one sentence**, usually under 25 words, naming the API and what consumers notice:

  ```md
  ---
  "@scope/permissions": patch
  ---

  Fix `Grants.union` dropping permissions from the second set when both sets share a resource.
  ```

  Leave out internals, motivation, benchmarks and tests. Add bullets only for breaks or required
  migrations (what code must change and how).
- List every directly affected published package, not every package in a fixed group.
- Bump from the `@stability` of the touched APIs:

  | Stability | Fix | Feature | Break |
  | --- | --- | --- | --- |
  | `stable` (or untagged) | patch | minor | major (maintainer approval) |
  | `unstable` | patch | patch | minor |
  | `experimental` | patch | patch | patch |

  Several stability levels in one PR → the highest bump required.
- Effect versions every published package together (fixed changeset group); `@since` of a new API
  is the version its changeset will produce.
- `.changeset/config.json` (upstream): `changelog: ["@changesets/changelog-github", { repo }]`,
  `commit: false`, `access: "restricted"` (each package opts in with `publishConfig.access:
  "public"`), `baseBranch: "main"`, `updateInternalDependencies: "patch"`,
  `ignore: ["scratchpad", "scripts"]`, one `fixed` group, snapshot `prereleaseTemplate:
  "{tag}-{commit}"`. No `.changeset/README.md`.
- Two patches in `patches/`, applied through `patchedDependencies` in `pnpm-workspace.yaml`:
  - `@changesets/cli@3.0.3`: treats npm's "cannot publish over previously staged version" as
    already published, so a re-run of `changeset publish --tag staging` succeeds;
  - `@changesets/get-github-info@1.0.1`: credits the commit author and writes a plain `@login`
    instead of a profile link.
- Release flow: `changeset-publish` = `set-strip-internal.mjs` → `codemod` → `build` →
  `changeset publish --tag staging`; the private `npm-promote` workflow then moves `latest` once
  npm serves every package.

## CI (`.github/workflows`)

- `check.yml`: Static (`pnpm lint`, `pnpm jsdocs --check`, `pnpm circular`, `pnpm ai-docgen` with a
  clean-tree check), Types (`check-tsc`, `test-types`, Deno check), Build (stripped build,
  `check-dist-types`), Test per runtime (Node, Bun, Deno; integration tests on, with
  testcontainers), Test on the minimum Node (22.19.0), Test (Documentation) (`pnpm doctest`).
- `bundle-comment.yml` posts bundle-size changes from the Bundle job on the pull request. There are
  no bundle-size budgets.
- Not in upstream CI: `codegen` clean-tree checks, `pnpm pack --dry-run`, attw, publint.
- `snapshot.yml` (pkg-pr-new previews), `release.yml` (changesets), `npm-promote.yml`.

## API reference pipeline

1. `pnpm jsdocs` (`packages/tools/jsdocs`) reads `jsdocs.config.json` and writes
   `.data/jsdocs.json`: `JSDocModel { version: 3, files, apis }`, one `apis` entry per documented
   API with its signature, description sections (short, when to use, details, gotchas), examples,
   tags (category, since, stability, deprecated, default), resolved `@see` links and import
   guidance. `--check` turns diagnostics into a failing exit code.
2. Nothing in the repository renders that model. After promotion, `npm-promote`
   (`src/WebsiteDeploy.ts`) dispatches a `publish-api-reference` event to `Effect-TS/website`,
   which builds the reference for that revision.
3. Outside Effect: vendor `@effect/jsdocs` and write a renderer that reads only the model, so the
   docs stay identical in content to Effect's.

## Third-party availability

| Tool | Status outside the Effect repo |
| --- | --- |
| `@effect/vitest`, `@effect/doctest`, `@effect/tsgo` | published, use directly |
| `@effect/docgen` | published but legacy (v3 pipeline, `@example` tags, TypeScript `<7`): do not use for v4-style docs |
| `@effect/jsdocs`, `@effect/utils` (barrel codegen), `@effect/oxc`, `@effect/ai-docgen`, `@effect/bundle`, `@effect/npm-promote`, `@effect/api-diff` | private (`packages/tools/*`): vendor (MIT, keep the license and source commit) or follow the rules by hand |
| `typeperf/`, `runtimeperf/` harnesses | live inside `packages/effect`; copy them into the package they measure |
| API reference site | built in the separate `Effect-TS/website` repo; bring your own renderer (e.g. from the jsdocs JSON model) |
