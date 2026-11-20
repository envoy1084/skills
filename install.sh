#!/usr/bin/env sh
# Installs envoy1084/skills plus the external skills it builds on, for every agent the `skills`
# CLI supports. External sources are pinned to a commit; bump them deliberately.
#
#   curl -fsSL https://raw.githubusercontent.com/envoy1084/skills/main/install.sh | sh
#   sh install.sh -a claude-code -a codex   # extra flags are passed to every `skills add`
set -eu

add() {
  npx -y skills add "$@"
}

# Global (user-level) install without prompts.
flags="-g -y"

# This repository: every skill. SKILLS_SOURCE points at a local clone when testing changes.
add "${SKILLS_SOURCE:-envoy1084/skills}" --skill '*' $flags "$@"

# t3dotgg/tstack: pull requests.
add t3dotgg/tstack@11e37a74d0a6868c121cd0910ab2b3bd9873b92a \
  -s file-pr -s babysit-pr -s leaving-pr-comments $flags "$@"

# emilkowalski/skills: animation and design engineering.
add emilkowalski/skills@64eb3deb9a5fbfa041faf783e0bc3fd635872e9c \
  -s animate -s animation-performance -s animation-vocabulary -s apple-design -s ask-emil \
  -s ask-sonner -s break-ui -s choreograph -s emil-design-eng -s find-animation-opportunities \
  -s gestures -s improve-animations -s learn-taste -s pick-ui-library -s prototype \
  -s remove-animations -s review-animations $flags "$@"

# jakubkrehel/skills: interfaces.
add jakubkrehel/skills@672ae44ace6aaed65b86cbb1e2fd6fbea0e79578 \
  -s better-accessibility -s better-colors -s better-interface -s better-layout -s better-motion \
  -s better-typography -s better-ui -s better-writing -s break -s build-design \
  -s explain-interface -s interface-review -s variant $flags "$@"

# vercel-labs/skills: discovering more skills.
add vercel-labs/skills@57217cf86ba38148a57af9e90d14a4c049558330 -s find-skills $flags "$@"
