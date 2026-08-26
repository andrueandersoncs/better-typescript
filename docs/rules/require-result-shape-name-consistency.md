# require-result-shape-name-consistency

## What it does

Checks whether the first operation word in a callable name matches its written return annotation. The rule lowercases that text and uses the first matching classification:

- Text containing `=>` is `callable`.
- Text containing `boolean` or ` is ` is `boolean`. The ` is ` test covers written type predicates.
- Text containing `number` is `number`.
- Text containing `void` is `void`.
- Text containing `record<` or `map<` is `keyed`.
- Text containing `readonlyarray`, `array<`, or `set<`, or ending in `[]`, is `collection`.
- Text containing `string` is `string`.
- Other nonempty text is `object`. A missing annotation is `unknown`.

`average`, `count`, and `sum` require `number`. `group` and `index` require `keyed`. `filter` and `map` require `collection`. `boolean` results are ignored.

The tested violation reports exactly: `countUsers claims a number result via count, but returns string. Align the name with the actual result, or change the return type to number. Keep strong operation words only when the result shape matches.`

It checks identifier-named function declarations, methods, and variables initialized with arrow functions or function expressions. Other leading words are allowed.

## When to use it

Use it when operation words such as `count` should reliably describe the shape returned by a function.

## Conformant

The fixture allows a matching numeric count and an unrelated function name:

```ts
const countItems = (): number => 0
declare function parseValue(): string
```

## Non-conformant

The fixture reports a count that returns a string:

```ts
const countUsers = (): string => "0"
```
