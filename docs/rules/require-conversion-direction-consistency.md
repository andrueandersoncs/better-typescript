# require-conversion-direction-consistency

## What it does

Checks supported identifier-named callables only when they have at least one parameter and a non-boolean return shape. Comparisons use the first parameter and explicit return-type text. A zero-parameter callable such as `parseValue(): string` is allowed. It checks the result noun after `parse` or `decode` against the return type. For the tested case, it reports: `parseUser names its conversion result as user, but it returns order.` It checks source nouns after `encode`, `format`, `serialize`, or `stringify`. For XFromY and XToY phrases, it compares the first parameter and return concepts only when both claimed noun comparisons are wrong; if either claimed side matches, the phrase is accepted without checking the other side.

## When to use it

Use it when conversion names must state the real source and result concepts.

## Conformant

```ts
interface User { name: string }
interface Order { id: string }
const parseOrder = (user: User): Order => ({ id: user.name })
```

## Non-conformant

```ts
interface User { name: string }
interface Order { id: string }
const parseUser = (user: User): Order => ({ id: user.name })
```
