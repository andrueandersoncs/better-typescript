# no-module-mocking

## What it does

Reports global module mocking in tests:

- Vitest `vi.mock`, `vi.doMock`, `vi.unstable_mockModule` and Jest `jest.mock`, `jest.doMock`, `jest.setMock`, `jest.unstable_mockModule`.
- `mock.module` from `bun:test` or `node:test`, including a `node:test` test context's `t.mock.module` (any receiver whose type is node:test's `MockTracker`).
- `vi.spyOn` or `jest.spyOn` on a module namespace import or a `require()` result.
- Calls to `proxyquire` or `rewire`, and `__set__`, `__Rewire__`, or `__ResetDependency__` calls on a `rewire` result or a module namespace import.

The test API is followed through imports, re-exports from helper modules, `const` aliases, destructuring, namespace imports (`v.vi.mock`, including a namespace import of a helper that re-exports `vi`), and `require()` (`require("vitest").vi.mock`).

## When to use it

Use it when tests must replace dependencies through real interfaces or services.

## Conformant

```ts
const store = new InMemoryUserStore()
```

## Non-conformant

```ts
vi.mock("./user-store")

const testApi = vi
testApi.doMock("./user-store")

import * as userStore from "./user-store"
vi.spyOn(userStore, "load")
```
