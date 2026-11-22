# Module files

## Naming and granularity

- One public concept per module, PascalCase file named after the concept: `Duration.ts`,
  `HashSet.ts`, `PlatformError.ts`, `HttpApiEndpoint.ts`.
- The module's main type has the module's name, so consumers write `HashSet.HashSet<A>`,
  `Duration.Duration`. Operations are module-level functions: `HashSet.union(a, b)`.
- Related modules share a prefix rather than a folder when they are peers:
  `HttpApi`, `HttpApiEndpoint`, `HttpApiGroup`, `HttpApiBuilder`, `HttpApiError`. Domain families
  with their own entry point live in a lower-case folder with an `index.ts`: `src/http-api/`,
  `src/crypto/`, `src/sql/`. Those folders exist only inside the `effect` package, which bundles
  dozens of families; modules inside a folder still carry the family prefix (`Sql*`, `Rpc*`).
- **Satellite packages are flat**: every module sits directly in `src/` with a domain prefix
  (`packages/sql/pg/src/PgClient.ts`, `PgPool.ts`, `PgMigrator.ts`;
  `packages/opentelemetry/src/OtelTracer.ts`, `OtelLogger.ts`; `packages/atom/react/src/Hooks.ts`).
  The only directory entry upstream uses for a sub-area is `testing/`.
- **Test helpers**: a family's test module is `<Family>Test` (`http-api/HttpApiTest.ts`,
  `rpc/RpcTest.ts`, `ai/McpTest.ts`); modules under `testing/` are prefixed `Test`
  (`testing/TestClock.ts`, `TestConsole.ts`, `TestSchema.ts`).
- Satellites may reuse a core module name when the meaning is domain-specific
  (`@effect/opentelemetry/Resource` next to `effect/Resource`); consumers alias on import.
- Split by concept, never by kind: no `types.ts`, `utils.ts`, `helpers.ts`, `constants.ts`,
  `errors.ts` catch-alls. An error that belongs to one module is declared in that module; a family
  of errors shared by many modules gets its own module (`PlatformError.ts`, `CryptoError.ts`).

## Public file vs internal file

```text
src/Redacted.ts            interface, namespace, TSDoc, constructors, dual wiring, prototype
src/internal/redacted.ts   shared private state and algorithms, every export /** @internal */
```

- The public file owns everything a reader of the API needs: types, docs, signatures. It may hold
  the whole implementation when it is short (`Redacted.ts` does).
- Move code to `src/internal/<camelCase>.ts` when it is large, shared by several public modules, or
  would expose details (registries, mutable indexes, algorithms). Folder families have their own
  `internal/` (`src/crypto/internal/`).
- Every export of an internal file is marked:

  ```ts
  import type * as Redacted from "../Redacted.ts"

  /** @internal */
  export const redactedRegistry = new WeakMap<Redacted.Redacted<any>, any>()

  /** @internal */
  export const value = <T>(self: Redacted.Redacted<T>): T => { … }
  ```

- Public files import internals as a namespace: `import * as redacted from "./internal/redacted.ts"`
  and re-expose with explicit types:

  ```ts
  export const value: <T>(self: Redacted<T>) => T = redacted.value
  ```

- Internal types never appear in public signatures (`effect/no-unused-internal`).

## Module header

Every module file starts with a module TSDoc block, then imports:

```ts
/**
 * Wraps sensitive values so normal output does not reveal them.
 *
 * A `Redacted<A>` shows a redacted placeholder in string, JSON, and inspection
 * output, while still storing the original value for trusted code that needs to
 * recover it. This module includes constructors, runtime checks, value recovery,
 * wiping of stored values, and comparison helpers.
 *
 * @stability stable
 * @since 3.3.0
 */
import * as Equal from "./Equal.ts"
import * as Hash from "./Hash.ts"
```

Module prose is free-form (no declaration template), may include `**Example**` sections, and ends
with `@stability` then `@since`. Barrel codegen copies those two tags into `index.ts`.

## Imports

In a package other than `effect`, library source imports Effect **one module at a time**:

```ts
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual, identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Schema from "effect/Schema"
import * as Grants from "./Grants.ts"
import * as internal from "./internal/authorizer.ts"
```

- Namespace imports (`import * as X`) for modules; named imports only for a few functions from
  `effect/Function` (`dual`, `pipe`, `identity`, `constTrue`) and from `Predicate`
  (`hasProperty`, `isString`) when used heavily.
- **Never import from a barrel** in library source (`effect`, `effect/http`, `@scope/pkg`); lint
  rule `effect/no-import-from-barrel-package` enforces it. Barrels are for consumers, tests and
  doc examples.
- `import type * as X` for type-only use; inline `type` specifiers for mixed imports
  (`import { type Pipeable, pipeArguments } from "effect/Pipeable"`). `verbatimModuleSyntax` and
  `typescript/consistent-type-imports` (inline style) enforce it.
- Relative imports end in `.ts` (`effect/no-js-extension-imports`); the build rewrites to `.js`.
- Imports are sorted; one import statement per module (`import/no-duplicates`).
- Doc examples and tests import from the public barrel: `import { Effect, Schema } from "effect"`,
  `import { Grants } from "@scope/permissions"`.

## Order inside a module

Follow the analogue module; the common order is:

1. module TSDoc, imports
2. `const TypeId = "~@scope/pkg/Module"` (private) and other private constants
3. the main `interface` and its `export declare namespace` (Variance, helper types)
4. guards (`isX`)
5. constructors (`make`, `empty`, `of`, `fromX`, `makeUnsafe`)
6. the prototype object (`const Proto = { … }`) next to the constructor that uses it
7. getters, then combinators grouped by category (mapping, filtering, combining, …)
8. instances (`Equivalence`, `Order`, `makeEquivalence`)
9. layers and services, if any

Group by the `@category` you assign; readers navigate the generated docs by category.

## Things a module never contains

- `export default`, `enum`, `export {}`, runtime `namespace` blocks.
- Top-level side effects (registrations, global mutation). `sideEffects: []` promises bundlers
  that importing a module does nothing.
- Commented-out code, debug logging, `console.*` (`eslint/no-console`).
- Prose comments restating the code. Comments explain non-obvious invariants and trade-offs;
  public behaviour is described in TSDoc.
