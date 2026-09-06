# prefer-inferred-types

## What it does

Reports redundant annotations when inference preserves the same type. It checks `const` initializers unless the initializer is a generic call or participates in a dependency cycle with the declared variable. It visits returns only on function declarations and `const`-initialized arrow and function expressions. A non-variable contextual arrow reports only for a non-generic call when no earlier argument in the same call is `[]`, there is exactly one contextual signature, every parameter is explicitly annotated and its checker-rendered type text matches the contextual parameter type, and any return annotation is equivalent to the inferred single result.

## When to use it

Use it to remove redundant annotations from `const` initializers, function declarations, and `const`-initialized arrow and function expressions. Keep annotations that widen values, guide generic inference, or break recursive inference cycles. In the visited return forms, an equivalent annotation is reported unless it is a type predicate or the body is not a single result expression. Methods and non-`const` function values are not visited for return annotations. A non-variable contextual arrow is checked only for a non-generic call when no earlier argument in the same call is `[]`, there is exactly one contextual signature, every parameter is explicitly annotated and its checker-rendered type text matches the contextual parameter type, and any return annotation is equivalent to the inferred single result.

## Conformant

```ts
export const state: "open" | "closed" = "open"
```

## Non-conformant

```ts
class Point {}
export const origin: Point = new Point()
```
