// Removes build output and caches so the next build starts from nothing.
import * as Glob from "glob"
import * as Fs from "node:fs"

for (const dir of [".", ...Glob.sync("packages/*/"), ...Glob.sync("apps/*/")]) {
  for (const entry of ["dist", "build", "coverage", ".data", "tmp", "tsconfig.tsbuildinfo"]) {
    Fs.rmSync(`${dir}/${entry}`, { recursive: true, force: true })
  }
}
for (const file of Glob.sync("*.tsbuildinfo")) Fs.rmSync(file, { force: true })
