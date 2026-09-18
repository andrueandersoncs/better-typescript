# Better TypeScript

Type-aware TypeScript linting as a native executable.

```sh
npm install --save-dev @better-typescript/better-typescript
npx better-typescript
```

Run the command from a directory containing `tsconfig.json`. Violations are written as NDJSON to stdout.

Run `npx better-typescript semantic` for working-tree changes, `semantic --files 'src/**/*.ts'` for selected current files, `semantic --all` for all eligible current files, or `semantic --range 'origin/main...HEAD'` for a committed range. Add `--rules function-naming,readonly` to select policies or `--dry-run` to inspect routing. Live semantic lint requires `TYPESAFE_API_KEY`.
