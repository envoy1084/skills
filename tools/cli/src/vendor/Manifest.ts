import { Array as Arr, Effect, FileSystem, Path, Schema } from "effect";

import { SetupError } from "../errors.ts";

/** One external repository and the skills taken from it, as listed in `vendor/vendor.json`. */
export const Collection = Schema.Struct({
  name: Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  repo: Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/)),
  commit: Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/)),
  path: Schema.String,
  skills: Schema.Array(Schema.String),
  description: Schema.String,
});
export type Collection = typeof Collection.Type;

const VendorManifest = Schema.fromJsonString(
  Schema.Struct({
    $comment: Schema.optionalKey(Schema.String),
    collections: Schema.Array(Collection),
  }),
);

/** A plugin entry of `.claude-plugin/marketplace.json`. */
export const Plugin = Schema.Struct({
  name: Schema.String,
  source: Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.String)]),
  description: Schema.optionalKey(Schema.String),
});
export type Plugin = typeof Plugin.Type;

/** `.claude-plugin/marketplace.json`, read by Claude Code and by `npx skills add`. */
export const Marketplace = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.String,
    owner: Schema.Struct({ name: Schema.String }),
    description: Schema.optionalKey(Schema.String),
    plugins: Schema.Array(Plugin),
  }),
);
export type Marketplace = typeof Marketplace.Type;

/** Paths of the files this tooling reads and writes, from the repository root. */
export const paths = Effect.fnUntraced(function* (root: string) {
  const path = yield* Path.Path;
  return {
    root,
    skills: path.join(root, "skills"),
    vendor: path.join(root, "vendor"),
    manifest: path.join(root, "vendor/vendor.json"),
    marketplace: path.join(root, ".claude-plugin/marketplace.json"),
    ignore: path.join(root, ".agents/skills/sync-skills/ignore.json"),
    agents: path.join(root, "global/AGENTS.md"),
  };
});

const decode = Effect.fnUntraced(function* <S extends Schema.Top>(file: string, schema: S) {
  const fs = yield* FileSystem.FileSystem;
  return yield* fs.readFileString(file).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError((cause) => SetupError.make({ message: `${file}: ${String(cause)}` })),
  );
});

const repeated = (values: readonly string[]) =>
  Arr.dedupe(Arr.filter(values, (value, index) => values.indexOf(value) !== index));

/** Reads `vendor/vendor.json` and rejects duplicate collections or skill names. */
export const readCollections = Effect.fnUntraced(function* (
  manifestFile: string,
  ownSkills: readonly string[],
) {
  const { collections } = yield* decode(manifestFile, VendorManifest);

  const duplicates = [
    ...repeated(Arr.map(collections, (collection) => collection.name)),
    ...repeated([...ownSkills, ...Arr.flatMap(collections, (collection) => collection.skills)]),
  ];
  if (Arr.isReadonlyArrayNonEmpty(duplicates)) {
    return yield* SetupError.make({
      message: `${manifestFile}: collection names, and skill names across collections and skills/, must be unique: ${Arr.join(duplicates, ", ")}`,
    });
  }
  return collections;
});

/** Reads `.claude-plugin/marketplace.json`. */
export const readMarketplace = (file: string) => decode(file, Marketplace);
