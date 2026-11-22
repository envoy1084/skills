# Review checklist

Run through this before committing a module or package. Every "no" needs a reason.

## Files

- [ ] One public concept per PascalCase module; main type named after the module.
- [ ] Satellite package: flat `src/`, domain-prefixed module names; only `testing/` as a directory
      entry; `testing/` modules prefixed `Test`, family helpers `<Family>Test`.
- [ ] Private code in `src/internal/camelCase.ts`; every export there `/** @internal */`; no internal
      type in a public signature.
- [ ] No `utils`/`helpers`/`types` catch-alls, no default exports, enums, `export {}`, runtime
      namespaces, top-level side effects, `console`.
- [ ] Module TSDoc block at the top with `@stability` and `@since`; barrel entry in the generated
      format (or regenerated with codegen).

## Imports

- [ ] Library source imports Effect per module (`effect/Effect`), never a barrel.
- [ ] Relative imports end in `.ts`; type-only imports use `import type` / inline `type`.
- [ ] No imports from `effect/internal/*`; public protos (`Pipeable.Prototype`, `Inspectable.BaseProto`).

## Data types

- [ ] Interface + `Proto` + `Object.create`; private string TypeId `"~<pkg>/<Module>"`.
- [ ] `Pipeable`, `Inspectable` (`toJSON` with `_id`), `Equal`/`Hash` where equality is meaningful.
- [ ] `isX` guard via `hasProperty(u, TypeId)`; variance annotations; helper types in a namespace.
- [ ] All public fields `readonly`; operations return new values.

## API

- [ ] Binary operations are `dual`, data-last overloads first, `self` first parameter, refinements
      before predicates.
- [ ] Options inline, `readonly`, `?: T | undefined`.
- [ ] Names follow the table in [api-design.md](api-design.md): `make`/`empty`/`fromX`, `isX`,
      `*Unsafe` suffix, `match({ on* })`, `layer`/`layerX`, set algebra names.
- [ ] `const` type parameters for literals; conditional distribution chosen deliberately; explicit types on
      exported `dual`s and constructors.
- [ ] `@stability` correct; third-party types at most `unstable`; a 0.x package uses `unstable`,
      not `experimental`.

## Effects, services, errors

- [ ] `Effect.fnUntraced` internally, `Effect.fn("Module.op")` at traced boundaries; no
      `() => Effect.gen` wrappers.
- [ ] `return yield* error` for failures; typed errors for expected failures; defects for bugs.
- [ ] Services: `Context.Service<Self, Shape>()("<pkg>/<path>/Name")`, built with `X.of`; module-level
      `layer*` exports; request-scoped data read at call time.
- [ ] Errors: `Data.TaggedError`, or `Schema.TaggedError<Self>("<pkg>/<Module>[/<Reason>]")` with an
      identifier in library code; families follow `SqlError` (shared reason fields, reason TypeId,
      `isRetryable`, reason union type + `Schema.Union` value, both guards); no secrets in errors.
- [ ] Telemetry: spans `"Module.op"`, attributes dotted lowercase (OTel conventions first), metrics
      snake_case with a package prefix in a `*Metrics` module.
- [ ] No `runPromise`/`runSync` in library code.

## Docs

- [ ] Every public root documented: one-paragraph description, optional sections in order
      (When to use, Details, Gotchas), tags in order (`@deprecated @default @see @stability @category @since`).
- [ ] `@since` is the first release that ships the API; existing `@since` untouched.
- [ ] Categories reused from neighbours and present upstream; `@see` only to verified public APIs.
- [ ] Guides in `ai-docs/src` follow its README (`10_` prefixes, `@title` block); `LLMS.md`
      regenerated with `pnpm ai-docgen`, never edited.
- [ ] Examples only where they add information; ` ```ts import.meta.vitest `; `// =>` assertions;
      public imports; awaited `Effect.runPromise`; no `@example` tags.

## Tests

- [ ] Runtime behaviour in `test/Module.test.ts` with `@effect/vitest` (`it.effect`, `assert`),
      failures via `Effect.flip`, time via `TestClock`, no sleeps, no `runSync`.
- [ ] Tests import the package by name (barrel or subpath), never `../src`; helpers in
      `test/utils`, data in `test/fixtures`; container tests named `*.integration.test.ts`.
- [ ] Inference/rejection contracts in `typetest/Module.tst.ts` with tstyche.
- [ ] Laws and equivalences as property tests (`it.prop` / `it.effect.prop`, Schema or
      `effect/Arbitrary` inputs) where they exist.
- [ ] Performance work measured with tinybench `benchmark/` scripts or the `typeperf` /
      `runtimeperf` harnesses, not `vitest bench`.
- [ ] A bug fix has a test that fails without the fix.

## Package and release

- [ ] `exports` and `publishConfig.exports` aligned; `./internal/*` blocked; `sideEffects: []`.
- [ ] Peers with bounded ranges; optional peers kept out of the root barrel.
- [ ] Registered in tsconfig references, test paths, vitest/tstyche/doctest configs, changesets.
- [ ] Changeset: one consumer-facing sentence, bump chosen from stability.
- [ ] Validation commands run (format, lint, `pnpm check` — never `check-tsc` locally —, targeted
      tests, type tests, doctests, `jsdocs --check`, build/pack for packaging changes); anything not
      run is reported.
- [ ] Tooling matches upstream: `@effect/tsgo` only (no `@effect/language-service` dependency),
      changesets `access: restricted` with per-package `publishConfig.access: public`, both
      changesets patches, doctests over `src` only, no bundle budgets.
