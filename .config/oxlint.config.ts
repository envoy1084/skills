import { presets } from "@effect/tsgo/oxlint-presets";

import landmines from "@interfere/landmines/configs/recommended.json" with { type: "json" };
import config from "klarity/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    config,
    presets.correctness,
    presets.antipattern,
    presets.effectNative,
    presets.style,
    presets.maintainers,
    landmines,
  ],
  rules: {
    "no-underscore-dangle": ["error", { allow: ["_tag"] }],
    "effecttsgo/api-stability-leak": "off",
    "effecttsgo/missing-pipeable-signature": "off",
  },
});
