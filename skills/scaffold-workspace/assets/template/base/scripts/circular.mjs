// Fails when modules of the workspace packages import each other in a cycle.
import * as Glob from "glob"
import madge from "madge"

const files = Glob.globSync(["packages/*/src/**/*.{ts,tsx}"])
if (files.length > 0) {
  const result = await madge(files, {
    detectiveOptions: { ts: { skipTypeImports: true }, tsx: { skipTypeImports: true } }
  })
  const cycles = result.circular()
  if (cycles.length > 0) {
    console.error("Circular dependencies found:")
    for (const cycle of cycles) console.error(`  ${cycle.join(" -> ")}`)
    process.exit(1)
  }
}
