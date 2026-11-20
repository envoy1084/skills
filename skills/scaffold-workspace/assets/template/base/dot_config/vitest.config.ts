import { fileURLToPath } from "node:url";

import { Struct } from "effect";

import defineConfig from "klarity/vitest/node";

const config = defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { conditions: ["workspace-source"] },
  ssr: { resolve: { conditions: ["workspace-source"] } },
  test: {
    passWithNoTests: true,
    // @@library
    projects: [
      __VITEST_PROJECTS__
    ],
    // @@end
  },
});

// WARNING: klarity raises testTimeout to 10s; omitting it keeps Vitest's 5s default (no-flake-masking).
export default { ...config, test: Struct.omit(config.test ?? {}, ["testTimeout"]) };
