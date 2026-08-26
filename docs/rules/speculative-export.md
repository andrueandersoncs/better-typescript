# speculative-export

## What it does

Reports an exported interface, type alias, or class whose name does not appear in another first-party project file. The test fixture covers an unreferenced exported interface and an allowed interface imported by a separate consumer file.

For `FutureSettlementProjection`, the report is: `FutureSettlementProjection is exported without an independent first-party consumer or established boundary. Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis.`

Same-file references do not establish a consumer. Declaration files and files under `node_modules` are ignored. Exported functions, variables, and enums are not checked.

## When to use it

Use it to keep models local until another first-party file consumes them through an intentional boundary.

## Conformant

```ts
// model.ts
export interface UserProjection { readonly id: string }

// consumer.ts
import type { UserProjection } from "./model.js"
export const user: UserProjection = { id: "1" }
```

## Non-conformant

```ts
export interface FutureSettlementProjection { readonly id: string }
```
