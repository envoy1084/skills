import { Command } from "effect/cli";

import { releaseCommand } from "./commands/release.ts";

/** `__NAME__-dev`: repository tooling, run from the repository root. */
export const cli = Command.make("__NAME__-dev").pipe(
  Command.withDescription("Repository tooling for __NAME__"),
  Command.withSubcommands([releaseCommand]),
);
