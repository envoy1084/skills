# Adding an app

The script does not render apps: framework generators change faster than templates. Add each app
after the workspace passes `pnpm check`, then bring it in line with the workspace.

## 1. Generate

Run the framework's own generator into `apps/<name>` with its latest version, skipping its git init,
install and linters:

- **TanStack Start**: `pnpm create @tanstack/start@latest apps/<name>` (no add-ons you do not need;
  no ESLint, Prettier or Biome).
- **Next.js**: `pnpm create next-app@latest apps/<name> --ts --app --src-dir --no-eslint
  --use-pnpm --skip-install --disable-git` (add `--tailwind` if wanted).
- **Anything else**: the framework's documented `create` command, with the same skips.

## 2. Normalize

1. `package.json`: name `<scope>/<app>` (or `<name>-<app>` without a scope), `"private": true`,
   `"type": "module"`; remove its `packageManager`, `engines` and lint/format scripts. Keep the
   framework's `dev`, `build` and `start`, and add `"typecheck": "tsc --noEmit -p tsconfig.json"`.
2. Dependencies: exact latest versions. Move a version another package also uses into the catalog
   (`catalog:`); depend on workspace packages with `workspace:^`.
3. Delete the generated ESLint, Prettier and Biome configs, `.gitignore` files the root already
   covers, lockfiles, `.vscode/` and README boilerplate.
4. `tsconfig.json`: keep the framework's (apps are not part of the `tsc -b` references), add
   `"verbatimModuleSyntax": true`, `"exactOptionalPropertyTypes": true` and the Effect
   language-service plugin block from `tsconfig.base.json`, and keep the framework's path aliases.
5. Workspace packages export their TypeScript source during development. Vite-based frameworks
   compile it as is; Next.js needs `transpilePackages: ["<scope>/<package>", …]` in
   `next.config.ts`.
6. Root scripts: add the app to `build` and `typecheck`:
   `"build": "tsc -b tsconfig.packages.json && pnpm --recursive --parallel --filter \"./packages/*\" --filter \"./apps/*\" run build"`,
   `"typecheck": "effect-tsgo tsrs -b tsconfig.json && pnpm --recursive --filter \"./apps/*\" run typecheck"`
   (the same for `typecheck:tsc` with `tsc -b`).
7. Lint: add an override to `.oxlintrc.json` for `apps/<name>/**` with
   `"plugins": ["react", "jsx-a11y", "react-perf"]` (plus `"nextjs"` for Next.js),
   `"react/react-in-jsx-scope": "off"`, `"react/rules-of-hooks": "error"` and
   `"react/exhaustive-deps": "error"`. Add generated files to `ignorePatterns` in `.oxlintrc.json`
   and `excludes` in `dprint.json` (`.next`, `.output` and `routeTree.gen.ts` are already there).
8. Tests: add `project("<scope>/<app>", "apps/<name>", { test: { environment: "jsdom" } })` to
   `vitest.config.ts` and `"./apps/*/test/**/*.ts"`, `"./apps/*/test/**/*.tsx"` to
   `tsconfig.tests.json` if the app has tests.
9. Remove the generator's sample comments and placeholder content.
10. Update the workspace maps in `AGENTS.md` and `CONTRIBUTING.md`.

Several apps with slow builds are the one case for Turborepo: add `turbo` with a root `turbo.json`
caching `build` (outputs `dist/**`, `.next/**`, `.output/**`) and `typecheck`, and point the root
`build` and `typecheck` scripts at `turbo run`. Libraries alone never need it: `tsc -b` is
incremental.

## 3. Verify

`pnpm install`, `pnpm format`, `pnpm check`, then the app's `dev` and `build` once. Commit as
`feat(<name>): add <framework> app`.
