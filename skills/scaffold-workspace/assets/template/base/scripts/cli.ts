import { Command } from "effect/cli"

import { circular } from "./commands/circular.ts"
import { clean } from "./commands/clean.ts"
import { lint } from "./commands/lint.ts"
// @@publish
import { distTypes } from "./commands/distTypes.ts"
import { packCheck } from "./commands/packCheck.ts"
import { release } from "./commands/release.ts"
// @@end

/** `node scripts/bin.ts <command>`: the repository's tooling, run from the repository root. */
export const cli = Command.make("scripts").pipe(
  Command.withDescription("Repository tooling for __NAME__, run from the repository root"),
  Command.withSubcommands([
    circular,
    clean,
    lint,
    // @@publish
    distTypes,
    packCheck,
    release
    // @@end
  ])
)
