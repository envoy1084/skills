#!/usr/bin/env node
// Compares the skills and agent instructions installed globally on this machine with what this
// repository installs. Read-only: prints what differs, the sync-skills skill decides what to change.
//
//   node .agents/skills/sync-skills/scripts/report.mjs [--json]
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const home = homedir();
const self = "envoy1084/skills";

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);
const realpath = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
};

const lock = readJson(join(home, ".agents/.skill-lock.json"), { skills: {} }).skills;
const marketplace = readJson(join(repo, ".claude-plugin/marketplace.json"), { plugins: [] });
const ignored = new Set(readJson(join(repo, ".agents/skills/sync-skills/ignore.json"), []));
const ownSkills = new Set(readdirSync(join(repo, "skills")).filter((name) => existsSync(join(repo, "skills", name, "SKILL.md"))));

// Every skill folder an agent loads globally, by name. Claude's `synced` folder holds skills the
// Claude apps manage, and dot-folders are not skills.
const installed = new Map();
for (const root of [join(home, ".agents/skills"), join(home, ".claude/skills")]) {
  if (!existsSync(root)) continue;
  for (const name of readdirSync(root)) {
    if (name.startsWith(".") || name === "synced") continue;
    const path = realpath(join(root, name));
    if (path === undefined || !existsSync(join(path, "SKILL.md"))) continue;
    if (!installed.has(name)) installed.set(name, path);
  }
}

const listed = new Map();
for (const plugin of marketplace.plugins) {
  if (typeof plugin.source === "string") continue;
  for (const skill of plugin.skills ?? []) listed.set(skill.replace(/^\.\//, ""), plugin);
}

const report = {
  toAdd: [],
  commitChanged: [],
  untracked: [],
  listedNotInstalled: [],
  ownNotInstalled: [],
  agentsMd: {},
};

for (const [name, path] of [...installed].sort(([a], [b]) => a.localeCompare(b))) {
  if (ignored.has(name) || ownSkills.has(name) || path.startsWith(`${repo}/`)) continue;

  const entry = lock[name];
  if (entry === undefined || entry.source === self) {
    if (entry === undefined) report.untracked.push({ name, path });
    continue;
  }

  const skillDir = dirname(entry.skillPath ?? `skills/${name}/SKILL.md`);
  const finding = {
    name,
    source: entry.source,
    sourceType: entry.sourceType,
    commit: entry.commit ?? null,
    path: dirname(skillDir) === "." ? "" : dirname(skillDir),
    skill: `./${skillDir.split("/").at(-1)}`,
  };

  const plugin = listed.get(name);
  if (plugin === undefined) {
    const sameSource = marketplace.plugins.find(
      (candidate) => typeof candidate.source !== "string" && candidate.source.url === entry.source,
    );
    report.toAdd.push({ ...finding, plugin: sameSource?.name ?? null });
  } else if (finding.commit !== null && plugin.source.sha !== finding.commit) {
    report.commitChanged.push({ ...finding, plugin: plugin.name, pinned: plugin.source.sha });
  }
}

for (const [name, plugin] of listed) {
  if (!installed.has(name) && !ignored.has(name)) report.listedNotInstalled.push({ name, plugin: plugin.name });
}
for (const name of ownSkills) if (!installed.has(name)) report.ownNotInstalled.push(name);

const repoAgents = join(repo, "global/AGENTS.md");
const codexAgents = join(home, ".codex/AGENTS.md");
const claudeMd = join(home, ".claude/CLAUDE.md");
const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);
report.agentsMd = {
  repo: repoAgents,
  codex: codexAgents,
  codexLinkedToRepo: realpath(codexAgents) === realpath(repoAgents),
  codexMatchesRepo: read(codexAgents) === read(repoAgents),
  claudeLinkedToCodex: existsSync(claudeMd) && lstatSync(claudeMd).isSymbolicLink() && realpath(claudeMd) === realpath(codexAgents),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const section = (title, rows) => {
  console.log(`\n${title} (${rows.length})`);
  for (const row of rows) console.log(`  ${row}`);
};
section(
  "Installed globally, missing from marketplace.json",
  report.toAdd.map((item) => `${item.name}  ${item.source}@${item.commit ?? "no commit"}  path=${item.path || "."}  ${item.plugin ? `-> plugin ${item.plugin}` : "-> new plugin"}`),
);
section(
  "Installed at a different commit than pinned",
  report.commitChanged.map((item) => `${item.name}  ${item.plugin}: pinned ${item.pinned.slice(0, 12)}, installed ${item.commit.slice(0, 12)}`),
);
section("Installed with no recorded source (copy into skills/ or ignore)", report.untracked.map((item) => `${item.name}  ${item.path}`));
section("Listed in marketplace.json, not installed globally", report.listedNotInstalled.map((item) => `${item.name}  (${item.plugin})`));
section("This repository's skills not installed globally", report.ownNotInstalled);
const agents = report.agentsMd;
console.log("\nGlobal instructions");
console.log(`  ~/.codex/AGENTS.md ${agents.codexLinkedToRepo ? "links to global/AGENTS.md" : agents.codexMatchesRepo ? "matches global/AGENTS.md (a copy)" : "DIFFERS from global/AGENTS.md"}`);
console.log(`  ~/.claude/CLAUDE.md ${agents.claudeLinkedToCodex ? "links to ~/.codex/AGENTS.md" : "is NOT linked to ~/.codex/AGENTS.md"}`);
