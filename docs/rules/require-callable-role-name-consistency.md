# require-callable-role-name-consistency

## What it does

Checks identifier-named arrow/function-expression variables, function declarations, and methods only when the name has at least two parsed words and ends in a supported role noun; most role result shapes come from explicit return-type text, while factory and accessor checks also inspect the body. For the tested case, it reports: `activePredicate claims the predicate role, but does not provide a boolean or type-predicate result.` It also checks `accessor`, `callback`, `comparator`, `factory`, `function`, `handler`, `mapper`, and `reducer` against their signature or body shape.

## When to use it

Use it when callable role nouns must describe the callable contract.

## Conformant

```ts
const readyPredicate = (): boolean => true
```

## Non-conformant

```ts
const activePredicate = (): string => "yes"
```
