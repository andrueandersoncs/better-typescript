# http-response-validation

## What it does

Reports any call named `json` unless an enclosing expression or any node in its nearest function calls `decodeUnknown`, `decodeUnknownEffect`, `decodeUnknownSync`, `decodeUnknownOption`, `decodeUnknownEither`, `decodeUnknownResult`, `decodeUnknownExit`, `decodeUnknownPromise`, `decode`, `decodeEffect`, `decodeSync`, `decodeOption`, `decodeEither`, `decodeResult`, `decodeExit`, `decodePromise`, `schemaBodyJson`, `schemaJson`, or `schemaNoBody`. Matching uses only the final callee name. It does not require a Schema receiver, data-flow relation, or ordering. The report says: “Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.”

## When to use it

Use it at HTTP adapter boundaries where response data is unknown.

## Conformant

```ts
declare const Schema: any
declare const Payload: any
function load(response: any) {
  return Schema.decodeUnknownEffect(Payload)(response.json())
}
```

## Non-conformant

```ts
function load(response: any) {
  return response.json()
}
```
