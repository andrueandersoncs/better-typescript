# prefer-function-for-repeated-shape

## What it does

Reports the third substantial sibling variable, function, or expression statement with the same token shape. A statement is substantial when it has at least 24 non-semicolon tokens. Matching ignores formatting, semicolons, identifier names, and literal values while preserving token kinds and identifier reuse. At least two distinct identifiers must remain unchanged at corresponding positions. The diagnostic identifies the first two matching lines.

## When to use it

Use it to extract repeated structure into a regular or higher-order function. Pass the differing expressions as parameters.

## Conformant

```ts
const first = decode(schemaA)(inputA)
const second = decode(schemaB)(inputB)
```

## Non-conformant

```ts
const assetTag = yield* Schema.decodeUnknownEffect(AssetSchema.fields.assetTag)(args.assetTag.trim())
  .pipe(Effect.mapError(BrowserModel.fieldFailure("assetTag")))
const name = yield* Schema.decodeUnknownEffect(AssetSchema.fields.name)(args.name.trim())
  .pipe(Effect.mapError(BrowserModel.fieldFailure("name")))
const model = yield* Schema.decodeUnknownEffect(AssetSchema.fields.model)(args.model.trim())
  .pipe(Effect.mapError(BrowserModel.fieldFailure("model")))
```
