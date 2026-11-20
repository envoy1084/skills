# Answers file

`scripts/scaffold.mjs --config <file>` reads one JSON object. Write it outside the target directory.

```json
{
  "dir": "/Users/me/Projects/widgets",
  "name": "widgets",
  "description": "Typed building blocks for widget dashboards.",
  "repo": "envoy1084/widgets",
  "owners": ["@envoy1084"],
  "author": "Vedant Chainani (https://github.com/envoy1084)",
  "copyrightHolder": "Vedant Chainani",
  "license": "MIT",
  "year": 2026,
  "publish": true,
  "scope": "@widgets",
  "packages": [
    {
      "name": "core",
      "description": "Widget models, validation and typed errors",
      "keywords": ["widgets", "dashboard", "schema", "effect", "typescript"],
      "platform": "neutral"
    }
  ]
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `dir` | yes | Absolute path. Must not exist, or be empty (a lone `.git` is allowed). |
| `name` | yes | kebab-case. Root package name, `<name>-dev` CLI, headings. |
| `description` | yes | One sentence, no marketing words. README and root `package.json`. |
| `repo` | yes | `<owner>/<repo>` on GitHub. Issue links, security links, package URLs. |
| `owners` | yes | GitHub users or teams, each starting with `@`. `CODEOWNERS`. |
| `author` | yes | `Name (url)`. No email unless the user asked for one. |
| `copyrightHolder` | yes | Person or company in `LICENSE`. |
| `license` | yes | `MIT`, `Apache-2.0`, `ISC`, `BSD-3-Clause` or `UNLICENSED`. |
| `year` | no | Copyright year; defaults to the current year. |
| `publish` | no | `true` adds changesets, the release workflows and `tools/cli`. Default `false`. |
| `scope` | when `publish` | npm scope with `@`, for every package and `tools`. |
| `packages` | no | Publishable libraries; requires `publish: true`. |
| `packages[].name` | yes | kebab-case folder and package name (`<scope>/<name>`). |
| `packages[].description` | yes | One sentence for npm, README tables and the workspace map. |
| `packages[].keywords` | yes | 3–10 specific npm search terms; deduplicated and sorted. |
| `packages[].platform` | yes | `neutral` (runtime-agnostic), `node` (adds Node types), `browser`, or `react` (React presets, `.tsx` entry, jsdom tests, `react` peer). |

## What the script fills in

| Placeholder | Value |
| --- | --- |
| `__NAME__`, `__DESCRIPTION__`, `__REPO__`, `__AUTHOR__`, `__LICENSE__` | Answers |
| `__SCOPE__` | `scope` (empty when not publishing) |
| `__OWNER__` | `owners` joined with spaces |
| `__LICENSE_NAME__` | Human name of the license for CONTRIBUTING |
| `__EFFECT_VERSION__` | The catalog's `effect` version, for library peer ranges |
| `__PKG__`, `__PKG_DESCRIPTION__` | Per package, inside `packages/<name>` |
| `__TSDOWN_PRESET__` and the tsconfig `extends` | From `platform` |
| `__REACT_FILES__` | Globs of the `react` packages, for the oxlint React override |

Line placeholders expand to one line per package, or vanish when there are none:
`__VITEST_PROJECTS__`, `__PACKAGES_TABLE__`, `__PACKAGE_OPTIONS__`, `__WORKSPACE_MAP__`,
`__REPO_STRUCTURE__`.

Blocks between a line containing `@@publish` (or `@@library`, meaning at least one package, or
`@@react`, meaning at least one React package) and a
line containing `@@end` are kept only when the condition holds; the marker lines are always removed.
