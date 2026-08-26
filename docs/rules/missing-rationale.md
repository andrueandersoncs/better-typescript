# missing-rationale

## What it does

Checks supported top-level data declarations and reports when the text since the previous top-level statement contains no `//` comment text with the case-insensitive substring `because`. Comments may be multiple lines, separated by blanks, and need not be directly adjacent. The report says: “RequestData lacks a complete, structurally supported data-structure rationale. Delete or reuse this concept before documenting it. If it remains, add one single-line comment directly above the declaration explaining because why existing concepts are insufficient. The prose does not suppress structural evidence.” It checks data interfaces, non-function type aliases, enums, Effect data classes, and exported Schema values.

## When to use it

Use it to require a clear reason for each new data concept.

## Conformant

```ts
// ResponseData exists because callers share the same response.
export interface ResponseData { readonly id: string }
```

## Non-conformant

```ts
export interface RequestData { readonly id: string }
```
