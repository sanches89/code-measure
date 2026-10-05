# Package managers

Read this file in Step 2b. Run every command of this file from the install
root.

## Detection

The `packageManager` field of the root manifest, such as `pnpm@9.12.0`,
names the package manager and its version. Without the field, the lockfile
beside the root manifest names the package manager:
- npm: `package-lock.json` or `npm-shrinkwrap.json`;
- pnpm: `pnpm-lock.yaml`;
- yarn 1: `yarn.lock` without a `.yarnrc.yml` beside it;
- yarn 2 or newer: `yarn.lock` with a `.yarnrc.yml` beside it;
- bun: `bun.lock` or `bun.lockb`.

With two lockfiles beside one root manifest and no `packageManager` field,
ask one question: which package manager the project uses.

## Workspace file

- npm, yarn, and bun: the `workspaces` field of the root manifest. The field
  is a list of globs, or an object whose `packages` field is that list.
- pnpm: the `packages` list of `pnpm-workspace.yaml` beside the root
  manifest.

## Install commands

The frozen install succeeds only when the lockfile matches the manifests.
The plain install rewrites the lockfile.
- npm: frozen `npm ci`, plain `npm install`.
- pnpm: frozen `pnpm install --frozen-lockfile`, plain `pnpm install`.
- yarn 1: frozen `yarn install --frozen-lockfile`, plain `yarn install`.
- yarn 2 or newer: frozen `yarn install --immutable`, plain `yarn install`.
- bun: frozen `bun install --frozen-lockfile`, plain `bun install`.

## Recursive run command

Each command skips a member without the script.
- npm: `npm run <script> --workspaces --if-present`.
- pnpm: `pnpm -r --if-present run <script>`.
- yarn 1: `yarn workspace <member name> run <script>`, once per member whose
  manifest defines the script.
- yarn 2 or newer: `yarn workspaces foreach -A --topological run <script>`.
- bun: `bun run --filter '*' <script>`.

## Peer report

A problem is:
- npm: a line with `missing:` or `invalid:` in the output of
  `npm ls --depth=0`;
- pnpm: a line under `Issues with peer dependencies found` in the output of
  the plain install;
- yarn 1: a line with `unmet peer dependency` or `incorrect peer dependency`
  in the output of the plain install;
- yarn 2 or newer: a line with `YN0002` or `YN0060` in the output of the
  plain install;
- bun: none. bun prints no peer report.

## Version

When the `packageManager` field names a major that the package manager on
PATH lacks, run the package manager as follows in every command:
- npm: `npx --yes npm@<version> <arguments>`.
- pnpm: `npx --yes pnpm@<version> <arguments>`.
- yarn 1: `npx --yes yarn@<version> <arguments>`.
- yarn 2 or newer, with `yarnPath` set in `.yarnrc.yml`: `yarn <arguments>`.
  The yarn on PATH delegates to the release that `yarnPath` names.
- yarn 2 or newer, without `yarnPath`, with `corepack` on PATH:
  `corepack yarn <arguments>`.
- yarn 2 or newer, without `yarnPath` and without `corepack`: ask one
  question: which yarn to run.
- bun: `npx --yes bun@<version> <arguments>`.
