#!/usr/bin/env node
// Renders a new workspace from the templates in ../assets.
//
//   node scaffold.mjs --config answers.json [--dry-run]
//
// The config is described in ../references/config.md. The script only writes files: installing,
// git, versions and verification are the agent's steps (see ../SKILL.md).
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const licenses = {
  MIT: "MIT License",
  "Apache-2.0": "Apache License 2.0",
  ISC: "ISC License",
  "BSD-3-Clause": "BSD 3-Clause License",
  UNLICENSED: "repository's license",
};

const platforms = {
  neutral: { tsconfig: "klarity/tsconfig/library", tsdown: "klarity/tsdown/library" },
  node: { tsconfig: "klarity/tsconfig/library/node", tsdown: "klarity/tsdown/node" },
  browser: { tsconfig: "klarity/tsconfig/library/browser", tsdown: "klarity/tsdown/browser" },
};

const fail = (message) => {
  console.error(`scaffold: ${message}`);
  process.exit(1);
};

const { values: args } = parseArgs({
  options: { config: { type: "string" }, "dry-run": { type: "boolean", default: false } },
});
if (args.config === undefined) fail("missing --config <answers.json>");
const config = JSON.parse(readFileSync(args.config, "utf8"));

// Validate everything before writing anything.
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const required = ["dir", "name", "description", "repo", "owners", "author", "license", "copyrightHolder"];
for (const key of required) if (config[key] === undefined || config[key] === "") fail(`missing "${key}"`);
if (!kebab.test(config.name)) fail(`name "${config.name}" must be kebab-case`);
if (!/^[\w.-]+\/[\w.-]+$/.test(config.repo)) fail(`repo "${config.repo}" must be <owner>/<repo>`);
if (!(config.license in licenses)) fail(`license must be one of ${Object.keys(licenses).join(", ")}`);
if (!Array.isArray(config.owners) || config.owners.some((owner) => !owner.startsWith("@")))
  fail("owners must be GitHub handles or teams starting with @");

const publish = config.publish === true;
const packages = config.packages ?? [];
if (packages.length > 0 && !publish) fail("packages are publishable libraries: set publish to true");
if (publish && !/^@[a-z0-9][a-z0-9-._]*$/.test(config.scope ?? "")) fail(`scope must look like @name`);
for (const pkg of packages) {
  if (!kebab.test(pkg.name ?? "")) fail(`package name "${pkg.name}" must be kebab-case`);
  if (!(pkg.platform in platforms)) fail(`package "${pkg.name}": platform must be neutral, node or browser`);
  if (!pkg.description) fail(`package "${pkg.name}": missing description`);
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) fail(`package "${pkg.name}": missing keywords`);
}

const dir = resolve(config.dir);
if (existsSync(dir) && readdirSync(dir).some((entry) => entry !== ".git"))
  fail(`${dir} is not empty; scaffold into a new or empty directory`);

const year = String(config.year ?? new Date().getFullYear());
const scope = config.scope ?? "";
const written = [];

// Copies a template layer, turning `dot_x` path segments into `.x`.
const copyLayer = (from, to) => {
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const target = join(to, entry.startsWith("dot_") ? `.${entry.slice(4)}` : entry);
    if (statSync(source).isDirectory()) copyLayer(source, target);
    else {
      if (!args["dry-run"]) {
        mkdirSync(dirname(target), { recursive: true });
        cpSync(source, target);
      }
      written.push(target);
    }
  }
};

const write = (file, content) => {
  if (!args["dry-run"]) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  if (!written.includes(file)) written.push(file);
};

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const sortKeys = (record) => Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));

if (args["dry-run"]) {
  copyLayer(join(assets, "template", "base"), dir);
  if (publish) copyLayer(join(assets, "template", "publish"), dir);
  for (const pkg of packages) copyLayer(join(assets, "template", "library"), join(dir, "packages", pkg.name));
  console.log(written.map((file) => relative(dir, file)).sort().join("\n"));
  process.exit(0);
}

copyLayer(join(assets, "template", "base"), dir);

if (publish) {
  copyLayer(join(assets, "template", "publish"), dir);
  chmodSync(join(dir, "tools/cli/src/bin.ts"), 0o755);

  // Merge the release scripts and tools into the root manifest.
  const fragmentFile = join(dir, "package.publish.json");
  const fragment = readJson(fragmentFile);
  const root = readJson(join(dir, "package.json"));
  root.scripts = sortKeys({ ...root.scripts, ...fragment.scripts });
  root.devDependencies = sortKeys({ ...root.devDependencies, ...fragment.devDependencies });
  writeJson(join(dir, "package.json"), root);
  rmSync(fragmentFile);
  written.splice(written.indexOf(fragmentFile), 1);
}

const license = readFileSync(join(assets, "licenses", `${config.license}.txt`), "utf8")
  .replaceAll("__YEAR__", year)
  .replaceAll("__HOLDER__", config.copyrightHolder);
write(join(dir, "LICENSE"), license);

for (const pkg of packages) {
  const pkgDir = join(dir, "packages", pkg.name);
  copyLayer(join(assets, "template", "library"), pkgDir);
  write(join(pkgDir, "LICENSE"), license);

  const manifest = readJson(join(pkgDir, "package.json"));
  manifest.keywords = [...new Set(pkg.keywords)].sort();
  if (pkg.platform === "node") manifest.devDependencies = sortKeys({ ...manifest.devDependencies, "@types/node": "catalog:" });
  writeJson(join(pkgDir, "package.json"), manifest);

  const tsconfig = readJson(join(pkgDir, "tsconfig.json"));
  tsconfig.extends = platforms[pkg.platform].tsconfig;
  tsconfig.compilerOptions = { ...tsconfig.compilerOptions, ...(pkg.platform === "node" ? { types: ["node"] } : {}) };
  writeJson(join(pkgDir, "tsconfig.json"), tsconfig);

  const tsdown = readFileSync(join(pkgDir, "tsdown.config.ts"), "utf8").replace("__TSDOWN_PRESET__", platforms[pkg.platform].tsdown);
  write(join(pkgDir, "tsdown.config.ts"), tsdown);
}

const catalogEffect = /^\s*effect: "([^"]+)"/m.exec(readFileSync(join(dir, "pnpm-workspace.yaml"), "utf8"))?.[1];
if (catalogEffect === undefined) fail("pnpm-workspace.yaml has no effect catalog entry");

const tokens = {
  __NAME__: config.name,
  __DESCRIPTION__: config.description,
  __SCOPE__: scope,
  __REPO__: config.repo,
  __OWNER__: config.owners.join(" "),
  __AUTHOR__: config.author,
  __LICENSE__: config.license,
  __LICENSE_NAME__: licenses[config.license],
  __EFFECT_VERSION__: catalogEffect,
};

// Line tokens expand to one line per package (with the token's indentation), or disappear.
const lineTokens = {
  __VITEST_PROJECTS__: packages.map(
    (pkg) => `{ extends: true, test: { name: "${pkg.name}", root: "packages/${pkg.name}", include: ["test/**/*.test.ts"] } },`,
  ),
  __PACKAGES_TABLE__: packages.map(
    (pkg) => `| [\`${scope}/${pkg.name}\`](./packages/${pkg.name}/README.md) | ${pkg.description} |`,
  ),
  __PACKAGE_OPTIONS__: packages.map((pkg) => `- "${scope}/${pkg.name}"`),
  __WORKSPACE_MAP__: packages.map((pkg) => `- \`packages/${pkg.name}\`: \`${scope}/${pkg.name}\`, ${pkg.description}`),
  __REPO_STRUCTURE__: packages.map((pkg) => `${`packages/${pkg.name}/`.padEnd(15)} ${scope}/${pkg.name}: ${pkg.description}`),
};

// `@@publish` / `@@library` … `@@end` lines bound blocks kept only when the condition holds.
const conditions = { publish, library: packages.length > 0 };

const render = (text, pkg) => {
  const lines = [];
  let keep = true;
  for (const line of text.split("\n")) {
    const marker = /@@(publish|library|end)\b/.exec(line)?.[1];
    if (marker !== undefined) {
      keep = marker === "end" ? true : conditions[marker];
      continue;
    }
    if (!keep) continue;
    const lineToken = Object.keys(lineTokens).find((token) => line.trim() === token);
    if (lineToken !== undefined) {
      const indent = /^\s*/.exec(line)[0];
      lines.push(...lineTokens[lineToken].map((generated) => indent + generated));
      continue;
    }
    lines.push(line);
  }
  let out = lines.join("\n");
  const all = pkg === undefined ? tokens : { ...tokens, __PKG__: pkg.name, __PKG_DESCRIPTION__: pkg.description };
  for (const [token, value] of Object.entries(all)) out = out.replaceAll(token, value);
  return out;
};

for (const file of written) {
  const pkg = packages.find((candidate) => file.startsWith(join(dir, "packages", candidate.name) + "/"));
  const rendered = render(readFileSync(file, "utf8"), pkg);
  const leftover = /__[A-Z][A-Z0-9_]*__/.exec(rendered);
  if (leftover !== null) fail(`${relative(dir, file)}: unreplaced placeholder ${leftover[0]}`);
  writeFileSync(file, rendered);
}

console.log(`Scaffolded ${config.name} in ${dir}:`);
console.log(written.map((file) => `  ${relative(dir, file)}`).sort().join("\n"));
