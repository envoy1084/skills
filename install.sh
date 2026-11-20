#!/usr/bin/env sh
# Installs envoy1084/skills, the external skills listed in .claude-plugin/marketplace.json, and the
# global agent instructions (global/AGENTS.md), for every agent the `skills` CLI supports.
#
#   curl -fsSL https://raw.githubusercontent.com/envoy1084/skills/main/install.sh | sh
#   sh install.sh -a claude-code -a codex   # extra flags are passed to every `skills add`
#
# Run from a clone, it installs that clone's skills and links the instructions to it, so edits in
# the clone take effect immediately. Set SKIP_AGENTS_MD=1 to leave the instructions alone.
set -eu

repo="envoy1084/skills"
raw="https://raw.githubusercontent.com/$repo/main"
flags="-g -y"

clone=""
case "$0" in
  */install.sh | install.sh)
    dir=$(cd "$(dirname "$0")" && pwd)
    [ -f "$dir/.claude-plugin/marketplace.json" ] && clone="$dir"
    ;;
esac

if [ -n "$clone" ]; then
  marketplace=$(cat "$clone/.claude-plugin/marketplace.json")
  self="$clone"
else
  marketplace=$(curl -fsSL "$raw/.claude-plugin/marketplace.json")
  self="$repo"
fi

# One line per external plugin: "<owner/repo>@<sha> <skill> <skill> …".
# shellcheck disable=SC2016
sources=$(printf '%s' "$marketplace" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    for (const plugin of JSON.parse(input).plugins) {
      if (typeof plugin.source === "string") continue;
      const skills = (plugin.skills ?? []).map((path) => path.replace(/^\.\//, ""));
      console.log([`${plugin.source.url}@${plugin.source.sha}`, ...skills].join(" "));
    }
  });
')

# shellcheck disable=SC2086
npx -y skills add "$self" --skill '*' $flags "$@"

printf '%s\n' "$sources" | while read -r source skills; do
  [ -n "$source" ] || continue
  skill_flags=""
  for skill in $skills; do skill_flags="$skill_flags -s $skill"; done
  # shellcheck disable=SC2086
  npx -y skills add "$source" $skill_flags $flags "$@" < /dev/null
done

if [ "${SKIP_AGENTS_MD:-0}" != 1 ]; then
  codex="$HOME/.codex/AGENTS.md"
  claude="$HOME/.claude/CLAUDE.md"
  mkdir -p "$HOME/.codex" "$HOME/.claude"

  if [ -n "$clone" ]; then
    instructions="$clone/global/AGENTS.md"
  else
    instructions=$(mktemp)
    curl -fsSL "$raw/global/AGENTS.md" -o "$instructions"
  fi

  # Keep a copy of hand-written instructions that differ from the ones being installed.
  for file in "$codex" "$claude"; do
    if [ -f "$file" ] && [ ! -L "$file" ] && ! cmp -s "$file" "$instructions"; then
      cp "$file" "$file.backup-$(date +%Y%m%d%H%M%S)"
      echo "Backed up $file"
    fi
  done

  rm -f "$codex"
  if [ -n "$clone" ]; then
    ln -s "$instructions" "$codex"
  else
    mv "$instructions" "$codex"
    chmod 644 "$codex"
  fi
  ln -sfn "$codex" "$claude"
  echo "Installed $codex (Codex) and linked $claude (Claude Code) to it"
fi
