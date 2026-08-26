# http-client-preference

## What it does

Reports an identifier call named `fetch` nested under a `tryPromise` call whose receiver text ends in `Effect`, unless the file text contains the substring `HttpClient` or `FetchHttpClient`. The report says: “Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless a documented raw-fetch exception applies.” Direct `fetch` outside such a call is allowed.

## When to use it

Use it for Effect-based HTTP adapters.

## Conformant

```ts
fetch("https://example.com")
```

## Non-conformant

```ts
declare const Effect: any
Effect.tryPromise(() => fetch("https://example.com"))
```
