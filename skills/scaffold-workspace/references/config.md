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
| `publish` | no | `true` adds the packages, library tooling, changesets and the release workflows and CLI. Requires at least one package. Default `false`. |
| `scope` | when `publish` | npm scope with `@`, for every package and `tools`. |
| `packages` | with `publish` | Publishable libraries; only with `publish: true`. |
| `packages[].name` | yes | kebab-case folder and package name (`<scope>/<name>`). |
| `packages[].description` | yes | One sentence for npm, README tables and the workspace map. |
| `packages[].keywords` | yes | 3–10 specific npm search terms; deduplicated and sorted. |
| `packages[].platform` | yes | `neutral` (runtime-agnostic), `node` (adds Node types), `browser`, or `react` (`.tsx` modules, `react` peer, jsdom tests, oxlint React plugins). |

## What the script fills in

| Placeholder | Value |
| --- | --- |
| `__NAME__`, `__DESCRIPTION__`, `__REPO__`, `__AUTHOR__`, `__LICENSE__` | Answers |
| `__SCOPE__` | `scope` (empty when not publishing) |
| `__OWNER__` | `owners` joined with spaces |
| `__LICENSE_NAME__` | Human name of the license for CONTRIBUTING |
| `__EFFECT_VERSION__` | The catalog's `effect` version, for library peer ranges |
| `__NAMESPACE_IMPORT_PACKAGES__` | `effect`, `@effect/*` and `<scope>/*` for the language service |
| `__PKG__`, `__PKG_DESCRIPTION__` | Per package, inside `packages/<name>` |

Line placeholders expand to one line per package, or vanish when there are none:
`__VITEST_PROJECTS__`, `__PACKAGES_TABLE__`, `__PACKAGE_OPTIONS__`, `__WORKSPACE_MAP__`,
`__REPO_STRUCTURE__`.

Blocks between a line containing `@@publish` (or `@@react`, meaning at least one React package) and
a line containing `@@end` are kept only when the condition holds; the marker lines are always
removed.

JSON is edited structurally, not through placeholders: `package.fragment.json` (publish) is merged
into the root `package.json`; `tsconfig.packages.json` gets one reference per package;
`tsconfig.tests.json` gets `paths` from each package name to its `src`; `.oxlintrc.json` gets the
barrel-import patterns for the scope and, with React packages, a React override; each package's
`package.json` and `tsconfig.json` get the keywords, platform dependencies and Node types.
