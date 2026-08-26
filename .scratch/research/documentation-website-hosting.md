# Documentation website and hosting

_Checked 2026-08-26. This note uses repository files, GitHub's API and docs, and VitePress's official source and package metadata._

## Recommendation

**Use VitePress and deploy its static output to this repository's GitHub Pages project site.**

Keep the site source in `docs/`. Build it with the repository's pinned Bun version. Deploy only from `main` with one GitHub Actions workflow. The initial URL will be `https://andrueandersoncs.github.io/better-typescript/`.

This is the smallest fit because:

- Better TypeScript is a Go CLI, but its package workspace and local gate already use Bun ([`go.mod`](../../go.mod#L1-L5), [`package.json`](../../package.json#L1-L14), [`scripts/check.sh`](../../scripts/check.sh#L31-L35)).
- The user material is already Markdown: installation, use, and configuration are in [`README.md`](../../README.md#L26-L80), while the rule catalog and distribution notes are in [`docs/`](../../docs/).
- The repository is public, uses `main`, and does not have Pages enabled today ([GitHub repository API](https://api.github.com/repos/andrueandersoncs/better-typescript)). There is no tracked `.github` workflow.
- GitHub Pages hosts static HTML, CSS, and JavaScript from a repository and supports an optional build step. A project site is served below `/<repositoryname>` ([GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)). That matches a public documentation site.
- GitHub recommends a custom Actions workflow when the generator is not Jekyll ([publishing-source docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)). VitePress has an official Pages workflow and requires `base: '/better-typescript/'` for this project URL ([VitePress 1.6.4 deployment guide](https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/guide/deploy.md#github-pages)).

## Small comparison

| Approach | Result | Decision |
| --- | --- | --- |
| GitHub Pages + VitePress + Actions | Reuses Markdown and Bun. Gives a documentation theme and client-side local search. VitePress supports Bun and a nested `docs/` source ([getting started](https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/guide/getting-started.md)); its default theme can build a fuzzy in-browser search index ([search](https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/reference/default-theme-search.md#local-search)). | **Choose this.** |
| GitHub Pages branch publishing + Jekyll | Avoids a custom generator workflow, but branch publishing runs Jekyll by default ([GitHub Pages site creation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#static-site-generators)). It adds a Ruby/Jekyll site model instead of using the existing Bun toolchain. | Do not choose. |
| Separate documentation host | Adds another service without solving a current need. Pages already covers the observed static, public site. | Reconsider only if the site later needs private access or server-side behavior. Pages sites are public, and Pages does not run server-side languages ([publishing warning](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [site creation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#static-site-generators)). |

Use the current stable VitePress release, not its prerelease channel. At this check, npm marks `1.6.4` as `latest` and `2.0.0-alpha.19` as `next` ([official npm registry metadata](https://registry.npmjs.org/-/package/vitepress/dist-tags)). VitePress 1.6.4 requires Node.js 18 or newer and documents Bun commands, so it matches the repository's current Node and Bun prerequisites ([VitePress 1.6.4 getting started](https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/guide/getting-started.md#prerequisites), [`README.md`](../../README.md#L5-L14)). Pin the selected version in `bun.lock` and upgrade it deliberately.

## Proposed site

Keep the first release narrow:

- Home: what Better TypeScript does and one install command.
- Getting started: install, run, file selection, and rule selection.
- Configuration: `better-typescript.json` behavior and examples.
- Rules: publish the existing built-in rule catalog directly.
- Project: architecture, npm distribution, GitHub, license, and security links.

Do not publish `.scratch` notes. Keep `docs/agents/**` and compiler-maintenance notes out of the site build. VitePress supports source exclusion globs ([site configuration](https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/reference/site-config.md#srcexclude)). These files can stay in their current repository locations.

## Implementation plan

1. **Set the content boundary.**
   - Use `docs/` as the VitePress root.
   - Add `docs/index.md`, `docs/getting-started.md`, and `docs/configuration.md`.
   - Move the detailed user guide from `README.md` into those pages. Keep the README short and link to the site.
   - Reuse `docs/rules.md`. Do not create a second rule catalog.
   - Exclude `agents/**` and the named maintainer-only pages with `srcExclude`.

2. **Add the site build.**
   - Add stable VitePress as a root development dependency with Bun.
   - Add `docs:dev`, `docs:build`, and `docs:preview` scripts to `package.json`.
   - Add `docs/.vitepress/config.mts`. Set `base` to `/better-typescript/`. Configure a small nav, sidebar, GitHub link, edit link, and `search.provider: 'local'`.
   - Ignore `docs/.vitepress/cache` and `docs/.vitepress/dist`.
   - Add `bun run docs:build` to `scripts/check.sh` after dependency installation.

3. **Add one Pages workflow.**
   - Create `.github/workflows/docs.yml` from VitePress's official GitHub Pages workflow.
   - Use Bun `1.3.0`, `bun install --frozen-lockfile`, and `bun run docs:build`.
   - Build on pull requests so broken docs cannot merge.
   - On pushes to `main`, upload `docs/.vitepress/dist` with `actions/upload-pages-artifact` and deploy it with `actions/deploy-pages`. This follows GitHub's documented custom-workflow flow ([GitHub publishing-source docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#creating-a-custom-github-actions-workflow-to-publish-your-site)).

4. **Enable and verify.**
   - In repository **Settings → Pages**, select **GitHub Actions** as the source. This is the required setting in both GitHub's and VitePress's guides ([GitHub docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow), [VitePress guide](https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/guide/deploy.md#github-pages)).
   - Run `./scripts/check.sh` and `bun run docs:preview` locally.
   - Verify the home, install, configuration, rules, search, GitHub links, and 404 page under `/better-typescript/`.
   - Merge to `main` and verify the deployed URL.

## Done when

- A pull request cannot pass if the VitePress build fails.
- Only `main` can deploy the Pages environment.
- The published site has the five sections above and working local search.
- The README points to the site.
- No generated site output is committed.

A custom domain, analytics, versioned docs, per-rule generated pages, and a second hosting provider are not part of the first release.
