# TSDoc

Source: the maintainers' `jsdocs` skill (`.agents/skills/jsdocs/{SKILL,declarations,categories,examples}.md`)
and `packages/tools/doctest/README.md` in the clone. Read them when in doubt; they are checked by
`pnpm jsdocs --check` (the private `@effect/jsdocs` tool) and `pnpm doctest`.

## What gets documented

- Every module file: a module block at the top (see [modules.md](modules.md)).
- Every public root declaration (exported const, function, class, interface, type, namespace).
- Members (interface fields, service methods, namespace members): optional; when present they
  follow the prose contract, may have `@since` and `@default`, never `@category`.
- `@internal` declarations and default exports are outside public docs. Exported enums and empty
  export declarations are not supported at all.

## Declaration shape

````ts
/**
 * Creates a `Redacted` wrapper for a sensitive value.
 *
 * **When to use**
 *
 * Use to wrap a sensitive value so normal string, JSON, and inspection output
 * is redacted.
 *
 * **Details**
 *
 * The wrapper redacts string, JSON, and inspection output to reduce accidental
 * disclosure. The original value remains retrievable with `Redacted.value`
 * until the wrapper is wiped or becomes unreachable.
 *
 * **Gotchas**
 *
 * Wrapping does not encrypt; anyone holding the wrapper can recover the value.
 *
 * **Example** (Creating a redacted value)
 *
 * ```ts import.meta.vitest
 * import { Redacted } from "effect"
 *
 * const API_KEY = Redacted.make("1234567890")
 * String(API_KEY) // => "<redacted>"
 * ```
 *
 * @see {@link value} for recovering the wrapped value
 * @stability stable
 * @category constructors
 * @since 3.3.0
 */
export const make = <T>(value: T, options?: { readonly label?: string | undefined }): Redacted<T> => …
````

### Prose

- **Description**: exactly one self-contained, practical paragraph about the public concept, not
  the implementation. Functions and methods start with a present-tense verb (`Creates`, `Returns`,
  `Converts`, `Checks`); values use the noun family of their neighbours (`Schema for`,
  `Layer that`, `Service that`, `A wrapper for`).
- **Sections**, each optional, non-empty, at most once, in this order:
  1. `**When to use**`: a positive use case distinct from the description, starting with
     `Use to`, `Use when`, `Use as` or `Use with`.
  2. `**Details**`: behaviour that is not obvious from the signature.
  3. `**Gotchas**`: concrete preconditions, edge cases, surprising behaviour, failure modes only.
- One blank line between description, sections, examples and tags. No other headings.
- Prose for one fact, bullets for parallel facts.
- Sibling comparisons go in `@see`, not in prose.

### Tags, in this order

1. `@deprecated` — non-empty, says what to use instead
2. `@default` — members only
3. `@see` — repeatable; only verified related **public** APIs: close alternative, inverse,
   complement, level variant, or a type it returns/consumes/configures. Explain non-obvious links
   (`@see {@link value} for recovering the wrapped value`).
4. `@stability` — required on roots, export specifiers and root namespaces
5. `@category` — exactly one on roots
6. `@since` — required, stable semver

### `@stability`

| Value | Meaning | Semver policy |
| --- | --- | --- |
| `stable` | normal compatibility | breaks only in majors |
| `unstable` | may break in minor releases | breaks are `minor`; fixes and features `patch` |
| `experimental` | may break in any release | everything is `patch` |

Tag `unstable` anything exposing a third-party dependency: accessors to its client, options typed
as its options, constructors taking its instances, re-exports, signatures mentioning its types.
Tag the whole module if it exists to wrap the dependency. Runtime built-ins (Node, Bun, Deno, DOM)
and framework types inherent to a binding (React in a React package) are exempt.

How upstream uses the levels (module blocks, `packages/effect/src` at 4.1.5): 121 root modules
`stable`, 22 `unstable`, only 3 `experimental` (`Codegen`, `Glob`, `TextDiff`); whole families
(`sql`, `http`, `http-api`, `rpc`, `workflow`) are `unstable`. `experimental` is the exception,
not the default for new work.

For a **0.x package**, tag modules `unstable`, not `experimental`. Under `experimental` every
change, breaking or not, is a `patch` bump, so consumers on `^0.1.0` receive breaking changes;
under `unstable` a break is a `minor` bump, which `^0.1.0` does not cross. Move modules to
`stable` deliberately when the API is settled.

### `@since`

- New API: the **first release that will ship it**, derived from the package's current version and
  the planned changeset bump (new API after `0.3.1` in a `minor` → `0.4.0`; in a patch → `0.3.2`).
  Do not copy neighbours' versions or default to `x.0.0`.
- Existing API: never change its `@since`, except to correct it with evidence.
- The checker validates syntax only; verify the version yourself.

### `@category`

Reuse neighbours' categories; lowercase plurals and gerunds. The checker only requires a
non-empty value, so consistency comes from copying the analogue. Most used in `packages/effect/src`
(4.1.5): `models` 1997, `constructors` 1300, `schemas` 619, `utility types` 523, `combinators` 460,
`guards` 330, `services` 275, `errors` 252, `layers` 231, `getters` 213, `predicates` 190,
`transforming` 176, `converting` 176, `mutations` 146 (e.g. `HashSet.add`), `filtering` 134,
`type IDs` 131. The maintainers' list:

- Shapes: `constructors`, `destructors`, `models`, `schemas`, `guards`, `predicates`, `getters`,
  `accessors`, `instances`, `constants`, `protocols`, `prototypes`, `re-exports`, `unsafe`, `testing`
- Updates: `mutations` (returning an updated copy: `add`, `remove`, `set`)
- Effect: `services`, `tags`, `layers`, `context`, `resource management`, `running`, `errors`,
  `error handling`
- Operations: `combinators`, `filtering`, `mapping`, `sequencing`, `zipping`, `combining`,
  `merging`, `converting`, `transforming`, `folding`, `splitting`, `repetition`
- Shared: `utility types`, `encoding`, `decoding`, `serialization`, `tracing`, `metrics`,
  `logging`, `annotations`, `references`, `symbols`, `type IDs`, `configuration`, `math`,
  `comparisons`, `ordering`

Also used across the packages (counts over all `packages/*`): `validation` 128, `hooks` 27,
`pattern matching` 23, `middleware` 19, `components` 2. Do not invent categories that have no
upstream use (`evaluating`, `checks`, `http`, `policies`): pick the closest listed one
(`combinators`, `predicates`, `constructors`, `middleware`, `annotations`).

Boundaries: services are contracts, tags identify services, layers provide them; getters
retrieve values, accessors read context; errors model failures, error handling recovers; models
are domain data, utility types are type-level contracts; guards narrow, predicates return booleans.

### Links

- `{@link Symbol}` only for TypeScript symbols that resolve; Markdown links for URLs.
- Prefer code formatting (`` `Redacted.value` ``) when navigation does not help.

## Examples

Examples are optional. Keep one only for behaviour not evident from the signature, meaningful
composition, or useful inference. Remove trivial, contrived or scaffolding-heavy ones.

- Heading `**Example** (Unique use-case title)`; titles unique within the block after
  lowercasing. Optional prose, then **exactly one** non-empty `ts` fence.
- Runnable fences are tagged ` ```ts import.meta.vitest ` (optionally `name="…"`). `@effect/doctest`
  runs each as an isolated Vitest module.
- **Inline assertions**: a trailing `// => expected` compares with `Equal.equals`, so
  `Option.some(2)`, arrays, plain objects and Effect data types work:

  ```ts
  Array.get([1, 2, 3], 1) // => Option.some(2)
  const result = await Effect.runPromise(Effect.succeed(Option.some(1))) // => Option.some(1)
  ```

  Markers trail a complete expression statement or a single `const` with an identifier binding
  (no destructuring, `let`, `var`, or standalone markers).
- Nothing runs implicitly: write `await Effect.runPromise(...)` (prefer it) or `Effect.runSync`
  only when synchronous execution is the documented contract.
- Use public imports only (`import { Redacted } from "effect"`, your package's barrel), arrange
  nontrivial examples as setup → operation → observation, and prefer asserting the call directly
  over a binding used once. Keep call + assertion on one line within 120 columns; format expected
  arrays densely (`[1, 2]`).
- Type-level examples keep the runnable marker but add no tautological runtime assertions.
- Examples that register tests, or are intentionally not executable, use a plain ` ```ts ` fence.
- Concurrency examples use `Ref`, `Deferred` or `Queue`, not mutable probes.
- Never the `@example` tag or loose fences outside an `**Example**` section.
- If writing an example reveals a bug, report it; do not change runtime code in a docs-only pass.

## Namespaces and members

```ts
/**
 * Type-level helpers for `Redacted`.
 *
 * @stability stable
 * @since 3.3.0
 */
export declare namespace Redacted {
  /**
   * Extracts the wrapped value type of a `Redacted`.
   *
   * @stability stable
   * @category utility types
   * @since 3.3.0
   */
  export type Value<T extends Redacted<any>> = [T] extends [Redacted<infer _A>] ? _A : never
}
```

Namespaces require `@since`, permit `@category`, reject `@default`.

## Guides (`ai-docs`) and long-form docs

Effect's prose documentation lives beside the code, not in TSDoc:

- `ai-docs/src/`: numbered folders (`01_effect/`, `03_stream/`, `40_sql/`), each with an `index.md`
  intro and runnable example files. Example files use numeric prefixes `10_`, `20_` (never a
  leading `0` unless asked) and start with a JSDoc block carrying `@title` and an optional
  description; `fixtures/` folders are ignored. Examples are heavily commented (how and why).
  Rules: `ai-docs/README.md` and `.agents/skills/ai-docs` in the clone.
- `pnpm ai-docgen` builds the root `LLMS.md` from them (generated, never edited; CI checks it is
  current). `ai-docs` is type-checked, not doctested.
- Long-form guides for large topics sit in the package root (`packages/effect/SCHEMA.md`,
  `HTTPAPI.md`, `CONFIG.md`), are linked from the matching `ai-docs` `index.md`, and are not
  shipped in `files`.
- The API reference is generated from TSDoc only (see [tooling.md](tooling.md), API reference
  pipeline), which is why every public export needs complete TSDoc.

## Validation

| Change | Commands |
| --- | --- |
| text, category, link | `pnpm jsdocs --check`, `pnpm lint` |
| examples | the above plus `pnpm doctest --run <files>` |

Outside the Effect repo, `@effect/doctest` is on npm; `@effect/jsdocs` is private, so either vendor
it (MIT) or review these rules manually.
