# Effects, services, layers and errors

Check every API here against `ai-docs/src` and `src/` in the clone; Effect 4 renamed or removed
many v3 names (`Effect.Tag`, `Context.GenericTag`, `Either`, `Schema.TaggedErrorClass`, `effect/unstable/*`).

## Writing effectful functions

- Inline code: `Effect.gen(function*() { … })` (note: `function*()` with no space, dprint style).
- Reusable functions: wrap the generator, never write a function that only returns `Effect.gen`.
  - `Effect.fnUntraced(function*(…) { … })` in **library internals and hot paths** (about 580 uses
    in the core library). The language service is configured with `effectFn: ["untraced"]` and
    `effectFnOpportunity: "error"`, so it flags hand-written `(…) => Effect.gen(…)` wrappers.
  - `Effect.fn("Module.operation")(function*(…) { … })` at **public boundaries that deserve a
    tracing span** (service methods, request handlers). Span names are `"Service.method"`.
  - Extra arguments to `Effect.fn` / `fnUntraced` are pipeline steps applied to the body:
    `Effect.fn("Users.get")(function*(id) { … }, Effect.retry(policy))`.
- Fail with `return yield* error` so control flow visibly ends:

  ```ts
  if (Option.isNone(user)) {
    return yield* new UserNotFound({ id })
  }
  ```

- Attach behaviour with combinators (`.pipe(Effect.retry(…), Effect.withSpan(…))`), not ad hoc
  wrappers.
- Library code never calls `Effect.runPromise`/`runSync`; effects run at application boundaries
  (`ManagedRuntime`, platform runners, test runners).
- Time comes from `Clock`/`DateTime` (testable with `TestClock`), randomness from `Random`,
  resources from `Scope` (`Effect.acquireRelease`), configuration from `Config`.

## Services

The canonical form (`ai-docs/src/01_effect/03_services/01_service.ts`):

```ts
import { Context, Effect, Layer, Schema } from "effect"

export class Database extends Context.Service<Database, {
  query(sql: string): Effect.Effect<Array<unknown>, DatabaseError>
}>()("myapp/db/Database") {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function*() {
      const query = Effect.fn("Database.query")(function*(sql: string) {
        yield* Effect.log("Executing SQL query:", sql)
        return [{ id: 1, name: "Alice" }]
      })
      return Database.of({ query })
    })
  )
}

export type DatabaseService = Database["Service"]
```

- **Key**: the runtime identity of the service. Use package name plus module path:
  `"@scope/pkg/Module"` or `"@scope/pkg/area/Module/Service"` (core uses `"effect/Tracer/…"`,
  satellites `"@effect/auth/oauth/providers/Auth0/Client"`). No `~` prefix (that is for TypeIds).
  Reusing a key string for two services makes them collide.
- **Self type first**: `Context.Service<Self, Shape>()(key, options?)`.
- **Build with `X.of({ … })`** so the shape is checked.
- **`make` option**: `Context.Service<Self, Shape>()(key, { make: Effect.gen(…) })` exposes
  `X.make` for layers and tests.
- **Default-valued services** are `Context.Reference`:

  ```ts
  export const DisablePropagation = Context.Reference<boolean>(
    "effect/Tracer/DisablePropagation",
    { defaultValue: constFalse }
  )
  ```

- Service methods are documented on the shape (member TSDoc, no `@category`).
- Do not store request-specific values (current user, transaction) in a layer-built singleton;
  read them from context at call time.

## Layers

- **Library modules export layers at module level**: `export const layer`, `layerX`
  (`layerFromEnv`, `layerWebCrypto`, `layerTest`, `layerClient`). 217 module-level `layer*`
  exports vs 6 static class layers in core: application docs show `static readonly layer`, library
  modules use module exports.
- Constructors: `Layer.succeed(Tag, value)`, `Layer.effect(Tag, effect)` (scoped resources are
  acquired inside the effect; v4 has no `Layer.scoped`); compose with `Layer.provide`,
  `Layer.merge`, `Layer.provideMerge`.
- A layer's requirements are services needed **while building**; requirements of the returned
  functions stay in their own `R`.
- Expose a variant without dependencies provided (`…NoDeps`) when tests need to swap them, as the
  HttpApi examples do.

## Errors

### Plain tagged errors

```ts
import * as Data from "effect/Data"

export class BadArgument extends Data.TaggedError("BadArgument")<{
  module: string
  method: string
  description?: string | undefined
  cause?: unknown
}> {
  override get message(): string {
    return `${this.module}.${this.method}${this.description ? `: ${this.description}` : ""}`
  }
}
```

- `_tag` equals the class name. Carry structured data the caller can act on; derive `message`
  with an `override get message()`.
- Errors are yieldable: `return yield* new BadArgument({ … })`.

### Schema-backed errors (serializable, HttpApi-friendly)

Library errors always pass an **identifier** as the first call, `"<package>/<path>/<Module>"`
(30 uses across published packages, e.g. `"effect/sql/SqlError"`,
`"@effect/chat-slack/SlackChat/SlackAttachFailed"`); the empty `()` form appears only in TSDoc
examples, application code and private tools (`packages/tools/npm-promote/src/NpmPromoteError.ts`):

```ts
import * as Schema from "effect/Schema"

export class NotFound extends Schema.TaggedError<NotFound>("@scope/pkg/Users/NotFound")("NotFound", {
  id: Schema.Number
}) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>("@scope/pkg/Auth/Unauthorized")(
  "Unauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
```

`Schema.TaggedError<Self, Brand>(identifier?)` takes an optional second type parameter
(`{ readonly brand: unique symbol }`) when two errors with identical fields must not be assignable
to each other.

Use `Schema.TaggedError` when the error crosses a boundary (RPC, HttpApi, persistence, workers).
The optional third argument holds annotations such as `httpApiStatus`. Wrap unknown causes as
`cause: Schema.Defect()`.

### Error families with a `reason`

When a module family has several failure kinds, expose **one** error with a `reason` union.
Two upstream shapes exist; prefer the Schema one for new library code:

**Schema reason family** (`sql/SqlError.ts`, the newer pattern, serializable):

```ts
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

const TypeId = "~@scope/pkg/StoreError" as const
const ReasonTypeId = "~@scope/pkg/StoreError/Reason" as const

const ReasonFields = {
  cause: Schema.Defect(),
  message: Schema.optional(Schema.String),
  operation: Schema.optional(Schema.String)
}

export class ConnectionError extends Schema.TaggedError<ConnectionError>("@scope/pkg/StoreError/ConnectionError")(
  "ConnectionError",
  ReasonFields
) {
  readonly [ReasonTypeId] = ReasonTypeId
  get isRetryable(): boolean {
    return true
  }
}

// … one class per reason, each with ReasonTypeId and isRetryable

export type StoreErrorReason = ConnectionError | ConflictError

export const StoreErrorReason: Schema.Union<[typeof ConnectionError, typeof ConflictError]> = Schema.Union([
  ConnectionError,
  ConflictError
])

export class StoreError extends Schema.TaggedError<StoreError>("@scope/pkg/StoreError")("StoreError", {
  reason: StoreErrorReason
}) {
  readonly [TypeId] = TypeId
  override readonly cause = this.reason
  override get message(): string {
    return this.reason.message || this.reason._tag
  }
  get isRetryable(): boolean {
    return this.reason.isRetryable
  }
}

export const isStoreError = (u: unknown): u is StoreError => Predicate.hasProperty(u, TypeId)
export const isStoreErrorReason = (u: unknown): u is StoreErrorReason => Predicate.hasProperty(u, ReasonTypeId)
```

The parts, all from `SqlError.ts`: shared `ReasonFields`; a reason TypeId on every reason; an
`isRetryable` getter per reason that the wrapper forwards; the reason type **and** a `Schema.Union`
value of the same name; `cause` set to the reason; one guard for the wrapper and one for reasons.

**Data reason family** (`PlatformError.ts`, `crypto/CryptoError.ts`, server-only):

```ts
const TypeId = "~effect/PlatformError"

export class PlatformError extends Data.TaggedError("PlatformError")<{
  reason: BadArgument | SystemError
}> {
  readonly [TypeId]: typeof TypeId = TypeId

  override get message(): string {
    return this.reason.message
  }
}

export const isPlatformError = (u: unknown): u is PlatformError => Predicate.hasProperty(u, TypeId)

export const badArgument = (options: {
  readonly module: string
  readonly method: string
  readonly description?: string | undefined
  readonly cause?: unknown
}): PlatformError => new PlatformError(new BadArgument(options))
```

Callers handle reasons with `Effect.catchReason("PlatformError", "BadArgument", f, orElse?)`,
`Effect.catchReasons("PlatformError", { BadArgument: f }, orElse?)`, or lift them with
`Effect.unwrapReason("PlatformError")` and then `catchTag`. Each reason is itself a tagged error.

### Failure discipline

- Expected failures are typed errors; bugs and impossible states are defects (`Effect.die`,
  `Effect.orDie`). Never swallow an error into a default value silently.
- Typed errors never include secrets; wrap credentials in `Redacted`.
- Do not put user-facing HTTP concerns in domain errors unless the error is designed to cross the
  HTTP boundary (then use `Schema.TaggedError` with `httpApiStatus`).

## Schema

- Domain records: `Schema.Class<Self>("Name")({ fields })`, tagged variants
  `Schema.TaggedClass<Self>()("Tag", fields)`, unions of literals `Schema.Literals([...])`.
- Brands for identifiers: `Schema.String.pipe(Schema.brand("UserId"))`.
- Decode untrusted input at the boundary with `Schema.decodeUnknownEffect(schema)(input)`; build
  schemas once at module level, not per call.
- Look up current constructor and check names (`Schema.isPattern`, `Schema.isMinLength`,
  `Schema.isBetween`, `.check(...)`) in `SCHEMA.md` and `src/Schema.ts` of the clone.

## Telemetry names

- **Spans**: `"Module.operation"`, the module and function name (`"Migrator.run"`,
  `"EmbeddingModel.embed"`, `"ChatHandler.handle"`), set with `Effect.fn("Module.op")` or
  `Effect.withSpan`.
- **Span attributes**: dotted lowercase, OpenTelemetry semantic conventions first
  (`http.request.method`, `http.response.status_code`, `rpc.status_code`), package-specific ones
  under a package prefix (`effect.ai.object_name`).
- **Metrics**: snake_case with a package prefix (`effect_cluster_entities`,
  `effect_cluster_entity_mailbox_size`), declared as named constants in a `*Metrics` module
  (`cluster/ClusterMetrics.ts`) rather than inline at the use site.
