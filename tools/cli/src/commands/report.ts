import {
  Array as Arr,
  Config,
  Console,
  Effect,
  FileSystem,
  Formatter,
  Option,
  Order,
  Path,
  Schema,
  String as Str,
} from "effect";
import { Command, Flag } from "effect/cli";

import { SetupError } from "../errors.ts";
import { paths, readCollections } from "../vendor/Manifest.ts";

const SkillLock = Schema.fromJsonString(
  Schema.Struct({
    skills: Schema.Record(
      Schema.String,
      Schema.Struct({
        source: Schema.String,
        sourceType: Schema.String,
        commit: Schema.optionalKey(Schema.String),
        skillPath: Schema.optionalKey(Schema.String),
      }),
    ),
  }),
);

const IgnoreList = Schema.fromJsonString(Schema.Array(Schema.String));

const self = "envoy1084/skills";

const section = (title: string, rows: readonly string[]) =>
  Console.log(
    Arr.join([`\n${title} (${rows.length})`, ...Arr.map(rows, (row) => `  ${row}`)], "\n"),
  );

const readOr = Effect.fnUntraced(function* <S extends Schema.Top>(
  file: string,
  schema: S,
  fallback: S["Type"],
) {
  const fs = yield* FileSystem.FileSystem;
  if (!(yield* fs.exists(file))) return fallback;
  return yield* fs.readFileString(file).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError((cause) => SetupError.make({ message: `${file}: ${String(cause)}` })),
  );
});

const installedSkills = Effect.fnUntraced(function* (home: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const installed = new Map<string, string>();

  for (const root of [path.join(home, ".agents/skills"), path.join(home, ".claude/skills")]) {
    if (!(yield* fs.exists(root))) continue;
    for (const name of yield* fs.readDirectory(root)) {
      if (Str.startsWith(".")(name) || name === "synced" || installed.has(name)) continue;
      const real = yield* fs.realPath(path.join(root, name)).pipe(Effect.option);
      if (Option.isNone(real) || !(yield* fs.exists(path.join(real.value, "SKILL.md")))) continue;
      installed.set(name, real.value);
    }
  }
  return installed;
});

const linksTo = Effect.fnUntraced(function* (link: string, target: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fs
    .readDirectoryEntries(path.dirname(link))
    .pipe(Effect.orElseSucceed(() => []));
  const entry = Arr.findFirst(entries, (candidate) => candidate.name === path.basename(link));
  if (Option.isNone(entry) || entry.value.type !== "SymbolicLink") return false;
  const resolved = yield* fs.realPath(link).pipe(Effect.option);
  const expected = yield* fs.realPath(target).pipe(Effect.option);
  return Option.isSome(resolved) && Option.isSome(expected) && resolved.value === expected.value;
});

/**
 * Compares the skills installed globally on this machine (`~/.agents/skills`, `~/.claude/skills`
 * and the `npx skills` lock) and `~/.codex/AGENTS.md` with `vendor/vendor.json`, `skills/` and
 * `global/AGENTS.md`. Read-only.
 */
export const report = Effect.fn("report")(
  function* (json: boolean) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const files = yield* paths(path.resolve("."));
    const home = yield* Config.String("HOME");

    const skillFolders = yield* fs.readDirectory(files.skills);
    const ownSkills = new Set(skillFolders);
    const collections = yield* readCollections(files.manifest, skillFolders);
    const { skills: lock } = yield* readOr(path.join(home, ".agents/.skill-lock.json"), SkillLock, {
      skills: {},
    });
    const ignoreList = yield* readOr(files.ignore, IgnoreList, []);
    const ignored = new Set(ignoreList);
    const installed = yield* installedSkills(home);
    const vendored = new Map(
      Arr.flatMap(collections, (collection) =>
        Arr.map(collection.skills, (skill) => [skill, collection] as const),
      ),
    );

    const toAdd = [];
    const commitChanged = [];
    const untracked = [];
    for (const name of Arr.sort([...installed.keys()], Order.String)) {
      const location = installed.get(name) ?? "";
      if (ignored.has(name) || ownSkills.has(name) || vendored.has(name)) {
        const collection = vendored.get(name);
        const commit = lock[name]?.commit;
        if (collection !== undefined && commit !== undefined && commit !== collection.commit) {
          commitChanged.push({
            name,
            collection: collection.name,
            vendored: collection.commit,
            installed: commit,
          });
        }
        continue;
      }
      const entry = lock[name];
      if (entry === undefined) {
        untracked.push({ name, location });
        continue;
      }
      if (entry.source === self) continue;

      const skillDir = path.dirname(entry.skillPath ?? `skills/${name}/SKILL.md`);
      const container = path.dirname(skillDir);
      toAdd.push({
        name,
        repo: entry.source,
        commit: entry.commit ?? null,
        path: container === "." ? "" : container,
        collection: Arr.findFirst(
          collections,
          (collection) => collection.repo === entry.source,
        ).pipe(
          Option.map((collection) => collection.name),
          Option.getOrNull,
        ),
      });
    }

    const notInstalled = Arr.filter(
      [...vendored.keys(), ...ownSkills],
      (name) => !installed.has(name) && !ignored.has(name),
    );
    const codexAgents = path.join(home, ".codex/AGENTS.md");
    const codex = yield* fs.readFileString(codexAgents).pipe(Effect.option);
    const backup = yield* fs.readFileString(files.agents).pipe(Effect.option);
    const agentsMd = {
      backupMatches: Option.isSome(codex) && Option.isSome(backup) && codex.value === backup.value,
      claudeLinked: yield* linksTo(path.join(home, ".claude/CLAUDE.md"), codexAgents),
    };

    if (json) {
      return yield* Console.log(
        Formatter.formatJson(
          { toAdd, commitChanged, untracked, notInstalled, agentsMd },
          { space: 2 },
        ),
      );
    }

    yield* section(
      "Installed globally, not vendored: add to vendor/vendor.json",
      Arr.map(
        toAdd,
        (item) =>
          `${item.name}  ${item.repo}@${item.commit ?? "no commit"}  path=${item.path || "."}  -> ${item.collection ?? "new collection"}`,
      ),
    );
    yield* section(
      "Installed at a different commit than vendored",
      Arr.map(
        commitChanged,
        (item) =>
          `${item.name}  ${item.collection}: vendored ${Str.slice(0, 12)(item.vendored)}, installed ${Str.slice(0, 12)(item.installed)}`,
      ),
    );
    yield* section(
      "Installed with no recorded source: copy into skills/ or add to ignore.json",
      Arr.map(untracked, (item) => `${item.name}  ${item.location}`),
    );
    yield* section("In this repository, not installed globally", notInstalled);
    return yield* Console.log(
      Arr.join(
        [
          "\nGlobal instructions",
          `  ~/.codex/AGENTS.md ${agentsMd.backupMatches ? "matches" : "DIFFERS from"} global/AGENTS.md`,
          `  ~/.claude/CLAUDE.md ${agentsMd.claudeLinked ? "links to" : "is NOT linked to"} ~/.codex/AGENTS.md`,
        ],
        "\n",
      ),
    );
  },
  Effect.catchTag("PlatformError", (cause) => SetupError.make({ message: String(cause) })),
);

export const reportCommand = Command.make(
  "report",
  {
    json: Flag.Boolean("json").pipe(
      Flag.withDefault(false),
      Flag.withDescription("Print the report as JSON"),
    ),
  },
  ({ json }) => report(json),
).pipe(
  Command.withDescription("Compare globally installed skills and AGENTS.md with this repository"),
);
