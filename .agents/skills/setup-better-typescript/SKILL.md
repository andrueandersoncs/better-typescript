---
name: setup-better-typescript
description: Set up the Better TypeScript linter in Node.js/npm or Bun TypeScript projects, including single-package repositories and monorepos. Use when asked to add, install, configure, or create a lint script for @better-typescript/better-typescript.
compatibility: Requires Node.js 18 or newer or Bun, a package.json, and a TypeScript project with tsconfig.json.
---

# Set Up Better TypeScript

Set up [`@better-typescript/better-typescript`](https://github.com/andrueandersoncs/better-typescript) in the package from which the linter will run.

## Procedure

1. Detect npm or Bun from `packageManager` and the lockfile, then use that package manager so it updates the existing lockfile.
2. Choose the setup package:
   - In a single-package repository, use the repository root.
   - In a monorepo, use the root when running there analyzes all intended code. Otherwise use each requested TypeScript workspace. Ask about scope only when it is unclear.
   - The chosen directory must contain both `package.json` and `tsconfig.json`, because `better-typescript` loads `./tsconfig.json` from its working directory.
3. Add the dev dependency in the chosen package:

   **npm**

   ```sh
   npm install --save-dev @better-typescript/better-typescript
   ```

   **Bun**

   ```sh
   bun add --dev @better-typescript/better-typescript
   ```

   Run the command in the chosen directory.
4. Add this exact script to the chosen `package.json`, preserving all other fields and scripts:

   ```json
   "lint:bts": "better-typescript"
   ```

5. Configure the linter only when the user requests file or rule selection. Create `better-typescript.json` beside the chosen `tsconfig.json`. All rules already run by default, so do not create an empty or no-op config.

   ```json
   {
     "commands": [
       {
         "type": "add_inclusions",
         "files": "src/**/*.ts",
         "rules": ["no-throw", "no-error-type"]
       },
       {
         "type": "add_exclusions",
         "files": "src/**/*.test.ts",
         "rules": "no-throw"
       }
     ]
   }
   ```

   Use only the file globs and rule names the user wants. Commands apply in order. `add_inclusions` replaces the active rules for matching files, and `add_exclusions` removes rules. Globs are relative to the chosen directory.
6. Run the new script from the chosen directory:

   **npm**

   ```sh
   npm run lint:bts
   ```

   **Bun**

   ```sh
   bun run lint:bts
   ```

   Confirm that the command analyzes the intended project. A completed analysis exits successfully even when it reports violations; do not fix those violations unless asked.
