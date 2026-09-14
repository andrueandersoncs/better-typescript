# no-service-constructor-imports

## What it does

Reports named `make<CapabilityName>` imports from relative modules outside test and spec files.

## When to use it

Use it to keep Effect service construction in the owning Layer and let requirements reach the composition root.

## Conformant

```ts
import { IssueServiceLayer } from "./issue-service"
```

## Non-conformant

```ts
import { makeIssueService } from "./issue-service"
```
