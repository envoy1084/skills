---
name: effect-development
description: Effect v4 development guidance. Use when implementing or reviewing code that composes Effect APIs (Effect, Schema, Layer, Stream, services, errors) or that adds or changes API signatures.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

Use the installed Effect documentation as targeted reference, never memory of Effect v3 or earlier
v4 betas:

1. Read `node_modules/effect/AGENTS.md` completely if you have not in this session.
2. Identify the Effect APIs and concepts involved in the change.
3. Search `node_modules/effect/ai-docs` and `node_modules/effect/src` for those names, then read
   the matching sections, examples and signatures.
4. Inspect nearby source and tests for repository conventions the docs do not cover.

The task is ready for implementation when every material Effect API or pattern has matching local
guidance, or the search has established that none exists.

## Writing Effect code

- Use `Effect.gen` for inline code. For reusable functions, use `Effect.fn("name")` when a tracing
  span helps, and `Effect.fnUntraced` in library internals and hot paths. Never write a function
  that only wraps and returns `Effect.gen`.
- Fail with `return yield* SomeError.make({ ... })` so control flow ends visibly.
- Attach behaviour (retries, spans, error mapping) with combinators in `.pipe(...)` or as extra
  arguments to `Effect.fn`.
- Model expected failures as tagged errors in the error channel; keep defects (`Effect.die`,
  `Effect.orDie`) for bugs and impossible states.
- Provide dependencies with services and layers, not module-level singletons.
- Prefer Effect's data modules (`Array`, `String`, `Option`, `Record`, `Predicate`) over native
  methods; the oxlint presets flag native calls that have an Effect replacement.

## API conventions

Do not annotate return types on implementations (`no-explicit-return-types` in landmines): let
`Effect.fn` and TypeScript infer them, and use `satisfies` where a contract must be pinned.

Write option types inline in the signature by default. Mark fields `readonly` and add
`| undefined` to optional fields:

```ts
export const make = (options: {
  readonly capacity: number;
  readonly strategy?: "dropping" | "sliding" | undefined;
}): Effect.Effect<Queue> => ...
```

Declare a named options type only when a substantial set of options is shared across several APIs,
or when it needs conditional or mapped types driven by type parameters. A long option list for a
single API is not on its own a reason to extract a named type.

Public combinators that take the subject first also accept it last (`dual` from
`effect/Function`), so they work in `pipe`. The `effecttsgo/missing-pipeable-signature` rule flags
exported functions without a pipeable form.

## Diagnostics

`tsc` and `oxlint` both run Effect diagnostics. Fix the code they flag. Suppress one only when the
flagged pattern is the point of the code, with a one-line reason:

- language service (typecheck): `// @effect-diagnostics-next-line <rule>:off`
- oxlint presets: `// oxlint-disable-next-line effecttsgo/<rule> -- <reason>`
