# Reference clone

Read the real Effect source before writing anything non-trivial. The installed
`node_modules/effect` contains `src/` and `ai-docs`, but not tests, type tests, tooling, configs
or the maintainers' agent skills, so keep a full clone too.

## Getting it

```sh
# shallow clone of Effect v4 (main); refresh before large work
git clone --depth 1 https://github.com/Effect-TS/effect.git ~/.cache/effect-reference
git -C ~/.cache/effect-reference pull --depth 1

# record what you compared against
git -C ~/.cache/effect-reference log -1 --format='%H %cd'
grep '"version"' ~/.cache/effect-reference/packages/effect/package.json
```

- Use `Effect-TS/effect` (`main` is v4, `v3` branch is Effect 3). `Effect-TS/effect-smol` is
  archived; do not use it.
- Treat the clone as read-only reference data: do not run its scripts, install it, or import from
  it. If you need to compare against the exact version a project depends on, check out the tag
  (`git fetch --depth 1 origin tag effect@4.1.5 && git checkout effect@4.1.5`).
- Inside a project that keeps local research folders, a clone under the ignored research folder
  works too; never commit it.

## Map of the repository

```text
.agents/AGENTS.md                maintainers' agent rules: validation table, generated files
.agents/skills/                  maintainers' skills: jsdocs, test-development, package-development,
                                 changesets, performance-analysis, effect-development, …
ai-docs/src/                     curated, runnable usage docs (source of LLMS.md)
LLMS.md                          generated from ai-docs/src
MIGRATION.md, migration/         v3 → v4 migration notes
packages/effect/src/             the core library — the main style reference
packages/effect/src/internal/    implementation details (never import from here)
packages/effect/src/<area>/      subpath families: http, http-api, sql, crypto, schema, testing, …
packages/effect/test/            runtime tests (@effect/vitest)
packages/effect/typetest/        type tests (tstyche, *.tst.ts)
packages/effect/typeperf/        compiler-cost benchmarks
packages/opentelemetry/          a small satellite package: best template for a third-party package
packages/vitest/                 @effect/vitest itself (src/index.ts, src/utils.ts)
packages/tools/doctest/          @effect/doctest (README documents the example syntax)
packages/tools/oxc/              lint preset and custom oxlint rules
packages/tools/utils/            barrel codegen (effect-utils codegen)
packages/tools/jsdocs/           TSDoc convention checker (effect-jsdocs)
dprint.json, .oxlintrc.json      formatting and lint config
tsconfig.base.json               compiler options + language-service plugin config
vitest.config.ts, vitest.docs.ts test and doctest configuration
tstyche.json                     type-test configuration
.changeset/                      changesets and release config
```

## How to look things up

```sh
R=~/.cache/effect-reference/packages/effect

# all exports of a module, names only
grep -oE '^export (declare )?(const|function|interface|class|type|namespace) [A-Za-z_]+' $R/src/HashSet.ts

# the code of a module without its doc comments
grep -v '^\s*\*\|^\s*/\*\*' $R/src/Redacted.ts | grep -v '^\s*$'

# how a name is used across the codebase (conventions by count)
grep -rhoE 'export const \w*Unsafe\b' $R/src | wc -l      # 177 → suffix convention
grep -rhoE 'export const unsafe[A-Z]\w*' $R/src | wc -l   # 2   → legacy prefix, do not copy

# every dual with an argument predicate
grep -rn 'dual((args' $R/src

# tests and type tests for a module
ls $R/test | grep -i hashset; ls $R/typetest | grep -i option

# maintainers' rules on a topic
grep -rn "stability" ~/.cache/effect-reference/.agents/skills/jsdocs
```

When two patterns coexist, prefer the one used by recently touched modules and by the
maintainers' `.agents/skills`, and count occurrences rather than trusting a single file. Some old
files keep legacy style (for example plain `expect` in a few tests).

## What not to copy

- Anything under `src/internal/` is private to Effect. Third-party packages use public modules
  only: `Pipeable.Prototype` instead of `PipeInspectableProto`, `Inspectable.BaseProto`,
  `Hash.*`, `Equal.*`, `Predicate.hasProperty`.
- Effect-internal relative imports (`import * as Effect from "./Effect.ts"`) become package
  imports in your package (`import * as Effect from "effect/Effect"`).
- `@since` versions: use your package's versions, never Effect's.
- Service and TypeId keys: use your package name, never `effect/...`.
- Repository-specific infrastructure (release bots, website dispatch, AI-docs copying) unless you
  deliberately adopt it.
