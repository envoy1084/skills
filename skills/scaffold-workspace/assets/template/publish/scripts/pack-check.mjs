// Packs every publishable package as npm would (publishConfig applied) and checks the tarball with
// publint and attw. Run after `pnpm build`. The release workflow runs the fuller `release:check`.
import { execFileSync } from "node:child_process"
import * as Fs from "node:fs"
import * as Os from "node:os"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"
import * as Glob from "glob"

const root = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")
const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), "pack-check-"))
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: "inherit" })

try {
  for (const manifestFile of Glob.globSync("packages/*/package.json", { cwd: root, absolute: true }).sort()) {
    const manifest = JSON.parse(Fs.readFileSync(manifestFile, "utf8"))
    if (manifest.private === true) continue
    const before = new Set(Fs.readdirSync(out))
    run("pnpm", ["pack", "--pack-destination", out], Path.dirname(manifestFile))
    const tarball = Path.join(out, Fs.readdirSync(out).find((file) => !before.has(file)))
    console.log(`\n${manifest.name}`)
    run("pnpm", ["exec", "publint", "run", tarball, "--strict"])
    run("pnpm", ["exec", "attw", tarball, "--profile", "esm-only", "--format", "ascii"])
  }
} catch (error) {
  process.exitCode = typeof error.status === "number" ? error.status : 1
} finally {
  Fs.rmSync(out, { recursive: true, force: true })
}
