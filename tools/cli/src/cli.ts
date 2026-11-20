import { Command } from "effect/cli";

import { reportCommand } from "./commands/report.ts";
import { syncCommand } from "./commands/sync.ts";

/** `skills-dev`: repository tooling, run from the repository root. */
export const cli = Command.make("skills-dev").pipe(
  Command.withDescription(
    "Vendor external skills and compare this repository with global installs",
  ),
  Command.withSubcommands([syncCommand, reportCommand]),
);
