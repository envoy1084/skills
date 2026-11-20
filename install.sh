#!/usr/bin/env sh
# Installs envoy1084/skills and the external skills listed in .claude-plugin/marketplace.json.
#
#   curl -fsSL https://raw.githubusercontent.com/envoy1084/skills/main/install.sh | sh
#
# Asks which collections, where (global or this project) and for which agents. Flags skip the
# questions, and without a terminal the defaults apply (all collections, global, detected agents):
#
#   sh install.sh --yes                       # defaults, no questions
#   sh install.sh -a claude-code -a codex     # these agents
#   sh install.sh --project                   # into the current project instead of globally
#   sh install.sh --only envoy-skills,interfaces
#
# Run from a clone, it installs that clone's skills instead of the published ones.
set -euf

repo="envoy1084/skills"
raw="https://raw.githubusercontent.com/$repo/main"

yes=0
scope=""
agents=""
only=""
while [ $# -gt 0 ]; do
  case "$1" in
    -y | --yes) yes=1 ;;
    -g | --global) scope="global" ;;
    -p | --project) scope="project" ;;
    -a | --agent) agents="$agents $2"; shift ;;
    --only) only=$(printf '%s' "$2" | tr ',' ' '); shift ;;
    -h | --help) sed -n '2,15p' "$0" 2>/dev/null || echo "See $raw/install.sh"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

# Questions read from the terminal, so they work when the script itself arrives on stdin.
interactive=0
if [ "$yes" = 0 ] && (: < /dev/tty) 2>/dev/null; then interactive=1; fi
ask() {
  printf '%s ' "$1" > /dev/tty
  read -r answer < /dev/tty || answer=""
  printf '%s' "${answer:-$2}"
}

clone=""
case "$0" in
  */install.sh | install.sh)
    dir=$(cd "$(dirname "$0")" && pwd)
    [ -f "$dir/.claude-plugin/marketplace.json" ] && clone="$dir"
    ;;
esac
if [ -n "$clone" ]; then
  marketplace=$(cat "$clone/.claude-plugin/marketplace.json")
else
  marketplace=$(curl -fsSL "$raw/.claude-plugin/marketplace.json")
fi

# One line per collection: "<name> <source> <skill count> <skills…>". This repository's own skills
# install as a whole ("*"); external ones at their pinned commit with only the listed skills.
# shellcheck disable=SC2016
collections=$(printf '%s' "$marketplace" | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    for (const plugin of JSON.parse(input).plugins) {
      if (typeof plugin.source === "string") {
        console.log([plugin.name, process.argv[1], "all", "*"].join(" "));
        continue;
      }
      const skills = (plugin.skills ?? []).map((path) => path.replace(/^\.\//, ""));
      console.log([plugin.name, `${plugin.source.url}@${plugin.source.sha}`, skills.length, ...skills].join(" "));
    }
  });
' "${clone:-$repo}")

# Agents whose global folder exists on this machine (`skills` CLI agent ids).
detected=""
for pair in claude-code:.claude codex:.codex cursor:.cursor opencode:.config/opencode \
  gemini-cli:.gemini github-copilot:.copilot windsurf:.codeium/windsurf amp:.config/amp \
  kiro-cli:.kiro goose:.config/goose; do
  [ -d "$HOME/${pair#*:}" ] && detected="$detected ${pair%%:*}"
done
detected=${detected# }

if [ "$interactive" = 1 ]; then
  echo "envoy1084/skills installer" > /dev/tty
  echo > /dev/tty
  if [ -z "$only" ]; then
    echo "Collections:" > /dev/tty
    printf '%s\n' "$collections" | awk '{ printf "  %d) %s (%s skill%s, %s)\n", NR, $1, $3, ($3 == "1" ? "" : "s"), $2 }' > /dev/tty
    picked=$(ask "Install which? Numbers separated by spaces, or Enter for all:" "all")
    if [ "$picked" != "all" ]; then
      for number in $picked; do
        only="$only $(printf '%s\n' "$collections" | sed -n "${number}p" | cut -d' ' -f1)"
      done
    fi
  fi
  if [ -z "$scope" ]; then
    answer=$(ask "Install globally (g) or into this project, $(pwd) (p)? [g]" "g")
    case "$answer" in p | P | project) scope="project" ;; *) scope="global" ;; esac
  fi
  if [ -z "$agents" ]; then
    echo "Agents found on this machine: ${detected:-none}" > /dev/tty
    echo "Other ids: https://github.com/vercel-labs/skills/blob/main/docs/agents.md" > /dev/tty
    agents=$(ask "Install for which agents? Space-separated ids [${detected:-claude-code}]:" "${detected:-claude-code}")
  fi
fi

scope=${scope:-global}
agents=${agents:-$detected}
if [ -z "$agents" ]; then
  echo "No agents found. Pass them with -a, for example: sh install.sh -a claude-code -a codex" >&2
  exit 1
fi

selected=$(printf '%s\n' "$collections" | while read -r name rest; do
  if [ -z "$only" ] || printf ' %s ' "$only" | grep -q " $name "; then printf '%s %s\n' "$name" "$rest"; fi
done)
if [ -z "$selected" ]; then
  echo "No collection matches: $only" >&2
  exit 1
fi

agent_flags=""
for agent in $agents; do agent_flags="$agent_flags -a $agent"; done
scope_flag=""
[ "$scope" = global ] && scope_flag="-g"

echo
echo "Installing $(printf '%s\n' "$selected" | cut -d' ' -f1 | tr '\n' ' ')"
echo "  scope:  $scope$([ "$scope" = project ] && printf ' (%s)' "$(pwd)")"
echo "  agents: $agents"
if [ "$interactive" = 1 ]; then
  case $(ask "Continue? [Y/n]" "y") in n | N | no) echo "Cancelled."; exit 0 ;; esac
fi

printf '%s\n' "$selected" | while read -r name source _count skills; do
  skill_flags=""
  for skill in $skills; do skill_flags="$skill_flags --skill $skill"; done
  echo
  echo "==> $name"
  # shellcheck disable=SC2086
  npx -y skills add "$source" $skill_flags $agent_flags $scope_flag -y < /dev/null
done
