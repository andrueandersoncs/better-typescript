# npm package publishing

Apply this recipe within the selected `ship-change` release mode for an npm-distributed TypeScript package. Preserve the repository's working package manager, workspace layout, build tool, and release configuration unless changing them is the requested outcome. Use [the npm publishing research](npm-publishing.md) for package-shape and registry details.

## Package contract

A publishable package should:

- ship compiled JavaScript and declarations rather than repository-only source, unless it deliberately requires an explicit runtime loader;
- declare its public API through `exports`, including `types`;
- limit package contents with `files` or an equivalent allowlist;
- expose `bin` only for a CLI, with a Node-compatible shebang and executable target;
- include the package metadata, README, and license its consumers require;
- keep tests, fixtures, local configuration, and secrets out of the artifact.

For a workspace repository, publish only intended package workspaces. Preserve the root's workspace and lockfile conventions and finalize internal dependency ranges before packaging.

## Release recipe

1. Inspect the repository instructions, manifests, source, lockfile, build output, and release configuration.
2. Apply the requested semantic version through the repository's established release command.
3. Install from the authoritative lockfile, then run the package build and required checks with the repository's package manager.
4. Create the package tarball with the repository's npm-compatible pack command.
5. Inspect the tarball contents. Confirm required runtime files, declarations, metadata, README, and license are present and repository-only files and secrets are absent.
6. Create a temporary consumer project, install that exact tarball, and exercise the documented normal import. For a CLI, also run the installed binary and confirm its shebang and executable behavior.
7. Before publication, establish the registry- and authority-appropriate recovery action. Publish the exact tarball that passed the consumer exercise with the repository's trusted registry command or CI release workflow.
8. Read the published package back from the registry when the release process supports it and compare its identity and version with the verified artifact.

Stop after artifact verification when publication was not requested. Remove temporary consumer projects and generated tarballs unless they are requested outputs or required release artifacts.

## Evidence

Record the package name and version, tarball path, inspected contents, consumer exercise, exact publication command or workflow, and registry result.
