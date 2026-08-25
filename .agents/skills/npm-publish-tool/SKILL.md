---
name: npm-publish-tool
description: Standardize, build, pack, verify, version, and publish TypeScript npm packages with Bun. Use when asked to set up, prepare, test, publish, or release an npm package, npm-distributed TypeScript tool, or package monorepo.
---

# npm Publish Tool

Use Bun as the package manager and release runner. Publish standard npm-compatible artifacts. Make the project conform to one of the two approved layouts below, then run the complete publishing workflow. Apply the package-shape and registry advice in [the npm publishing research](../docs/research/npm-publishing.md) through Bun commands.

## Approved Layouts

### 1. One package

```text
<package-root>/
  src/
    index.ts
    cli.ts      # CLI packages only
  dist/         # generated JavaScript and declarations
  package.json
  bun.lock
  README.md
  LICENSE
```

The package must:

- Declare Bun in `packageManager` and use `bun.lock` as its only lockfile.
- Ship compiled JavaScript and `.d.ts` files from `dist/`.
- Declare its public API with `exports`, including `types`, and point `types` at `dist/index.d.ts`.
- Use `files: ["dist"]`.
- Provide a `build` script and run it from `prepublishOnly`.
- Declare `bin` only for a CLI. Its compiled target must start with `#!/usr/bin/env node` and be executable.
- Put host tools such as ESLint, Prettier, Vite, and TypeScript in `peerDependencies` when the package plugs into their process.

### 2. Package monorepo

```text
<repo-root>/
  package.json    # private Bun-workspaces root
  bun.lock       # the only lockfile
  <workspace-dir>/
    <package>/   # conforms to layout 1
```

The root `package.json` must set `private: true`, declare Bun in `packageManager`, declare workspace globs that cover every package, and provide root commands that build and test all workspaces with Bun. Preserve existing Bun-compatible workspace directories and globs. Every publishable workspace must independently conform to layout 1's source, output, documentation, and manifest rules while using the root `bun.lock`. Never publish the workspace root.

## Workflow

1. Read the repository instructions, manifests, source, lockfiles, and release configuration. Classify the project as one package or a package monorepo.
2. Enforce the matching approved layout before release:
   - For a standalone repository, normalize its package to layout 1.
   - For a repository with workspaces, multiple package roots, or a package nested beneath a monorepo root, normalize or create the layout 2 Bun-workspaces root and normalize every publishable package to layout 1. Keep the monorepo layout even when only one workspace is publishable. Preserve existing Bun-compatible workspace paths and globs.
   - Replace npm, pnpm, and Yarn lockfiles and package-manager commands with Bun.
   - Keep an existing build or release tool only when Bun can run it and it produces the required artifact. Otherwise, configure the simplest Bun and TypeScript setup that does.
3. Apply the requested semantic version with the project's working release workflow through `bun` or `bunx`. When none exists, use `bun pm version <version>`. For a monorepo, finalize every released package version and its internal workspace dependency ranges before creating the release lockfile.
4. Run `bun install` after versioning to create or update the authoritative `bun.lock`, then run `bun install --frozen-lockfile`. Run the build and normal tests with `bun run`. In a monorepo, run workspace scripts from the root with `bun run --workspaces <script>`.
5. From each package being released, run `bun pm pack`. Inspect the generated `.tgz` with `tar -tzf`. Confirm that compiled runtime files, declarations, package metadata, README, and license are present and that source, tests, fixtures, local configuration, and secrets are absent.
6. Create a temporary fixture project with Bun, install each generated `.tgz` with `bun add`, and exercise the documented normal import with Bun. For a CLI package, also run its documented normal command through the installed binary and confirm the shebang and executable bit.
7. Publish the exact artifact that passed the fixture test with `bun publish <generated-tarball>`. Use a trusted CI release workflow configured to install and run Bun when present. Stop after verification when the request is only to set up, prepare, pack, or test the package.
8. Report the approved layout, Bun setup changes, package names and versions, artifact paths, checks run, and publish result. Keep generated tarballs only when they are requested outputs.

Convert every nonconforming project before publishing. Use Bun for every package-management and release command.
