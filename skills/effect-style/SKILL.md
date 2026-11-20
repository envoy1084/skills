---
name: effect-style
description: How TypeScript code is laid out and written in Effect v4 projects, following the Effect library's own conventions. Use when creating or editing any source file, choosing file and export names, writing errors or services, or reviewing code for style.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

Code here reads like the Effect library's source. Before writing, open a neighbouring module in the
same package and the matching module in `node_modules/effect/src` (for example `Duration.ts` for a
data type with constructors, `Context.ts` for services) and follow them.

## Files and modules

- One public concept per module file, named after the concept in PascalCase: `Slug.ts`,
  `HttpClient.ts`. The module's main type shares its name (`Slug.Slug`, like `Duration.Duration`).
- `src/index.ts` re-exports each module as a namespace and carries the module's TSDoc (with
  `@stability` and `@since`): `export * as Slug from "./Slug.ts";`. Consumers write
  `Slug.make(...)`. Module files themselves start with their imports, no module comment block.
- Implementation details that several modules share live in `src/internal/` with camelCase file
  names (`internal/slugify.ts`). They are never exported from a package entry.
- Each file has one responsibility. Split by concept, not by kind (no `types.ts`, `utils.ts`,
  `helpers.ts`, `constants.ts` catch-alls).
- Relative imports use the `.ts` extension (`./Slug.ts`); the build rewrites them to `.js`.

## Imports

- Import Effect modules from the `effect` barrel: `import { Effect, Schema } from "effect";`.
- Alias modules that shadow globals: `Array as Arr`, `String as Str`, `Record as Rec`,
  `Number as Num`, `Boolean as Bool`.
- Unstable modules come from their subpath (`effect/cli`, `effect/http`, `effect/process`) and are
  allowlisted per package in `tsconfig.json` (`allowedUnstableApis`).
- Use `import type` for type-only imports (`verbatimModuleSyntax` is on).

## Naming

- Constructors: `make`, `fromX`, `unsafeMake`. Guards: `isX`. Conversions: `toX`. Getters: plain
  nouns (`name`, `size`).
- Errors end in `Error` and say what went wrong in the domain: `EmptySlugError`, not `SlugError2`.
- Services are nouns for what they provide: `Tools`, `Workspace`, `HttpClient`.
- One name per concept across the repository; do not introduce synonyms per file.

## Errors

```ts
export class EmptySlugError extends Schema.TaggedError<
  EmptySlugError,
  { readonly brand: unique symbol }
>()("EmptySlugError", {
  input: Schema.String,
}) {}

if (Option.isNone(words)) return yield * EmptySlugError.make({ input: text });
```

The brand keeps structurally similar errors from being assignable to each other. Carry the data a
caller needs to react (`input`, `status`), not a pre-formatted message.

## Services

```ts
export class Tools extends Context.Service<
  Tools,
  {
    /** Runs `command`, failing with its output when it exits non-zero. */
    readonly run: (command: string, args: readonly string[]) => Effect.Effect<string, ToolFailed>;
  }
>()("@scope/tools/Tools") {
  static readonly layer = Layer.effect(
    Tools,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const run = Effect.fn("Tools.run")(function* (command: string, args: readonly string[]) {
        // ...
      });
      return Tools.of({ run });
    }),
  );
}
```

- The service key is `@scope/package/Name`. The layer is a static `layer` on the class.
- Methods are built with `Effect.fn("Service.method")` and documented on the shape.
- Shared behaviour belongs in a service that other code yields, not in free functions that take a
  client as their first argument.

## Structure inside a function

- Inline one-off logic at its use site. Do not declare small helpers, constants or fixtures at the
  top of a file when they are used once or twice: a reader should not jump around to follow a
  function.
- Inline trivial wrappers: a function that only constructs an error, forwards a call or wraps an
  assertion adds navigation without clarifying intent.
- Separate logical blocks with one blank line: setup, validation, execution, state updates, result.
  Keep short related declarations together; do not add a blank line after every statement.
- Prefer early returns over nested conditionals.
- Yield effects into a `const` before passing the value to a call (`effecttsgo/yield-in-call-argument`).

## Comments and types

Projects lint with [landmines](https://github.com/interfere-inc/landmines), so:

- No prose comments. Make the code say it (names, small functions, types) and put rationale in the
  commit message or PR. Allowed: functional directives (`oxlint-disable-next-line … -- reason`,
  `@ts-expect-error`, `@effect-diagnostics-next-line`), a single-line `// WARNING:` for a
  dangerous, recurring footgun, and TSDoc on exported symbols (see the `jsdocs` skill).
- No annotated return types on implementations: let TypeScript infer them, and use `satisfies` to
  pin a contract where it matters.
- Never disable a landmines rule to get a check green; do what its message says.
