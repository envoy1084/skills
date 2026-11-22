#!/usr/bin/env node
// Renders a new workspace from the templates in ../assets.
//
//   node scaffold.mjs --config answers.json [--dry-run]
//
// The config is described in ../references/config.md. The script only writes files: installing,
// git, the first code and verification are the agent's steps (see ../SKILL.md).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets")
const template = join(assets, "template")

const licenses = {
  MIT: "MIT License",
  "Apache-2.0": "Apache License 2.0",
  ISC: "ISC License",
  "BSD-3-Clause": "BSD 3-Clause License",
  UNLICENSED: "repository's license"
}
const platforms = ["neutral", "node", "browser", "react"]

const fail = (message) => {
  console.error(`scaffold: ${message}`)
  process.exit(1)
}

const { values: args } = parseArgs({
  options: { config: { type: "string" }, "dry-run": { type: "boolean", default: false } }
})
if (args.config === undefined) fail("missing --config <answers.json>")
const config = JSON.parse(readFileSync(args.config, "utf8"))

// Validate everything before writing anything.
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
for (const key of ["dir", "name", "description", "repo", "owners", "author", "license", "copyrightHolder"]) {
  if (config[key] === undefined || config[key] === "") fail(`missing "${key}"`)
}
if (!kebab.test(config.name)) fail(`name "${config.name}" must be kebab-case`)
if (!/^[\w.-]+\/[\w.-]+$/.test(config.repo)) fail(`repo "${config.repo}" must be <owner>/<repo>`)
if (!(config.license in licenses)) fail(`license must be one of ${Object.keys(licenses).join(", ")}`)
if (!Array.isArray(config.owners) || config.owners.some((owner) => !owner.startsWith("@"))) {
  fail("owners must be GitHub handles or teams starting with @")
}

const publish = config.publish === true
const packages = config.packages ?? []
if (publish && packages.length === 0) fail("publish needs at least one package")
if (!publish && packages.length > 0) fail("packages are publishable libraries: set publish to true")
if (publish && !/^@[a-z0-9][a-z0-9-._]*$/.test(config.scope ?? "")) fail("scope must look like @name")
for (const pkg of packages) {
  if (!kebab.test(pkg.name ?? "")) fail(`package name "${pkg.name}" must be kebab-case`)
  if (!platforms.includes(pkg.platform)) fail(`package "${pkg.name}": platform must be ${platforms.join(", ")}`)
  if (!pkg.description) fail(`package "${pkg.name}": missing description`)
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) fail(`package "${pkg.name}": missing keywords`)
}
if (new Set(packages.map((pkg) => pkg.name)).size !== packages.length) fail("package names must be unique")

const dir = resolve(config.dir)
if (existsSync(dir) && readdirSync(dir).some((entry) => entry !== ".git")) {
  fail(`${dir} is not empty; scaffold into a new or empty directory`)
}

const scope = config.scope ?? ""
const year = String(config.year ?? new Date().getFullYear())
const reactPackages = packages.filter((pkg) => pkg.platform === "react")
const written = []

// Copies a template layer, turning `dot_x` path segments into `.x`.
const copyLayer = (from, to) => {
  for (const entry of readdirSync(from)) {
    const source = join(from, entry)
    const target = join(to, entry.startsWith("dot_") ? `.${entry.slice(4)}` : entry)
    if (statSync(source).isDirectory()) {
      copyLayer(source, target)
      continue
    }
    if (!args["dry-run"]) {
      mkdirSync(dirname(target), { recursive: true })
      cpSync(source, target)
    }
    if (!written.includes(target)) written.push(target)
  }
}

const write = (file, content) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
  if (!written.includes(file)) written.push(file)
}
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"))
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`)
const sortKeys = (record) => Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))

copyLayer(join(template, "base"), dir)
if (publish) copyLayer(join(template, "publish"), dir)
for (const pkg of packages) copyLayer(join(template, "package"), join(dir, "packages", pkg.name))

if (args["dry-run"]) {
  const listed = written.filter((file) => !file.endsWith("package.fragment.json"))
  console.log(listed.map((file) => relative(dir, file)).sort().join("\n"))
  process.exit(0)
}

// ── Text: placeholders and conditional blocks ─────────────────────────────────

const catalogEffect = /^\s*effect: "([^"]+)"/m.exec(readFileSync(join(dir, "pnpm-workspace.yaml"), "utf8"))?.[1]
if (catalogEffect === undefined) fail("pnpm-workspace.yaml has no effect catalog entry")

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
  __NAMESPACE_IMPORT_PACKAGES__: ["effect", "@effect/*", ...(publish ? [`${scope}/*`] : [])]
    .map((name) => `"${name}"`)
    .join(", ")
}

// Line tokens expand to one line per package (with the token's indentation), or disappear.
const lineTokens = {
  __VITEST_PROJECTS__: packages.map((pkg) =>
    pkg.platform === "react"
      ? `project("${scope}/${pkg.name}", "packages/${pkg.name}", { test: { environment: "jsdom" } }),`
      : `project("${scope}/${pkg.name}", "packages/${pkg.name}"),`
  ),
  __PACKAGES_TABLE__: packages.map((pkg) =>
    `| [\`${scope}/${pkg.name}\`](./packages/${pkg.name}/README.md) | ${pkg.description} |`
  ),
  __PACKAGE_OPTIONS__: packages.map((pkg) => `- "${scope}/${pkg.name}"`),
  __WORKSPACE_MAP__: packages.map((pkg) => `- \`packages/${pkg.name}\`: \`${scope}/${pkg.name}\`, ${pkg.description}`),
  __REPO_STRUCTURE__: packages.map((pkg) =>
    `${`packages/${pkg.name}/`.padEnd(15)} ${scope}/${pkg.name}: ${pkg.description}`
  )
}

// `@@publish` / `@@react` … `@@end` lines bound blocks kept only when the condition holds.
const conditions = { publish, react: reactPackages.length > 0 }

const render = (text, pkg) => {
  const lines = []
  let keep = true
  for (const line of text.split("\n")) {
    const marker = /@@(publish|react|end)\b/.exec(line)?.[1]
    if (marker !== undefined) {
      keep = marker === "end" ? true : conditions[marker]
      continue
    }
    if (!keep) continue
    const lineToken = Object.keys(lineTokens).find((token) => line.trim() === token)
    if (lineToken !== undefined) {
      const indent = /^\s*/.exec(line)[0]
      lines.push(...lineTokens[lineToken].map((generated) => indent + generated))
      continue
    }
    lines.push(line)
  }
  let out = lines.join("\n")
  const all = pkg === undefined ? tokens : { ...tokens, __PKG__: pkg.name, __PKG_DESCRIPTION__: pkg.description }
  for (const [token, value] of Object.entries(all)) out = out.replaceAll(token, value)
  return out
}

for (const file of written) {
  const pkg = packages.find((candidate) => file.startsWith(join(dir, "packages", candidate.name) + "/"))
  writeFileSync(file, render(readFileSync(file, "utf8"), pkg))
}

// ── JSON: structural edits ────────────────────────────────────────────────────

const rootManifestFile = join(dir, "package.json")
const fragmentFile = join(dir, "package.fragment.json")
if (existsSync(fragmentFile)) {
  const root = readJson(rootManifestFile)
  const fragment = readJson(fragmentFile)
  root.scripts = sortKeys({ ...root.scripts, ...fragment.scripts })
  root.devDependencies = sortKeys({ ...root.devDependencies, ...fragment.devDependencies })
  writeJson(rootManifestFile, root)
  rmSync(fragmentFile)
  written.splice(written.indexOf(fragmentFile), 1)
}

const license = readFileSync(join(assets, "licenses", `${config.license}.txt`), "utf8")
  .replaceAll("__YEAR__", year)
  .replaceAll("__HOLDER__", config.copyrightHolder)
write(join(dir, "LICENSE"), license)

// React versions: pinned in the package when one package uses them, in the catalog when several do.
const react = readJson(join(template, "react.json"))
const reactInCatalog = reactPackages.length > 1
if (reactInCatalog) {
  const workspaceFile = join(dir, "pnpm-workspace.yaml")
  const entries = Object.entries(react.devDependencies).map(
    ([name, version]) => `  ${name.startsWith("@") ? `"${name}"` : name}: "${version}"`
  )
  const workspace = readFileSync(workspaceFile, "utf8")
  writeFileSync(workspaceFile, workspace.replace(/^catalog:\n/m, `catalog:\n${entries.join("\n")}\n`))
}

for (const pkg of packages) {
  const pkgDir = join(dir, "packages", pkg.name)
  write(join(pkgDir, "LICENSE"), license)

  const manifest = readJson(join(pkgDir, "package.json"))
  manifest.keywords = [...new Set(pkg.keywords)].sort()
  if (pkg.platform === "node") {
    manifest.devDependencies = sortKeys({ ...manifest.devDependencies, "@types/node": "catalog:" })
  }
  if (pkg.platform === "react") {
    const devDependencies = Object.fromEntries(
      Object.keys(react.devDependencies).map((name) => [name, reactInCatalog ? "catalog:" : react.devDependencies[name]])
    )
    manifest.devDependencies = sortKeys({ ...manifest.devDependencies, ...devDependencies })
    manifest.peerDependencies = sortKeys({ ...manifest.peerDependencies, ...react.peerDependencies })
  }
  writeJson(join(pkgDir, "package.json"), manifest)

  const tsconfig = readJson(join(pkgDir, "tsconfig.json"))
  if (pkg.platform === "node") tsconfig.compilerOptions.types = ["node"]
  writeJson(join(pkgDir, "tsconfig.json"), tsconfig)

  // React components live in .tsx modules; the barrel exports both.
  if (pkg.platform === "react") {
    const indexFile = join(pkgDir, "src", "index.ts")
    writeFileSync(indexFile, readFileSync(indexFile, "utf8").replace("// @barrel:", "// @barrel(*.{ts,tsx}):"))
  }
}

const packagesTsconfigFile = join(dir, "tsconfig.packages.json")
const packagesTsconfig = readJson(packagesTsconfigFile)
packagesTsconfig.references = packages.map((pkg) => ({ path: `packages/${pkg.name}` }))
writeJson(packagesTsconfigFile, packagesTsconfig)

// Tests import packages by name, resolved to source without a build.
const testsTsconfigFile = join(dir, "tsconfig.tests.json")
const testsTsconfig = readJson(testsTsconfigFile)
testsTsconfig.compilerOptions.paths = Object.fromEntries(
  packages.flatMap((pkg) => [
    [`${scope}/${pkg.name}`, [`./packages/${pkg.name}/src/index.ts`]],
    [`${scope}/${pkg.name}/*`, [`./packages/${pkg.name}/src/*.ts`]]
  ])
)
writeJson(testsTsconfigFile, testsTsconfig)

// Library source imports modules, never barrels: Effect's patterns plus the repository's scope.
const oxlintFile = join(dir, ".oxlintrc.json")
const oxlint = readJson(oxlintFile)
const scopePattern = scope.replaceAll(".", "\\.")
oxlint.rules["effect/no-import-from-barrel-package"][1].checkPatterns = [
  "^effect$",
  "^effect/(.+/)?[a-z][a-z0-9]*$",
  "^@effect/[^/]+$",
  "^@effect/[^/]+/(.+/)?[a-z][a-z0-9]*$",
  ...(publish ? [`^${scopePattern}/[^/]+$`, `^${scopePattern}/[^/]+/(.+/)?[a-z][a-z0-9]*$`] : [])
]
if (reactPackages.length > 0) {
  oxlint.overrides.push({
    files: reactPackages.map((pkg) => `packages/${pkg.name}/**`),
    plugins: ["react", "jsx-a11y", "react-perf"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
      // The automatic JSX runtime (tsconfig `jsx: react-jsx`) needs no React import.
      "react/react-in-jsx-scope": "off"
    }
  })
}
writeJson(oxlintFile, oxlint)

for (const file of written) {
  const leftover = /__[A-Z][A-Z0-9_]*__/.exec(readFileSync(file, "utf8"))
  if (leftover !== null) fail(`${relative(dir, file)}: unreplaced placeholder ${leftover[0]}`)
}

console.log(`Scaffolded ${config.name} in ${dir}:`)
console.log(written.map((file) => `  ${relative(dir, file)}`).sort().join("\n"))
