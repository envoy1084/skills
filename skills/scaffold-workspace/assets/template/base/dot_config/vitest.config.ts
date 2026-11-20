import { fileURLToPath } from "node:url";

import defineConfig from "klarity/vitest/node";

export default defineConfig({
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
