# http-status-decode-order

## What it does

In the nearest enclosing function, reports calls ending in `json`, `text`, `arrayBuffer`, `blob`, `formData`, or `bytes` when no earlier recursive AST visit sees a property named `status`, `ok`, or `statusText`, or a call named `filterStatusOk`, `filterStatus`, or `matchStatus`. It applies the same check to `decodeUnknown`, `decodeUnknownEffect`, `decode`, `decodeEffect`, `schemaBodyJson`, `schemaJson`, and `schemaNoBody` only when the function also contains a listed body/classifier call or `execute`, `get`, `post`, `put`, `patch`, or `del`. Names and order are syntactic; receivers, symbols, data flow, and control flow are not resolved.

## When to use it

Use it when an HTTP adapter reads a response body.

## Conformant

```ts
async function load(response: any) {
  if (!response.ok) throw new Error()
  return response.json()
}
```

## Non-conformant

```ts
async function load(response: any) {
  const body = await response.json()
  if (!response.ok) throw new Error()
  return body
}
```
