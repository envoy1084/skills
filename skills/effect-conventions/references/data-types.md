# Data types

Effect data types are **interfaces plus prototype objects**, not classes. Study
`Redacted.ts` (small, all in one file) and `HashSet.ts` + `internal/hashSet.ts` (public file wires
docs and `dual`, internal file owns the prototype and algorithms).

## Anatomy

| Part | Convention |
| --- | --- |
| TypeId | private `const TypeId = "~effect/Redacted"`: a **string**, `~` prefix, package + module path. Third-party: `"~@scope/pkg/Module"`. Even `Equal.symbol` (`"~effect/Equal"`) and `Hash.symbol` are strings. |
| Interface | `export interface X<out A> extends X.Variance<A>, Equal.Equal, Pipeable` with `readonly` public fields only; add `Inspectable` (and `Iterable<A>`) when the value has meaningful inspection output, as `HashSet` does (`Redacted` deliberately does not) |
| Variance | `export declare namespace X { export interface Variance<out A> { readonly [TypeId]: { readonly _A: Covariant<A> } } }` for generic types; non-generic types use `readonly [TypeId]: typeof TypeId` |
| Helper types | in the merged namespace: `X.Value<T>`, `X.Success<T>`. Choose distribution deliberately: `[T] extends [X<infer A>] ? A : never` (`Redacted.Value`) does not distribute over unions; `T extends X<infer A> ? A : never` (`HashSet.Value`) does |
| Prototype | one `const Proto = { … }` object implementing `pipe`, `toJSON`, `toString`, Node inspect, `Equal.symbol`, `Hash.symbol`, iterators where relevant |
| Constructor | `Object.create(Proto)` then assign fields; never `new` |
| Guard | `export const isX = (u: unknown): u is X<unknown> => hasProperty(u, TypeId)` |
| JSON | `toJSON()` returns `{ _id: "X", …fields }` (or a redacted placeholder) |
| Instances | `Equivalence`, `Order`, `makeEquivalence(itemEquivalence)` as values or constructors |

Why prototypes: shared methods live once per type (memory, speed), `Object.create` is fast,
values stay plain readonly data, structural equality is explicit, and `instanceof` across module
copies is avoided — guards check the TypeId property instead.

## Public helpers to build a prototype (third-party)

Effect's own modules spread internal helpers (`PipeInspectableProto`, `StructuralProto` from
`internal/core.ts`). Outside the `effect` package use only the public equivalents:

| Need | Public API |
| --- | --- |
| `pipe()` method | `Pipeable.Prototype` (or `pipeArguments(this, arguments)` from `effect/Pipeable`) |
| `toJSON`/`toString`/Node inspect defaults | `Inspectable.BaseProto`; `Inspectable.NodeInspectSymbol`; `Inspectable.toJson`; `Formatter.format` |
| hashing | `Hash.symbol`, `Hash.hash`, `Hash.combine`, `Hash.string`, `Hash.structure`, `Hash.optimize`, `Hash.random` |
| equality | `Equal.symbol`, `Equal.equals` |
| variance | `Covariant`, `Contravariant`, `Invariant` from `effect/Types` |
| guard | `hasProperty` from `effect/Predicate` |

## Complete example: a third-party data type

`src/Expiring.ts` — a value paired with an expiry instant. Everything a real module needs.

```ts
/**
 * Values that carry the instant after which they must no longer be used.
 *
 * An `Expiring<A>` pairs a value with an expiry `DateTime`. Use it for cached
 * credentials, signed links, and other data whose validity is bounded in time.
 * The module provides constructors, expiry checks against the Effect `Clock`,
 * mapping, and equivalence helpers.
 *
 * @stability experimental
 * @since 0.1.0
 */
import * as Clock from "effect/Clock"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Equ from "effect/Equivalence"
import { dual } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Inspectable from "effect/Inspectable"
import * as Pipeable from "effect/Pipeable"
import { hasProperty } from "effect/Predicate"
import type { Covariant } from "effect/Types"

const TypeId = "~@acme/kit/Expiring"

/**
 * A value that expires at a fixed instant.
 *
 * @stability experimental
 * @category models
 * @since 0.1.0
 */
export interface Expiring<out A> extends Expiring.Variance<A>, Equal.Equal, Pipeable.Pipeable, Inspectable.Inspectable {
  readonly value: A
  readonly expiresAt: DateTime.Utc
}

/**
 * Type-level helpers for `Expiring`.
 *
 * @stability experimental
 * @since 0.1.0
 */
export declare namespace Expiring {
  /**
   * Variance marker for `Expiring`.
   *
   * @category models
   * @since 0.1.0
   */
  export interface Variance<out A> {
    readonly [TypeId]: {
      readonly _A: Covariant<A>
    }
  }

  /**
   * Extracts the value type of an `Expiring`.
   *
   * @category utility types
   * @since 0.1.0
   */
  export type Value<T extends Expiring<any>> = [T] extends [Expiring<infer A>] ? A : never
}

/**
 * Checks whether a value is an `Expiring`.
 *
 * @stability experimental
 * @category guards
 * @since 0.1.0
 */
export const isExpiring = (u: unknown): u is Expiring<unknown> => hasProperty(u, TypeId)

const Proto = {
  ...Pipeable.Prototype,
  ...Inspectable.BaseProto,
  [TypeId]: {
    _A: (_: never) => _
  },
  toJSON<A>(this: Expiring<A>) {
    return {
      _id: "Expiring",
      value: Inspectable.toJson(this.value),
      expiresAt: DateTime.formatIso(this.expiresAt)
    }
  },
  [Hash.symbol]<A>(this: Expiring<A>): number {
    return Hash.optimize(Hash.combine(Hash.hash(this.value), Hash.hash(this.expiresAt)))
  },
  [Equal.symbol]<A>(this: Expiring<A>, that: unknown): boolean {
    return isExpiring(that) && Equal.equals(this.value, that.value) && Equal.equals(this.expiresAt, that.expiresAt)
  }
}

/**
 * Creates an `Expiring` from a value and its expiry instant.
 *
 * **Example** (Creating an expiring value)
 *
 * ```ts import.meta.vitest
 * import { DateTime } from "effect"
 * import { Expiring } from "@acme/kit"
 *
 * const token = Expiring.make("abc", DateTime.makeUnsafe("2030-01-01T00:00:00Z"))
 * token.value // => "abc"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 0.1.0
 */
export const make = <A>(value: A, expiresAt: DateTime.Utc): Expiring<A> => {
  const self = Object.create(Proto)
  self.value = value
  self.expiresAt = expiresAt
  return self
}

/**
 * Checks whether the value has expired at the current `Clock` time.
 *
 * **Gotchas**
 *
 * A value expires at `expiresAt` exactly, not one millisecond later.
 *
 * @stability experimental
 * @category predicates
 * @since 0.1.0
 */
export const isExpired = <A>(self: Expiring<A>): Effect.Effect<boolean> =>
  Effect.map(Clock.currentTimeMillis, (now) => now >= DateTime.toEpochMillis(self.expiresAt))

/**
 * Transforms the value while keeping the expiry instant.
 *
 * @stability experimental
 * @category mapping
 * @since 0.1.0
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Expiring<A>) => Expiring<B>
  <A, B>(self: Expiring<A>, f: (a: A) => B): Expiring<B>
} = dual(2, <A, B>(self: Expiring<A>, f: (a: A) => B): Expiring<B> => make(f(self.value), self.expiresAt))

/**
 * Creates an `Equivalence` for `Expiring` values from an equivalence for their
 * values.
 *
 * @stability experimental
 * @category instances
 * @since 0.1.0
 */
export const makeEquivalence = <A>(value: Equ.Equivalence<A>): Equ.Equivalence<Expiring<A>> =>
  Equ.make((x, y) => value(x.value, y.value) && DateTime.Equivalence(x.expiresAt, y.expiresAt))
```

The `Equivalence` module is imported as `Equ` so the module can export its own `Equivalence`
instance without a name clash (`Duration.ts`, `BigDecimal.ts`, `String.ts` do the same). The
same goes for modules that shadow globals: `Arr` (`effect/Array`), `Rec` (`effect/Record`),
`Str` (`effect/String`).

## Hidden state: prototype in the internal file

When a type stores representation that callers must not see (an index, a backing map), follow
`HashSet.ts` + `internal/hashSet.ts`:

```ts
// src/internal/tagSet.ts
/**
 * @since 0.1.0
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as HashSet from "effect/HashSet"
import * as Inspectable from "effect/Inspectable"
import * as Pipeable from "effect/Pipeable"
import { hasProperty } from "effect/Predicate"
import type * as TagSet from "../TagSet.ts"

/** @internal */
export const TypeId = "~@acme/tags/TagSet"

const Proto = {
  ...Pipeable.Prototype,
  ...Inspectable.BaseProto,
  [Hash.symbol](this: TagSet.TagSet): number {
    return Hash.hash(backing(this))
  },
  [Equal.symbol](this: TagSet.TagSet, that: unknown): boolean {
    return isTagSet(that) && Equal.equals(backing(this), backing(that))
  },
  toJSON(this: TagSet.TagSet) {
    return { _id: "TagSet", tags: Array.from(backing(this)) }
  }
}

const makeImpl = (tags: HashSet.HashSet<string>): TagSet.TagSet => {
  const self = Object.create(Proto)
  self[TypeId] = TypeId
  self.tags = tags
  return self
}

/** @internal */
export const backing = (self: TagSet.TagSet): HashSet.HashSet<string> => (self as any).tags

/** @internal */
export const isTagSet = (u: unknown): u is TagSet.TagSet => hasProperty(u, TypeId)

/** @internal */
export const add = (self: TagSet.TagSet, tag: string): TagSet.TagSet => makeImpl(HashSet.add(backing(self), tag))
```

```ts
// src/TagSet.ts (public file: interface, docs, dual wiring; TSDoc omitted here)
import type * as Equal from "effect/Equal"
import { dual } from "effect/Function"
import type * as Inspectable from "effect/Inspectable"
import type * as Pipeable from "effect/Pipeable"
import * as internal from "./internal/tagSet.ts"

const TypeId = internal.TypeId

export interface TagSet extends Equal.Equal, Pipeable.Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: typeof TypeId
}

export const isTagSet: (u: unknown) => u is TagSet = internal.isTagSet

export const add: {
  (tag: string): (self: TagSet) => TagSet
  (self: TagSet, tag: string): TagSet
} = dual<
  (tag: string) => (self: TagSet) => TagSet,
  (self: TagSet, tag: string) => TagSet
>(2, internal.add)
```

- Internal files start with a short header carrying only `@since` (`internal/hashSet.ts:1-3`).
- The hidden field is read through one internal accessor (`backing`), so the cast lives in one
  place and the public interface never mentions it.
- When the implementation lives elsewhere, pass both signatures to `dual` explicitly
  (`HashSet.ts`: `Dual.dual<DataLast, DataFirst>(2, internal.add)`); when it is written inline,
  annotate the export and let `dual(2, …)` infer.

Check every Effect API you use (here `DateTime.formatIso`, `DateTime.makeUnsafe`,
`DateTime.toEpochMillis`, `Hash.combine`'s arity, `Equivalence.make`) against the clone before
copying a pattern — this example shows the *shape*; the clone shows current signatures.

## Variations

- **Non-generic types** skip `Variance` and use `readonly [TypeId]: typeof TypeId` on the interface;
  the constructor sets `self[TypeId] = TypeId` (as `HashSet` does) or the prototype carries it.
- **Iterable collections** add `[Symbol.iterator]` to the prototype and extend `Iterable<A>`.
- **Tagged unions** (`Option`, `Result`, `Exit`) have one interface per case with a literal
  `_tag`, a union type, `isSome`/`isNone`-style guards, constructors per case (`some`, `none`,
  `succeed`, `fail`) and a `match({ onA, onB })` destructor.
- **Yieldable values** (usable with `yield*` in `Effect.gen`) implement `asEffect()` or extend
  Effect's yieldable bases; copy the exact mechanism from the analogue (`Option`, `Result`,
  `Context.Service`), do not reinvent it.
- **Schema-backed records** that must be encoded or validated are `Schema.Class` /
  `Schema.TaggedClass` instead of hand-written prototypes. Use a hand-written prototype for
  runtime-only values (compiled sets, handles, registries).
- **Secrets** are wrapped in `Redacted` rather than stored as strings.

## Immutability

- All public fields are `readonly`; operations return new values. Mutable internals (indexes,
  caches) live in non-enumerable or internal fields and are never typed as public mutable `Map`
  or `Set`.
- Mutable data types are separate modules with `Mutable` in the name (`MutableHashMap`,
  `MutableRef`) or transactional (`TxRef`).
