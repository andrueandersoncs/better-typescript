# Better TypeScript

Better TypeScript is a Go linter for TypeScript projects. It uses a pinned public `typescript-go` compiler module and runs all syntax- and type-aware rules in one AST pass per root source file.

`better-typescript semantic` reads complete changed, selected, or committed-range files, then asks TypeSafe Noul questions over bounded source spans and selected candidates for each policy.

Read the documentation at [andrueandersoncs.github.io/better-typescript](https://andrueandersoncs.github.io/better-typescript/).

## Install

```sh
npm install --save-dev @better-typescript/better-typescript
npx better-typescript
```
