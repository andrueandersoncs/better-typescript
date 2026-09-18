# Better TypeScript

Type-aware TypeScript linting as a native executable.

```sh
npm install --save-dev @better-typescript/better-typescript
npx better-typescript
```

Run the command from a directory containing `tsconfig.json`. Violations are written as NDJSON to stdout.

Run `npx better-typescript semantic --range 'origin/main...HEAD'` for a committed pull-request range or add `--dry-run` to inspect routing. Live semantic lint requires `TYPESAFE_API_KEY`.
