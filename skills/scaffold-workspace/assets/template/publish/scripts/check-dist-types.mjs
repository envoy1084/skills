// Type-checks the built declarations of every published package the way a consumer with
// `skipLibCheck: false` does. Run after `pnpm build`.
import { execFileSync } from "node:child_process"
import * as Fs from "node:fs"
import * as Os from "node:os"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"
import * as Glob from "glob"

const root = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")
const declarations = Glob.globSync("packages/*/dist/**/*.d.ts", { cwd: root, absolute: true })

for (const manifest of Glob.globSync("packages/*/package.json", { cwd: root, absolute: true })) {
  const dist = Path.join(Path.dirname(manifest), "dist")
  if (!declarations.some((file) => file.startsWith(dist + Path.sep))) {
    console.error(`${Path.relative(root, dist)} has no declarations; run \`pnpm build\` first`)
    process.exit(1)
  }
}

const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), "dist-types-"))
try {
  const config = {
    compilerOptions: {
      strict: true,
      noEmit: true,
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      skipLibCheck: false,
      types: ["node"],
      typeRoots: [Path.join(root, "node_modules", "@types")]
    },
    files: declarations
  }
  Fs.writeFileSync(Path.join(dir, "tsconfig.json"), JSON.stringify(config))
  execFileSync("pnpm", ["exec", "tsc", "-p", Path.join(dir, "tsconfig.json")], { cwd: root, stdio: "inherit" })
} catch (error) {
  process.exitCode = typeof error.status === "number" ? error.status : 1
} finally {
  Fs.rmSync(dir, { recursive: true, force: true })
}
