import {
  Array as Arr,
  Console,
  Effect,
  FileSystem,
  Formatter,
  Order,
  Path,
  String as Str,
} from "effect";
import { Command, Flag } from "effect/cli";
import { HttpClient, HttpClientResponse } from "effect/http";

import { CheckFailed, SetupError, ToolFailed } from "../errors.ts";
import { Tools } from "../services/Tools.ts";
import { paths, readCollections, readMarketplace, type Collection } from "../vendor/Manifest.ts";

const listFiles = Effect.fnUntraced(function* (dir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fs.readDirectory(dir, { recursive: true });
  const files: string[] = [];
  for (const entry of entries) {
    const info = yield* fs.stat(path.join(dir, entry));
    if (info.type === "File") files.push(entry);
  }
  return Arr.sort(files, Order.String);
});

const sameTree = Effect.fnUntraced(function* (a: string, b: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  if (!(yield* fs.exists(a)) || !(yield* fs.exists(b))) return false;

  const files = yield* listFiles(a);
  const other = yield* listFiles(b);
  if (Arr.join(files, "\n") !== Arr.join(other, "\n")) return false;

  for (const file of files) {
    const left = yield* fs.readFile(path.join(a, file));
    const right = yield* fs.readFile(path.join(b, file));
    if (Buffer.compare(left, right) !== 0) return false;
  }
  return true;
});

const download = Effect.fn("sync.download")(function* (url: string, file: string) {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* HttpClient.get(url).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.mapError((cause) => ToolFailed.make({ tool: `download ${url}`, output: String(cause) })),
  );
  yield* fs.writeFile(file, new Uint8Array(bytes));
});

const sourceNote = (collection: Collection) =>
  Arr.join(
    [
      `# ${collection.name}`,
      "",
      `Copied unchanged from [${collection.repo}](https://github.com/${collection.repo}/tree/${collection.commit}/${collection.path}) at commit \`${collection.commit}\`, under`,
      "the license in [LICENSE](LICENSE). Do not edit these files: change `vendor/vendor.json` and run",
      "`pnpm sync`.",
      "",
      ...Arr.map(collection.skills, (skill) => `- \`${skill}\``),
      "",
    ],
    "\n",
  );

const stage = Effect.fn("sync.stage")(function* (collection: Collection, work: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const tools = yield* Tools;
  const archive = path.join(work, `${collection.name}.tar.gz`);
  const source = path.join(work, `${collection.name}-source`);
  const staged = path.join(work, collection.name);

  yield* download(
    `https://codeload.github.com/${collection.repo}/tar.gz/${collection.commit}`,
    archive,
  );
  yield* fs.makeDirectory(source, { recursive: true });
  yield* tools.run("tar", ["-xzf", archive, "-C", source, "--strip-components", "1"]);

  for (const skill of collection.skills) {
    const from = path.join(source, collection.path, skill);
    if (!(yield* fs.exists(path.join(from, "SKILL.md")))) {
      return yield* SetupError.make({
        message: `${collection.name}: ${collection.repo}@${Str.slice(0, 12)(collection.commit)} has no ${collection.path}/${skill}/SKILL.md`,
      });
    }
    yield* fs.makeDirectory(path.join(staged, "skills"), { recursive: true });
    yield* fs.copy(from, path.join(staged, "skills", skill));
  }

  const files = yield* fs.readDirectory(source);
  const license = Arr.findFirst(files, (file) =>
    /^(LICENSE|LICENCE|COPYING)(\.md|\.txt)?$/i.test(file),
  );
  if (license._tag === "None") {
    return yield* SetupError.make({
      message: `${collection.name}: ${collection.repo} has no LICENSE; do not vendor it`,
    });
  }
  yield* fs.copyFile(path.join(source, license.value), path.join(staged, "LICENSE"));
  yield* fs.writeFileString(path.join(staged, "SOURCE.md"), sourceNote(collection));
  return staged;
});

/**
 * Copies the skills listed in `vendor/vendor.json` into `vendor/<collection>/skills` exactly as they
 * are at the pinned commit, with the upstream LICENSE and a SOURCE.md, then points the marketplace's
 * external plugins at those folders. With `check`, changes nothing and fails when anything differs.
 */
export const sync = Effect.fn("sync")(
  function* (check: boolean) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const files = yield* paths(path.resolve("."));

    const ownSkills = yield* fs.readDirectory(files.skills);
    const collections = yield* readCollections(files.manifest, ownSkills);
    const work = yield* fs.makeTempDirectoryScoped({ prefix: "skills-sync-" });
    const changed: string[] = [];

    for (const collection of collections) {
      const staged = yield* stage(collection, work);
      const target = path.join(files.vendor, collection.name);
      if (yield* sameTree(staged, target)) continue;

      changed.push(`vendor/${collection.name}`);
      if (check) continue;
      yield* fs.remove(target, { recursive: true, force: true });
      yield* fs.copy(staged, target);
    }

    const listed = new Set(Arr.map(collections, (collection) => collection.name));
    for (const entry of yield* fs.readDirectoryEntries(files.vendor)) {
      if (entry.type !== "Directory" || listed.has(entry.name)) continue;
      changed.push(`vendor/${entry.name} (removed)`);
      if (!check)
        yield* fs.remove(path.join(files.vendor, entry.name), { recursive: true, force: true });
    }

    const marketplace = yield* readMarketplace(files.marketplace);
    const next = {
      ...marketplace,
      plugins: [
        ...Arr.filter(marketplace.plugins, (plugin) => plugin.source === "./"),
        ...Arr.map(collections, (collection) => ({
          name: collection.name,
          source: `./vendor/${collection.name}`,
          description: collection.description,
        })),
      ],
    };
    const formatted = `${Formatter.formatJson(next, { space: 2 })}\n`;
    if (formatted !== (yield* fs.readFileString(files.marketplace))) {
      changed.push(".claude-plugin/marketplace.json");
      if (!check) yield* fs.writeFileString(files.marketplace, formatted);
    }

    if (check && Arr.isReadonlyArrayNonEmpty(changed)) {
      return yield* CheckFailed.make({
        check: "sync",
        problems: [...changed, "Run pnpm sync to update them."],
      });
    }
    return yield* Console.log(
      Arr.isReadonlyArrayNonEmpty(changed)
        ? `sync: updated ${Arr.join(changed, ", ")}`
        : "sync: up to date",
    );
  },
  Effect.scoped,
  Effect.catchTag("PlatformError", (cause) => SetupError.make({ message: String(cause) })),
);

export const syncCommand = Command.make(
  "sync",
  {
    check: Flag.Boolean("check").pipe(
      Flag.withDefault(false),
      Flag.withDescription(
        "Fail instead of writing when vendor/ or the marketplace is out of date",
      ),
    ),
  },
  ({ check }) => sync(check),
).pipe(Command.withDescription("Vendor the external skills listed in vendor/vendor.json"));
