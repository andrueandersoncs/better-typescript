# boundary-schema-decode

## What it does

Reports `JSON.parse(...)` with non-literal input and boundary-shaped `.json()` calls when the surrounding function has no recognized decode call. A string literal passed to `JSON.parse(...)` is not boundary data and is allowed. Boundary receiver names include `request`, `req`, `body`, `payload`, and `event`. The recognized names are `decodeUnknown`, `decodeUnknownEffect`, `decodeUnknownSync`, `decodeUnknownOption`, `decodeUnknownEither`, `decodeUnknownResult`, `decodeUnknownExit`, `decodeUnknownPromise`, `decode`, `decodeEffect`, `decodeSync`, `decodeOption`, `decodeEither`, `decodeResult`, `decodeExit`, and `decodePromise`.

## When to use it

Use it to decode unknown JSON at the boundary before application code consumes it.

## Conformant

```ts
declare const Schema: any
declare const Person: any

function read(request: any) {
  const raw = request.json()
  return Schema.decodeUnknownEffect(Person)(raw)
}
```

## Non-conformant

```ts
function read(request: any) {
  return request.json()
}
```
