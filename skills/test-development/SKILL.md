---
name: test-development
description: Writing tests with @effect/vitest. Use when adding or changing tests, reproducing a bug as a regression test, or registering a package's tests.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

## Where tests live

- `packages/<name>/test/<Module>.test.ts`, one file per module under test.
- Tests import the package by its name (`import { Slug } from "@scope/core"`), which resolves to
  `src` through the `workspace-source` condition. Reach internals with a relative import only when
  the behaviour has no public entry.
- Every package with tests is a project in `.config/vitest.config.ts`. Add one entry when a package
  gets its first test.

## Writing tests

- Import from `@effect/vitest`, never `vitest` (lint enforces it).
- Use `it.effect` for Effect-returning tests and `it` for pure synchronous ones. `it.effect`
  provides and closes a `Scope`; return scoped effects directly.
- Assert with `assert` from `@effect/vitest`, not `expect`.
- Assert failures by flipping the effect: `const error = yield* Effect.flip(program)`, then check
  its class and fields.
- Use `TestClock` for time; never real timers or sleeps.
- Provide services with `layer(...)` from `@effect/vitest` or `Effect.provide` with a test layer.
  Do not write `Effect.promise` or `async` tests.
- Yield into a `const` first, then assert: `const slug = yield* Slug.make("x");`.

## Tests that cannot lie

Projects lint tests with [landmines](https://github.com/interfere-inc/landmines). Write them so it
has nothing to report:

- No test doubles: no module mocks, `vi.fn(impl)`, stubbed globals or patched prototypes. Use the
  real implementation, or a real alternative implementation provided as a test `Layer`. For the
  network, use MSW with `onUnhandledRequest: "error"` (msw 2) or `onUnhandledFrame: "error"`
  (msw 3). Observation-only spies are fine.
- No fixed sleeps: await the operation or a signal it emits; drive time with `TestClock`.
- No `expect.poll` or `vi.waitFor` on recorders or spy state: await the event instead.
- No retries and no raised timeouts, per test or in config: tests run under Vitest's 5s default.
  A test that passes on rerun, or needs more time, is a problem to fix, not to mask.
- File names: `*.test.ts` for tests, `*.fixture.ts` for shared fixtures, `*.test-utils.ts` for
  shared helpers. Never `.spec.ts`, `helpers.ts` or `mocks.ts`.

## What to test

Write the tests a behaviour needs: the documented contract, its failure cases and regressions.
Do not add tests that restate the implementation, check what the type checker already proves, or
assert the obvious. For a bug fix, confirm the new test fails without the fix.

Run `pnpm test` (or `pnpm vitest run -c .config/vitest.config.ts --project <name>` for one
package), then `pnpm check`.
