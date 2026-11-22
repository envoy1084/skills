import { Command } from "effect/cli"

import { releaseCheckCommand } from "./commands/releaseCheck.ts"
import { releaseSmokeCommand } from "./commands/releaseSmoke.ts"

/** `release check|smoke`: release checks for this repository, run from the repository root. */
export const cli = Command.make("release").pipe(
  Command.withDescription("Check packed release tarballs and their published versions"),
  Command.withSubcommands([releaseCheckCommand, releaseSmokeCommand])
)
