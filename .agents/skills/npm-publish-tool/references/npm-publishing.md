Most TypeScript developer tools are distributed as **npm packages**—usually compiled JavaScript plus type declarations—and often expose a command-line executable through `package.json`’s `bin` field. ESLint is the canonical example: you install it locally as a dev dependency, then invoke it through package-manager scripts or `npx`/`npm exec`.

## Typical package layout

A publishable TypeScript tool commonly looks like this:

```text
my-tool/
  src/
    cli.ts
    index.ts
  dist/
    cli.js
    index.js
    cli.d.ts
    index.d.ts
  package.json
  README.md
  LICENSE
```

The author writes TypeScript under `src/`, runs a build step (`tsc`, tsup, Rollup, etc.), and publishes the generated runtime files—normally `dist/`—to npm.

A package’s `package.json` defines:

- Its package identity and semantic version (`name`, `version`)
- Its public runtime entry point (`main`, often `exports`)
- Its TypeScript declarations (`types`)
- Its command name(s) (`bin`)
- What gets included in the published npm tarball (`files`)

The npm `files` allowlist is commonly used to publish only `dist/`, documentation, and licensing material rather than the entire repository. npm always includes important metadata such as `package.json`, README/license files, and declared main/bin files. [docs.npmjs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)

## CLI tool example

For a tool called `my-linter`, a modern package manifest might be:

```json
{
  "name": "@acme/my-linter",
  "version": "1.2.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "types": "./dist/index.d.ts",
  "bin": {
    "my-linter": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup src/index.ts src/cli.ts --format esm --dts",
    "prepublishOnly": "npm run build"
  }
}
```

The compiled CLI needs a Node shebang:

```ts
#!/usr/bin/env node

import { run } from "./index.js";

await run(process.argv.slice(2));
```

When installed, npm links the `bin` target into the consuming project’s `node_modules/.bin`. That is why this works without global installation:

```json
{
  "scripts": {
    "lint": "my-linter ."
  }
}
```

```bash
npm run lint
# or
npx my-linter .
```

npm documents that `bin` entries become executable commands when global-installed, and are available to package scripts / `npm exec` when installed locally. [docs.npmjs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)

## How ESLint-style tools differ

ESLint’s ecosystem is really several package types:

| Package kind | Naming pattern | What it exports |
|---|---|---|
| Core CLI | `eslint` | The linter engine and `eslint` executable |
| Plugin | `eslint-plugin-foo` or `@scope/eslint-plugin-foo` | A plugin object: rules, processors, configurations |
| Shareable config | `eslint-config-foo` or `@scope/eslint-config-foo` | A configuration object |
| Parser / language integration | e.g. TypeScript ESLint packages | Parser services, rules, and related integrations |

A plugin typically has no CLI of its own. ESLint loads it as a module and reads its exported plugin object. ESLint recommends declaring `eslint` as a **peer dependency** for plugins, so the host project controls the single ESLint version used at runtime. [eslint](https://eslint.org/docs/latest/extend/plugins)

A config package similarly publishes a normal module, generally with ESLint in `peerDependencies`; ESLint recommends the `eslint` and `eslintconfig` keywords for discovery. [eslint](https://eslint.org/docs/latest/extend/shareable-configs)

Example plugin shape:

```ts
import type { ESLint, Linter } from "eslint";

const plugin: ESLint.Plugin = {
  meta: {
    name: "@acme/eslint-plugin-quality",
    version: "1.0.0"
  },
  rules: {
    "no-foo": {
      meta: {
        type: "problem",
        docs: { description: "Disallow foo" },
        schema: [],
        messages: { forbidden: "Avoid foo." }
      },
      create(context) {
        return {
          Identifier(node) {
            if (node.name === "foo") {
              context.report({ node, messageId: "forbidden" });
            }
          }
        };
      }
    }
  }
};

export default plugin;
```

```json
{
  "name": "@acme/eslint-plugin-quality",
  "peerDependencies": {
    "eslint": "^9.0.0 || ^10.0.0"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

## Common publishing workflow

1. Compile source to distributable JS and `.d.ts` files.
2. Test the actual package artifact with `npm pack`, ideally installing that `.tgz` into a fixture project.
3. Ensure the CLI target is executable and has a shebang, if applicable.
4. Use `files` or `.npmignore` to keep source, test fixtures, local configs, and secrets out of the tarball.
5. Publish with `npm publish`, typically from CI with trusted publishing or a scoped registry token.
6. Release versions with Changesets, semantic-release, or a conventional-commit pipeline.

For TypeScript specifically, package authors generally bundle declaration files alongside the runtime package and point `types` at the main `.d.ts`; the alternative is publishing separately through DefinitelyTyped under `@types/*`, which is mainly for packages that do not ship their own types. [typescriptlang](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

## Practical defaults

For a new TypeScript dev-tool package today:

- Ship **compiled JS**, not raw `.ts`, unless you deliberately require a runtime loader.
- Use `exports` to define your supported import surface and avoid accidental deep imports.
- Add `types` / `types` conditions and emit `.d.ts`.
- Publish a CLI only if users execute the package directly; otherwise make it a library/plugin/config package.
- Make host tools such as ESLint, Prettier, Vite, or TypeScript **peer dependencies** when your package plugs into their process.
- Keep the tool project-local (`devDependencies`) so projects get reproducible versions through the lockfile, while users run it via scripts.

In short: ESLint is an npm-distributed Node package with a CLI; ESLint plugins/configs are also npm packages, but loaded programmatically by the ESLint process rather than executed directly.