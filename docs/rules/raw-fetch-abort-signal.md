# raw-fetch-abort-signal

## What it does

For an exact textual `Effect.tryPromise` or `tryPromise` call, scans the entire call text with `(?:\bfetch|(?:globalThis|window|self)\.fetch)\s*\(`. This is not AST fetch recognition: it can match custom/qualified calls such as `client.fetch` or `$fetch` and text in comments or strings. Parameter extraction is also a whole-call regex and need not identify the callback parameter. It reports unless a regex extracts a parameter name and the whole call text contains `signal: <name>`, `signal:<name>`, or, for a parameter named signal, matches `\{[^}]*\bsignal\b`. This brace-delimited regex is applied to the entire call text. It can match a callback block and is not an AST object-literal check. The accepted occurrence is not required to be fetch's init.signal.

## When to use it

Use this broad whole-call text check as a cancellation prompt around fetch-like text in `tryPromise`. It does not prove that the call is raw `fetch`, that the extracted name is the callback signal, or that an accepted `signal` occurrence is `fetch`’s `init.signal`.

## Conformant

```ts
declare const Effect: {
  tryPromise<A>(f: (signal: AbortSignal) => Promise<A>): unknown
}
Effect.tryPromise((signal) => fetch("/ok", { signal }))
```

## Non-conformant

```ts
declare const Effect: {
  tryPromise<A>(f: (signal: AbortSignal) => Promise<A>): unknown
}
Effect.tryPromise((signal) => fetch("/bad"))
```
