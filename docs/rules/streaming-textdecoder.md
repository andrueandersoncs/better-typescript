# streaming-textdecoder

## What it does

Reports a built-in `TextDecoder.decode` call while mapping chunks directly from a resolved `Stream.fromReadableStream` whose `evaluate` callback returns the `body` of a locally awaited native `fetch` response. It reports a recreated decoder, or a retained decoder that omits `stream: true` or explicitly sets it to `false`.

## When to use it

Use it when a directly fetched response body supplies arbitrary UTF-8 fragments. Keep one decoder outside the mapping callback and decode each fragment in streaming mode.

The rule deliberately does not treat every `ReadableStream<Uint8Array>` or `Response.body` as arbitrary fragmentation. Generic and framed readable streams, constructed responses, complete buffers, custom `decode` methods, unknown sources, and dynamic options are outside its scope.

It does not verify terminal flushing. `Stream.decodeText` preserves state for chunks but does not establish a general `decoder.decode()` EOF flush guarantee; completion, error, cancellation, and framing semantics need their own protocol-specific proof.

## Conformant

```ts
import { Stream } from "effect"

const decoder = new TextDecoder()

export async function decodeResponse() {
  const response = await fetch("/bytes")
  return Stream.fromReadableStream({
    evaluate: () => response.body!,
    onError: (cause) => new Error(String(cause))
  }).pipe(Stream.map((chunk) => decoder.decode(chunk, { stream: true })))
}
```

## Non-conformant

```ts
import { Stream } from "effect"

const decoder = new TextDecoder()

export async function decodeResponse() {
  const response = await fetch("/bytes")
  return Stream.fromReadableStream({
    evaluate: () => response.body!,
    onError: (cause) => new Error(String(cause))
  }).pipe(Stream.map((chunk) => decoder.decode(chunk)))
}
```
