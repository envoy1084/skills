---
name: effect-conventions
description: The single guide for writing Effect v4 TypeScript that reads like the Effect source itself — using Effect APIs from the installed docs instead of memory, module and file layout, data types, dual APIs, naming, type-level design, services, layers, errors, TSDoc with runnable examples, runtime and type tests, package manifests and tooling — checked against a pinned clone of Effect-TS/effect. Use whenever writing, reviewing or documenting any Effect v4 code (library packages, apps, tools, tests), designing a public API, or setting up a package.
---

# Effect conventions

The goal: a reader who knows the Effect v4 source cannot tell your module apart from one in
`packages/effect/src`. Same file layout, same names, same data-type construction, same `dual`
signatures, same TSDoc, same tests.

The source of truth is **Effect itself**, not this skill and not memory: the installed package
(`node_modules/effect`: `AGENTS.md`, `ai-docs/`, `src/`) for the APIs you call, and a clone of
`Effect-TS/effect` for style, tests, tooling and the maintainers' own rules. Effect v4 lives on
`main` of `Effect-TS/effect` (`Effect-TS/effect-smol` is archived). Facts here were verified
against `main` at effect 4.1.5 (commit `66ab992`, 2026-11-20); re-check anything that matters.

## Workflow

1. **Ground every Effect API you use** in the installed docs, never memory of Effect 3 or v4 betas:
   - read `node_modules/effect/AGENTS.md` completely once per session;
   - search `node_modules/effect/ai-docs` and `node_modules/effect/src` for each API and concept
     involved, and read the matching examples and signatures;
   - inspect nearby source and tests for repository conventions the docs do not cover.

   Ready to write when every material API has matching local guidance, or a search showed none exists.

2. **Get a reference clone** for style (once per machine, refresh before large work); see
   [references/reference-clone.md](references/reference-clone.md):

   ```sh
   git clone --depth 1 https://github.com/Effect-TS/effect.git ~/.cache/effect-reference
   git -C ~/.cache/effect-reference log -1 --format='%H %cd'
   ```

3. **Find the closest analogue** and open it side by side:

   | Writing | Read in `packages/effect/src` |
   | --- | --- |
   | small immutable data type, all in one file | `Redacted.ts` + `internal/redacted.ts`, `Duration.ts` |
   | collection, set algebra, or hidden representation | `HashSet.ts` + `internal/hashSet.ts`, `HashMap.ts` |
   | tagged union / result type | `Option.ts`, `Result.ts`, `Exit.ts` |
   | predicates and combinators | `Predicate.ts`, `Filter.ts`, `Order.ts`, `Equivalence.ts` |
   | service + layers | `Context.ts`, `ai-docs/src/01_effect/03_services/*` |
   | error family with reasons | `sql/SqlError.ts` (Schema, serializable), `PlatformError.ts` (Data) |
   | declaration-as-data + Layer implementation | `http-api/HttpApiEndpoint.ts`, `http-api/HttpApiBuilder.ts` |
   | application code (handlers, services, wiring) | `ai-docs/src/**` |
   | satellite package | `packages/opentelemetry`, `packages/sql/pg` (flat `src/`, domain-prefixed modules) |
   | metrics constants | `cluster/ClusterMetrics.ts` |
   | benchmarks, type cost | `benchmark/*.ts` (tinybench), `typeperf/`, `runtimeperf/` |

4. **Load the reference files that apply** before editing:

   | Topic | File |
   | --- | --- |
   | Monorepo, package.json, exports, tsconfig, build, barrels | [references/packages.md](references/packages.md) |
   | Module files, imports, internal files, ordering, function bodies | [references/modules.md](references/modules.md) |
   | Data types: TypeId, interface, prototype, Equal/Hash/Pipeable | [references/data-types.md](references/data-types.md) |
   | Public API shape: `dual`, overloads, naming, options, type-level design | [references/api-design.md](references/api-design.md) |
   | Effects, services, layers, errors, Schema | [references/effects-services-errors.md](references/effects-services-errors.md) |
   | TSDoc, stability, categories, runnable examples | [references/tsdoc.md](references/tsdoc.md) |
   | Runtime tests, type tests, doctests, property tests | [references/testing.md](references/testing.md) |
   | Formatter, linter, compiler, diagnostics, scripts, changesets | [references/tooling.md](references/tooling.md) |
   | Final review before committing | [references/checklist.md](references/checklist.md) |

5. **Write, then compare with the analogue** line by line: names, overload order, doc sections,
   tag order, test style. Differences need a reason.

6. **Validate** with the narrowest commands that cover the change (see
   [references/tooling.md](references/tooling.md)) and report anything you could not run.

## The rules that matter most

1. One public concept per PascalCase module file (`Grants.ts`); its main type has the module's
   name (`Grants.Grants`). Implementation details go in `src/internal/camelCase.ts`, every export
   there tagged `/** @internal */`. Satellite packages keep `src/` flat with domain-prefixed
   names (`PgClient`); `testing/` is the only directory entry point outside the `effect` package.
2. Every module file starts with a module TSDoc block (`@stability`, `@since`); every public export
   has a TSDoc block ending in `@stability`, `@category`, `@since`. A 0.x package tags its modules
   `unstable`, not `experimental`; categories come from upstream's list.
3. Library source imports Effect per module: `import * as Effect from "effect/Effect"`, never the
   `effect` barrel (tests, examples and app code may use the barrel). Relative imports end in
   `.ts`. Type-only imports are `import type`.
4. Data types are an `interface` plus a prototype object and `Object.create`, not classes. TypeIds
   are private strings `"~<package>/<Module>"`. Values implement `Pipeable`, `Equal`/`Hash` where
   meaningful, `Inspectable` where inspection is useful, and have an `isX` guard.
5. Binary operations are `dual`: data-last overloads first, data-first second, first parameter
   `self`. Refinement overloads come before predicate overloads.
6. Options are one inline `readonly` object parameter with `?: T | undefined` fields.
7. Constructors `make`, `empty`, `fromX`; guards `isX`; throwing or unchecked variants end in
   `Unsafe` (`makeUnsafe`, not `unsafeMake`); layers are `layer` / `layerX`.
8. Expected failures are tagged errors (`Data.TaggedError` or `Schema.TaggedError`); library
   Schema errors pass an identifier (`Schema.TaggedError<E>("@scope/pkg/Module/E")("E", …)`);
   related failures form one error with a `reason` union in the `SqlError` shape. Library internals
   use `Effect.fnUntraced`; boundaries that deserve a span use `Effect.fn("Module.name")`. Fail
   with `return yield* error`.
9. Examples are ` ```ts import.meta.vitest ` fences with `// =>` assertions, run by
   `@effect/doctest`. No `@example` tags.
10. Tests use `@effect/vitest` (`it.effect`, `assert`, `it.prop` with Schema or `effect/Arbitrary`
    inputs), type tests use tstyche in `typetest/`, benchmarks are tinybench scripts plus the
    `typeperf`/`runtimeperf` harnesses.
11. Formatting: no semicolons, double quotes, no trailing commas, 120 columns, 2-space indent,
    arrow parentheses always (dprint).

## Never

- Import from `effect/internal/*` or copy internal helpers such as `PipeInspectableProto`; use the
  public equivalents (`Pipeable.Prototype`, `Inspectable.BaseProto`).
- Use enums, default exports, `export {}`, runtime namespaces (`erasableSyntaxOnly`), `any` to
  silence inference, or classes for plain data types.
- Run effects inside library code (`Effect.runPromise`, `runSync`) except at documented runtime
  boundaries.
- Write APIs from memory of Effect 3 or betas (`Effect.Tag`, `Context.GenericTag`, `Either`,
  `Schema.TaggedErrorClass`, `effect/unstable/*` paths — 4.1.5 uses `effect/sql`, `effect/http-api`,
  `effect/rpc`, `effect/workflow`, `effect/ai` — `Layer.scoped`, `FastCheck` from `effect/testing`)
  — check the docs and clone.
- Add tooling upstream does not use (a separate `@effect/language-service` dependency, `vitest
  bench`, bundle budgets, attw/publint, doctests over READMEs) when the goal is to match Effect.
