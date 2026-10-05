# Update rules

Sections: Range style; Reading the Node version; Constraints; Left alone;
Groups; The ladder; Bisection; Checkpoint; Hold reasons; Release notes.

Read this file in Step 2c. Steps 2 to 7 follow it.

## Range style

This skill rewrites four range forms and keeps the form with the new version:
- `x.y.z`, an exact version;
- `^x.y.z`;
- `~x.y.z`;
- `npm:<name>@<range>`, an alias whose `<range>` is an exact, `^`, or `~`
  range.

A range in any other form stays as it is and goes under *Left alone* with the
kind `range form`. The other forms are:
- `workspace:`, `file:`, `link:`, and `catalog:` ranges;
- git and URL ranges;
- `*`, `x`, and `latest`;
- a range with `>=`, `<`, `||`, ` - `, or `.x`.

## Reading the Node version

Read each Node version source of Step 2c as follows:
- `.nvmrc` and `.node-version`: the version in the file. `20` reads as
  `20.0.0`, and `v20.11.0` as `20.11.0`. A value that starts with a letter,
  like `lts/*`, means: take the version from `node -v`;
- `volta.node`: the version as written;
- a workflow file under `.github/workflows/`: the lowest `node-version`
  value in the folder, matrix values included. `20` reads as `20.0.0`;
- `engines.node`: the lowest version the range allows. `>=18` reads as
  `18.0.0`, `^20.9.0` as `20.9.0`, `20.x` as `20.0.0`, and a `||` range as
  the lowest of its parts;
- `node -v`: the running version.

## Constraints

Check every candidate version against the constraints in this order. When a
constraint refuses a candidate version, replace it with the highest rung of
the ladder, defined below, that every constraint allows. When no rung is
allowed, hold the package.

1. **Node version.** The `engines.node` field of the candidate version, from
   the facts file, must allow `<node-version>`. Run:

   ```bash
   npx --yes semver@7 -r '<engines.node>' <node-version>
   ```

   Exit code 0 means allowed. A candidate version without an `engines.node`
   field is allowed.
2. **Peers.** `--peer` makes npm-check-updates cap a candidate version at the
   highest version whose peer ranges allow the installed packages. Keep that
   cap.
3. **`@types/node`.** Its major equals the major of `<node-version>`. Its
   candidate version is the highest version of that major line, the last
   element of:

   ```bash
   npm view '@types/node@<major>' version --json
   ```

   When the current major of `@types/node` is above the major of
   `<node-version>`, hold the package with the reason `@types/node major`.
4. **Overrides.** Hold a package named in `overrides`, `resolutions`, or
   `pnpm.overrides` of the root manifest, with the reason `override`.
5. **Pins.** Step 2e records the held packages and the capped packages from
   these files:
   - Renovate: hold a package in `ignoreDeps` with the reason
     `pinned by <file>`. Hold a package matched by a `packageRules` item
     with `enabled: false` with the same reason. Cap a package matched by a
     `packageRules` item with `allowedVersions` at that range. Exclude a
     manifest under `ignorePaths` from the run;
   - Dependabot: hold a package named by an `ignore` item without
     `update-types` with the reason `pinned by <file>`. Cap a package named
     by an `ignore` item with `version-update:semver-major` at level
     `minor`. Cap a package named by an `ignore` item with both
     `version-update:semver-major` and `version-update:semver-minor` at
     level `patch`;
   - `.ncurc*`: npm-check-updates reads the file on its own. Keep every rule
     that the file applies. Hold a package that the file rejects with the
     reason `pinned by <file>`.
   Lower a capped package to the highest candidate version that its cap
   allows.
6. **Cooldown.** `--cooldown <days>` makes npm-check-updates take the highest
   version published at least `<days>` days before today. npm-check-updates
   also reads `minimumReleaseAge` from `pnpm-workspace.yaml`. A version
   satisfies the cooldown when its publish date, from
   `npm view <name> time --json`, is at least `<days>` days before today.
7. **Deprecated.** `--no-deprecated` excludes deprecated versions. The ladder
   skips every version with a `deprecated` field.
8. **Prerelease.** npm-check-updates excludes prereleases, unless the current
   range is a prerelease. The ladder skips every version with a `-` in it.

## Left alone

Every range and field below stays as it is. The update report lists it under
*Left alone* with its kind:
- `range form`: a range that *Range style* above does not rewrite;
- `workspace member`: the range of a dependency whose name is a workspace
  member of the same install root, in any range form;
- `peerDependencies`: every range in that section, in every manifest;
- `packageManager`: that field of the root manifest;
- `engines`: that field of every manifest.

## Groups

A group is the unit of a major plan entry. Three rules put candidate
packages with bump kind `major` into one group:
- **a scope**: every candidate package whose name starts with the same
  `@<scope>/` prefix, except `@types/`;
- **a twin pair**: `<name>` and `@types/<name>`. For `@<scope>/<name>` the
  twin is `@types/<scope>__<name>`;
- **a peer tie**: a candidate package whose `peerDependencies`, from the
  facts file, names another candidate package of the same install root. The
  named range refuses the other's current version and allows the other's
  candidate version. Run `npx --yes semver@7 -r '<range>' <version>` for
  both versions: exit code 0 means allowed.

Merge two groups that share a package. A candidate package in no group is a
group of one. A group provides a peer dependency to another group in one
case: a candidate package of the second group names a candidate package of
the first group in its `peerDependencies`.

## The ladder

The ladder of a package lists the versions to try below its candidate
version, in order. Take a package with current major `c` and candidate major
`t`. Its rungs are the highest allowed version of major line `t - 1`, then of
major line `t - 2`, down to major line `c + 1`. The highest allowed version of
a major line `n` is the last element of:

```bash
npm view '<name>@<n>' version deprecated --json
```

that meets all of these:
- its `deprecated` field is absent;
- its version has no `-`;
- its publish date satisfies the cooldown;
- its `engines.node` field, from `npm view '<name>@<version>' engines.node`,
  allows `<node-version>`.

A major line with no such version has no rung. A package with no rung keeps
the range of Step 6a.

The first rung of a group moves every package of the group one major line
down from its candidate version. Each later rung moves every package one
major line down from the previous rung. A package of the group with no major
line left keeps the range of Step 6a. Restore the checkpoint before each
apply of a rung, and again when the last rung's apply is broken.

## Bisection

Bisection finds the units that break a failing batch. Its unit is a
package in Step 6a, a group in Step 6b, and a plan entry in Step 7.
1. Split the batch into two halves by plan order.
2. Restore the checkpoint. Apply the first half.
3. Restore the checkpoint. Apply the second half.
4. For a half whose apply is clean, mark every unit of the half as accepted.
5. For a half whose apply is broken and that holds one unit, that unit is
   breaking. In Step 6a and in Step 7, hold that unit. In Step 6b, walk its
   ladder.
6. For a half whose apply is broken and that holds more than one unit,
   bisect that half from rule 1.
7. In Step 6a, when every unit is settled, restore the checkpoint. Apply
   every accepted unit as one batch. In Step 6b, Step 6c does this instead.
8. When the apply of rule 7 is broken, apply the accepted units one at a
   time in plan order. After a clean apply, replace the checkpoint. After a
   broken one, restore the checkpoint. Then hold the unit.

## Checkpoint

- The baseline copy is `<scratch-dir>/baseline/<root>/`. Step 3 copies every
  manifest and the lockfile of the install root into it, with their relative
  paths. Nothing replaces the baseline copy. Step 7 reads it.
- The checkpoint is `<scratch-dir>/checkpoint/<root>/`, taken the same way.
  Step 3 takes it. Steps 6a, 6b, and 6c replace it where they say so. To
  replace the checkpoint: copy the files again.
- To restore the checkpoint:
  1. copy every file of the checkpoint back to its path;
  2. run the frozen install.

## Hold reasons

Write a hold reason as exactly the phrase below that fits, in the plan and
in the report:
- `engines.node <range>`: the range that refuses `<node-version>`;
- `peer of <name>`: the package whose peer range caps the candidate version;
- `@types/node major`;
- `override`;
- `pinned by <file>`;
- `cooldown`: no version of the major line satisfies the cooldown;
- `deprecated`: every version of the major line is deprecated;
- `check: <name>`: the first check command that fails with the candidate
  version;
- `verify: <condition>`: the first Step 7 condition that fails, quoted.

## Release notes

A package under *Needs migration* gets one link. Take the repository URL:

```bash
npm view <name> repository.url homepage --json
```

For a GitHub repository, the link is
`https://github.com/<owner>/<repo>/releases`. Otherwise the link is the
homepage.
