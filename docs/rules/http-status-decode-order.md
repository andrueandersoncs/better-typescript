# http-status-decode-order

## What it does

Reports a resolved response JSON value that is decoded as a successful domain body before the same response has a recognized status classifier. It recognizes a direct `HttpClientResponse.filterStatusOk`, `filterStatus`, or `matchStatus` composition and simple Web `response.ok` guards in the same straight-line sequence. A different response, `statusText` logging, or a nested unrelated classifier does not count. Error-body decoders and joint status/body codecs remain valid.

Raw `unknown` and `Schema.Json` adapters do not claim a successful domain body. Reassigning a tracked value invalidates its local body/classification evidence.

## When to use it

Use it when an adapter interprets a successful HTTP body.

## Conformant

```ts
import { Effect, Schema } from "effect"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"

const User = Schema.Struct({ id: Schema.String })

const load = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.flatMap(HttpClientResponse.filterStatusOk(response), (ok) =>
    Effect.flatMap(ok.json, Schema.decodeUnknownEffect(User)))
```

## Non-conformant

```ts
import { Schema } from "effect"

const User = Schema.Struct({ id: Schema.String })

async function load(response: Response) {
  return Schema.decodeUnknownEffect(User)(await response.json())
}
```
