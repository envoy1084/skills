# Public API design

## Modules of functions, not methods

Operations are exported functions of the module that owns the type: `HashSet.union(a, b)`,
`Option.map(o, f)`. Data values expose only `pipe`, so every operation composes:

```ts
pipe(grants, Grants.union(more), Grants.has(Project, "read"))
grants.pipe(Grants.union(more))
```

Methods on values are reserved for builders whose type changes per call and needs `this`-typed
inference (`HttpApiGroup.make("users").add(endpoint)`, `HttpApi.make("api").add(group)`) and for
service shapes.

## `dual`

`dual` (from `effect/Function`) makes one implementation callable data-first and data-last:

```ts
import { dual } from "effect/Function"

export const getOrElse: {
  <B>(onNone: LazyArg<B>): <A>(self: Option<A>) => B | A
  <A, B>(self: Option<A>, onNone: LazyArg<B>): A | B
} = dual(
  2,
  <A, B>(self: Option<A>, onNone: LazyArg<B>): A | B => isNone(self) ? onNone() : self.value
)
```

Rules (from `Option.ts`, `HashSet.ts`, `Predicate.ts`):

- The export has an **explicit overloaded type**; the implementation passed to `dual` is the
  data-first signature.
- **Data-last overloads come first**, data-first second. With several shapes, each data-last /
  data-first pair stays together, most specific pair first.
- The subject is always the first parameter of the data-first form and is named `self`; a second
  value of the same type is `that` (`union(self, that)`).
- Generic parameters that belong to the subject are introduced on the *returned* function in the
  data-last form (`<A>(self: Option<A>) => …`), so inference flows from the piped value.
- `dual(arity, body)` when the arity distinguishes the forms. When optional arguments make arity
  ambiguous, use a predicate on the arguments:

  ```ts
  // Stream.mapEffect(self, f, options?) vs Stream.mapEffect(f, options?)
  export const mapEffect: { … } = dual((args) => isStream(args[0]), (self, f, options?) => …)
  ```

- **Refinement overloads precede predicate overloads**, so narrowing wins:

  ```ts
  export const filter: {
    <A, B extends A>(refinement: Refinement<A, B>): (self: Option<A>) => Option<B>
    <A>(predicate: Predicate<A>): <B extends A>(self: Option<B>) => Option<B>
    <A, B extends A>(self: Option<A>, refinement: Refinement<A, B>): Option<B>
    <A>(self: Option<A>, predicate: Predicate<A>): Option<A>
  } = dual(2, <A>(self: Option<A>, predicate: Predicate<A>): Option<A> => …)
  ```

- Callbacks in data-last forms that must not drive inference use `NoInfer<T>` (from TypeScript or
  `Types.NoInfer`).
- Unary operations (`size`, `isEmpty`, `toArray`) are plain functions, not `dual`.
- One TSDoc block per export; examples use the data-first form unless the pipeline is the point.

## Options

```ts
export const make = (options: {
  readonly capacity: number
  readonly strategy?: "dropping" | "sliding" | undefined
}): Effect.Effect<Queue> => …
```

- One options object, written **inline** in the signature, fields `readonly`, optional fields
  `?: T | undefined` (required by `exactOptionalPropertyTypes`). This is the maintainers' rule in
  `.agents/skills/effect-development/SKILL.md` ("Write option types inline in the signature by
  default").
- Extract a named options type only when the same substantial set is shared by several APIs, or
  when it needs conditional/mapped types driven by type parameters. A long list for one API is not
  a reason.
- Positional parameters only for the subject and one or two obvious arguments
  (`Redacted.make(value, options?)`).
- Destructors take handler objects with `on*` keys: `match(self, { onNone, onSome })`,
  `Exit.match({ onFailure, onSuccess })`.

## Naming

| Kind | Names | Examples |
| --- | --- | --- |
| constructors | `make`, `empty`, `of`, `fromX`, `fromXUnsafe` | `HashSet.make`, `HashSet.fromIterable`, `Duration.millis` |
| unchecked / throwing | suffix `Unsafe` (177 uses in v4; prefix `unsafe*` is legacy) | `makeUnsafe`, `wipeUnsafe`, `getUnsafe` |
| guards (narrow) | `isX` | `isRedacted`, `isHashSet`, `isSome` |
| predicates (boolean) | `isX`, `has`, `every`, `some`, `exists` | `HashSet.has`, `isSubset`, `isEmpty` |
| getters | plain noun or `getX` | `size`, `value`, `Option.getOrElse` |
| conversions | `toX` | `toArray`, `toJSON`, `Option.toArray` |
| mapping/sequencing | `map`, `flatMap`, `andThen`, `tap`, `flatten` | |
| filtering | `filter`, `filterMap`, `partition` | |
| set algebra | `union`, `intersection`, `difference`, `isSubset` | `HashSet.*` |
| combining | `zip`, `zipWith`, `all`, `combine`, `merge` | |
| logic | `and`, `or`, `not`, `xor`, `every`, `some`, `implies` | `Predicate.*` |
| destructors | `match` with `on*` handlers | `Option.match` |
| instances | `Equivalence`, `Order`, `makeEquivalence`, `makeOrder` | `Redacted.makeEquivalence` |
| layers | `layer`, `layerX` (`layerTest`, `layerWebCrypto`, `layerFromEnv`) | 217 module-level `layer*` exports |
| services | noun for what it provides | `HttpClient`, `Database` |
| errors | domain name; family errors end in `Error` | `NotFound`, `BadArgument`, `PlatformError` |
| tracing names | `"Module.function"` | `Effect.fn("Database.query")`, `"Migrator.run"` |
| metrics | snake_case, package prefix, constants in a `*Metrics` module | `ClusterMetrics.entities` = `"effect_cluster_entities"` |

One name per concept across the package; do not introduce synonyms per module.

## Type-level design

Effect's types are designed for inference and compiler speed. Measure with the typeperf harness
(`packages/effect/typeperf`) when changing heavy generic signatures.

- **Literal inference with `const` type parameters**: `<const Identifier extends string>`,
  `<const Fields extends Struct.Fields>`. Callers never need `as const`.
- **Choose conditional distribution deliberately**: `[T] extends [X<infer A>] ? A : never` when a
  union input must not distribute (`Redacted.Value`), plain `T extends X<infer A>` when it should
  (`HashSet.Value`).
- **Variance annotations** (`out`, `in`) on generic interfaces document intent and let the
  compiler skip structural variance checks.
- **Interfaces over large intersections** for public types: interfaces are cached and display by
  name in hovers and errors. Use `Types.Simplify` only where a flattened display helps.
- **Explicit types on exports** whose inferred type would be large or unstable (overloaded
  `dual` exports, constructors). Small implementations rely on inference.
- **Namespaces for helper types** (`Effect.Success<T>`, `Redacted.Value<T>`), not free-floating
  `type XSuccess`.
- **Constrain early, infer late**: put the generic that callers supply first; keep inference
  sites on the arguments, not on the return type.
- **`NoInfer`** where a parameter must not widen an already-inferred type.
- **Avoid deep recursion** in public types (tuple/record mapping depth); bound it or use overloads.
- **Self-typed classes** for services and schema classes: `class X extends Context.Service<X, Shape>()("key")`,
  `class E extends Schema.TaggedError<E>()("E", fields)`. Forgetting `Self` yields a
  `MissingSelfGeneric` type error by design.
- **Type tests** assert inference contracts (see [testing.md](testing.md)); ordinary signatures are
  covered by `pnpm check`.

## Stability in the API

- Every module and export is tagged `@stability stable | unstable | experimental`. The tag
  decides the semver policy (see [tooling.md](tooling.md)).
- Anything that exposes a third-party dependency's types is at most `unstable`. The language
  service rule `apiStabilityLeak` rejects a stable signature that references an unstable type.
- Effect 4.1 has no `unstable/` folder: stability is only the tag.

## Declaration vs implementation

For larger features Effect separates **declaration as data** from **implementation as a Layer**:

```ts
class Api extends HttpApi.make("api").add(UsersGroup) {}          // shareable declaration
const UsersLive = HttpApiBuilder.group(Api, "users", (handlers) =>  // server implementation
  handlers.handle("getById", ({ params }) => users.getById(params.id)))
```

Declarations are pure, schema-based and importable by clients; implementations capture services
when the layer is built and read request-scoped services (current user) when called. Mirror this
split for any "define once, implement on the server, consume on the client" feature.
