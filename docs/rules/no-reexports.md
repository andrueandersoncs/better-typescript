# no-reexports

## What it does

Reports `export *`, namespace exports, and named specifiers in `export { ... } from`. It also reports local named export specifiers and bare-identifier export assignments whose local text matches a top-level default, namespace, or named ES-import binding. It does not resolve symbols, collect `import =` bindings, or inspect member or compound export-assignment expressions.

## When to use it

Use this rule when each module should import its own dependencies and expose a locally defined public interface.

## Conformant

```ts
export const item = 1
```

## Non-conformant

```ts
export { item } from "./dependency"
```
