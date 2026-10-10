# no-reexports

## What it does

Reports `export *`, namespace exports, named specifiers in `export { ... } from`, and `export import x = ...`. It also reports local named export specifiers and `export default` / `export =` of an identifier or dotted member whose root text matches a forwarded name. Forwarded names are top-level ES-import and `import =` bindings, plus top-level `const` aliases whose whole initializer is a forwarded name or a dotted member of one. It does not resolve symbols. An exported `const` alias such as `export const parse = parseItem` is reported by `no-value-aliases`.

## When to use it

Use this rule when each module should import its own dependencies and expose a locally defined public interface.

## Conformant

```ts
import * as dependency from "./dependency"

export const wrapped = { value: dependency.item }
```

## Non-conformant

```ts
export { item } from "./dependency"
```

```ts
import * as dependency from "./dependency"

const member = dependency.item
export { member }
export default dependency.item
```

```ts
import implementation = require("./implementation")

export = implementation
```
