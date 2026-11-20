---
name: jsdocs
description: Public API TSDoc in the Effect library's format. Use when adding or changing an exported declaration of a published package, writing module documentation, or reviewing API docs.
---

These conventions are for pnpm + Turborepo + Effect v4 workspaces. When the repository's own
`AGENTS.md` or neighbouring code says otherwise, follow the repository.

## Workflow

1. Inspect the declaration, implementation, nearby TSDoc, tests and call sites.
2. Write or update the block using the shapes below. Preserve verified facts and useful examples
   instead of rewriting mechanically.
3. Check every example compiles against the public API and shows the real result.
4. Run `pnpm check`.

Declarations under `src/internal/` and anything marked `@internal` are outside public TSDoc.

## Declaration shape

````ts
/**
 * Creates a slug from free text: removes accents, lowercases, and joins the remaining runs of
 * letters and digits with hyphens.
 *
 * **When to use**
 *
 * Use when turning user-entered titles into URL paths.
 *
 * **Details**
 *
 * Optional details for complex behaviour.
 *
 * **Gotchas**
 *
 * Letters with no accent-free ASCII form, such as `ß`, are dropped.
 *
 * **Example** (Creating a slug from a title)
 *
 * ```ts
 * import { Slug } from "@scope/core"
 * import { Effect } from "effect"
 *
 * const slug = await Effect.runPromise(Slug.make("Crème Brûlée"))
 * // => "creme-brulee"
 * ```
 *
 * @see {@link Slug} for validating existing slugs
 * @stability stable
 * @category constructors
 * @since 0.1.0
 */
````

- One self-contained description paragraph. Functions start with a present-tense verb (`Creates`,
  `Returns`, `Converts`); values with a noun phrase (`Schema for`, `Layer that`, `Service that`).
- Optional sections appear once, in this order: `**When to use**`, `**Details**`, `**Gotchas**`.
  `**When to use**` starts with `Use to`, `Use when`, `Use as` or `Use with`. `**Gotchas**` holds
  only concrete caveats and failure modes.
- Separate description, sections, examples and tags with one blank line. No other headings.

## Tags, in this order

1. `@deprecated` (with what to use instead)
2. `@default` (members only)
3. `@see` (verified related public APIs only)
4. `@stability` — `stable`, `unstable` (may break in minors) or `experimental` (may break in
   patches). Tag an API `unstable` when it exposes a third-party dependency's types.
5. `@category` — one, lowercase plural or gerund, reused from neighbours: `constructors`, `models`,
   `schemas`, `guards`, `getters`, `errors`, `services`, `layers`, `combinators`, `mapping`,
   `filtering`, `utility types`.
6. `@since` — the first release that ships the API. For a new API, the package's next version per
   the changeset bump (a `minor` after `0.1.0` is `0.2.0`). Never change an existing `@since`.

## Modules

Module documentation goes on the `export * as X from "./X.ts"` in `index.ts`: a short paragraph,
then `@stability` and `@since`. Module files have no leading comment block, and non-exported
declarations get no TSDoc: landmines' `no-comments` rule allows TSDoc on exported symbols only.

## Examples

- Optional. Add one only for behaviour the signature does not show, meaningful composition, or
  inference worth seeing. Remove trivial or contrived ones.
- Title each `**Example** (Unique use case)`, one `ts` fence, public imports only, and show results
  as `// => value` comments.
- Use `Effect.runPromise` to show results; `Effect.runSync` only when synchronous execution is the
  documented contract.
- Use `{@link Symbol}` only for TypeScript symbols; use Markdown links for URLs.
