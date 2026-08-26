# Build and host the documentation website

## Original request

we need to build and host a documentation website for this project. possibly hosted on github pages?

propose a plan

## Finalized plan

1. Add `vitepress@1.6.4` as a root development dependency in `package.json` and update `bun.lock` with Bun 1.3.0. Add one `docs:build` script that runs `vitepress build docs`.

2. Add `docs/.vitepress/config.mts` for the project site. Set the title and description, `base: "/better-typescript/"`, and a small default-theme navigation/sidebar for Home, Getting Started, Configuration, Rules, and Project. Exclude `agents/**`, `compiler-foundation.md`, `effect-snapshot.md`, and `project-local-custom-rules.md` from the source so internal agent, compiler-maintenance, snapshot, and research material is not published.

3. Create the public documentation pages from current repository text:
   - `docs/index.md`: what Better TypeScript does and the npm install command.
   - `docs/getting-started.md`: prerequisites, installation, running the CLI, file selection, and rule selection from `README.md`.
   - `docs/configuration.md`: the `better-typescript.json` behavior, example, CLI precedence, and NDJSON output contract from `README.md`.
   - `docs/rules.md`: keep the existing rule catalog as its single source.
   - `docs/project.md`: the architecture summary from `ARCHITECTURE.md`, npm distribution link, and links to the GitHub repository, license, and security policy.

4. Shorten `README.md` to the project summary, install command, and a link to `https://andrueandersoncs.github.io/better-typescript/`; remove the detailed usage and configuration text now owned by the documentation pages.

5. Add `docs/.vitepress/cache/` and `docs/.vitepress/dist/` to `.gitignore`. Update `scripts/check.sh` to run `bun run docs:build` immediately after its existing frozen Bun install so the normal repository gate verifies the site without committing generated output.

6. Create `.github/workflows/docs.yml` as the single GitHub Pages workflow. On pushes to `main`, check out the repository, install Bun 1.3.0, run `bun install --frozen-lockfile`, run `bun run docs:build`, configure Pages, upload `docs/.vitepress/dist`, and deploy it with the required `contents: read`, `pages: write`, and `id-token: write` permissions and the `github-pages` environment.

7. Run `./scripts/check.sh` and confirm `docs/.vitepress/dist/index.html` is produced while the excluded Markdown is absent from the output. In GitHub repository **Settings → Pages**, select **GitHub Actions** as the source, push the changes to `main`, confirm the Pages workflow succeeds, and verify `https://andrueandersoncs.github.io/better-typescript/` serves the Home, Getting Started, Configuration, Rules, and Project pages under the configured base path.

## Verification verdict

APPROVED
