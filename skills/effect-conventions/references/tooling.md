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
| `eslint/no-console`, `no-var`, `no-useless-constructor`, `import/no-duplicates` | as named |

`@effect/oxc` is private to the Effect repo; outside it, reproduce the rules that matter
(barrel imports, `.ts` extensions, array type, type imports) with standard oxlint/ESLint rules or
vendor the plugin.

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
- On npm: `@effect/language-service`, `@effect/tsgo`.

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
| `pnpm typeperf`, `pnpm runtimeperf` | compiler and runtime benchmarks |

Validation by change type (from `.agents/AGENTS.md`):

| Change | Validation |
| --- | --- |
| runtime source or tests | `pnpm lint-fix`, targeted `pnpm test --run <file>`, `pnpm check` |
| type behaviour or type tests | targeted `pnpm test-types <file>`, plus `pnpm check` |
| TSDoc text/category/link | `pnpm jsdocs --check`, `pnpm lint` |
| TSDoc examples | the above plus `pnpm doctest --run <files>` |
| docs only | `pnpm lint-fix` |

Ad hoc probes go in `scratchpad/<name>.ts`, run with plain `node`, and are deleted afterwards.
Report every command you could not run.

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

## Third-party availability

| Tool | Status outside the Effect repo |
| --- | --- |
| `@effect/vitest`, `@effect/doctest`, `@effect/language-service`, `@effect/tsgo` | published, use directly |
| `@effect/docgen` | published but legacy (v3 pipeline, `@example` tags, TypeScript `<7`): do not use for v4-style docs |
| `@effect/jsdocs`, `@effect/utils` (barrel codegen), `@effect/oxc`, `@effect/ai-docgen` | private: vendor (MIT, keep the license and source commit) or follow the rules by hand |
| API reference site | built in the separate `Effect-TS/website` repo; bring your own renderer (e.g. from the jsdocs JSON model) |
