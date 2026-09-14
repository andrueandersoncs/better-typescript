# no-module-mocking

## What it does

Reports Vitest and Jest `mock`, `doMock`, and `unstable_mockModule` calls.

## When to use it

Use it when tests must replace dependencies through real interfaces or services.

## Conformant

```ts
const store = new InMemoryUserStore()
```

## Non-conformant

```ts
vi.mock("./user-store")
```
