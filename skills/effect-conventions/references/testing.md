# Testing

Source: the maintainers' `test-development` skill (`.agents/skills/test-development/*`),
`packages/vitest/src/{index,utils}.ts`, and existing tests in `packages/effect/test` and
`packages/effect/typetest` of the clone.

Choose coverage from the contract being changed:

| Contract | Test kind | Location |
| --- | --- | --- |
| behaviour observable at runtime | Vitest via `@effect/vitest` | `test/Module.test.ts` |
| compiler behaviour: inference, assignability, rejection, overload choice, displayed type | tstyche | `typetest/Module.tst.ts` |
| documented examples | doctest | the TSDoc itself |
| an ordinary exported signature | none extra | covered by `pnpm check` |

A change can need both runtime and type tests. A runtime bug in generic code needs a runtime
regression test, not a type test, when the type contract is unchanged.

## Runtime tests

Templates to copy: `packages/effect/test/Redacted.test.ts` (data type, `@effect/vitest/utils`
helpers) and `packages/opentelemetry/test/Resource.test.ts` (`assert`, `it.effect`, layers). Some
older files (`test/HashSet.test.ts`) still import `expect` from `vitest`; do not copy those.

```ts
import * as Resource from "@effect/opentelemetry/Resource"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"

describe("Resource", () => {
  it("lets custom attributes override SDK defaults but not the service options", () => {
    const attributes = Resource.configToAttributes({ serviceName: "test", attributes: { "service.name": "x" } })
    assert.deepStrictEqual(attributes["service.name"], "test")
  })

  it.effect("preserves embedded equals signs and ignores empty attribute keys", () =>
    Effect.gen(function*() {
      const resource = yield* Resource.Resource
      assert.strictEqual(resource.attributes["encoded"], "abc=def==")
    }).pipe(
      Effect.provide(Resource.layerFromEnv()),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({ env: { OTEL_RESOURCE_ATTRIBUTES: "encoded=abc=def==" } })
      )
    ))
})
```

Rules:

- Import `describe`, `it`, `assert` (and `layer`) from `@effect/vitest`, never `vitest`.
- One file per module, `describe("Module", …)` at the top; test names are lowercase sentences
  stating the behaviour (`"rejects duplicate role names"`), not `"test 1"` or `"works"`.
- `it` for pure synchronous code, `it.effect` for Effects (provides a `TestClock` and a `Scope`,
  closes it after; return scoped effects directly instead of wrapping in `Effect.scoped`).
  `it.live` runs with real services when the live clock is the point.
- Assert with `assert` from `@effect/vitest`, or the helpers in `@effect/vitest/utils`:
  `strictEqual`, `deepStrictEqual`, `assertTrue`, `assertFalse`, `assertSome`, `assertNone`,
  `assertSuccess`, `assertFailure`, `assertExitSuccess`, `assertExitFailure`, `assertInstanceOf`,
  `assertInclude`, `assertMatch`, `throws`, `fail`. Not Vitest's `expect` (a few legacy files still
  use it; do not copy them).
- Failures: `const error = yield* Effect.flip(program)` then assert on `_tag` and fields; or run
  `Effect.exit` and use `assertExitFailure`.
- Time: `yield* TestClock.adjust("1 minute")` inside `it.effect` (`TestClock` comes from
  `effect/testing`, `it.effect` provides it), never real sleeps.
- No `Effect.runSync`/`runPromise` inside unit tests; let the runner run the Effect.
- Services: provide real implementations or alternative test layers
  (`Effect.provide(TestLayer)`); share a layer across a block with `it.layer(layer)(name, (it) => …)`
  or the top-level `layer(…)`.
- Equality of Effect data types: `assertTrue(Equal.equals(a, b))` or `deepStrictEqual` (which
  understands `Equal`).

### Property tests

`it.prop` / `it.effect.prop` take Schemas (or fast-check arbitraries) for inputs:

```ts
it.effect.prop(
  "rechunk preserves elements",
  {
    chunks: Schema.Array(Schema.Array(Schema.Int)).check(Schema.isMinLength(1)),
    size: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))
  },
  Effect.fnUntraced(function*({ chunks, size }) {
    const actual = yield* Stream.fromArray(chunks).pipe(Stream.flattenArray, Stream.rechunk(size), Stream.runCollect)
    assert.deepStrictEqual(actual, chunks.flat())
  })
)
```

Use them for algebraic laws (union is commutative, filter agrees with check, encode/decode round
trips).

## Type tests (tstyche)

```ts
import { Option, pipe, Result } from "effect"
import type { Predicate } from "effect"
import { describe, expect, it } from "tstyche"

declare const number: Option.Option<number>
declare const refinement: Predicate.Refinement<number | string, number>

describe("Option", () => {
  it("filter narrows with a refinement", () => {
    expect(Option.filter(Option.some<number | string>(1), refinement)).type.toBe<Option.Option<number>>()
  })

  it("rejects non-option inputs", () => {
    expect(Option.all).type.not.toBeCallableWith(42)
  })

  it("data-last form infers from the piped value", () => {
    expect(pipe(number, Option.map((n) => n + 1))).type.toBe<Option.Option<number>>()
  })
})
```

- Files `typetest/Module.tst.ts`; inputs as `declare const` values (no runtime).
- Assertions: `.type.toBe<T>()` for exact structural types, `.type.toBeAssignableTo<T>()`,
  `.type.not.toBeCallableWith(...)` for rejections, `.type.toRaiseError(...)` for messages.
- `toBe` checks structure, not hover display; for displayed-type regressions read
  `.agents/skills/test-development/displayed-types.md` in the clone.
- Root `tstyche.json` matches `packages/*/typetest/**/*.tst.*`; run `pnpm test-types <file>`
  (it checks against every configured TypeScript version). For a regression, confirm the
  assertion fails on the old type.

## Doctests

- Root `vitest.docs.ts` registers `@effect/doctest/Plugin` with `includeSource` over package
  sources (and docs Markdown); only fences tagged `ts import.meta.vitest` run.
- Run `pnpm doctest --run <files>`. Each example is its own module; `// =>` lines are assertions.

```ts
// vitest.docs.ts (shape)
import * as Doctest from "@effect/doctest/Plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [Doctest.plugin()],
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    include: [],
    includeSource: ["packages/*/src/**/*.ts", "packages/*/*/src/**/*.ts"]
  }
})
```

## Configuration

- One root `vitest.config.ts` with a project per package (Effect builds them with a `project()`
  helper over a shared config); no per-package vitest config.
- Tests import packages by name; the root `tsconfig.tests.json` `paths` map names to `src`.
- Never run the whole suite in watch mode: `pnpm test --run <files>`, `pnpm doctest --run <files>`.
- Integration suites that need containers or networks are opt-in via environment variables
  (`EFFECT_INTEGRATION_TESTS=1`), not part of the default run.

## What to test

The documented contract, its failure cases and regressions. Do not restate the implementation,
test what the type checker already proves, or assert the obvious. For a bug fix, the new test
must fail without the fix.
