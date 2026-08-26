# no-nested-calls

## What it does

Reports a call or `new` expression when a supported ancestor chain places its result inside another call or `new` argument. The walked ancestor kinds are parentheses, `as`, `satisfies`, non-null, object literals, property assignments, shorthand properties, object spreads, array literals, spread elements, conditionals, binary and prefix or postfix unary expressions, `await`, `yield`, `typeof`, `void`, property and element access, and template spans and expressions. Calls that return functions are allowed. The `pipe` exemption requires the nested call to be the direct, unwrapped first argument. A parenthesized first argument can report. Unsupported ancestry, such as a computed property name, is not traversed.

## When to use it

Use it to make call sequences read in order. Store the inner result in a `const`, use a generator step, or use `pipe`.

## Conformant

```ts
function inner(): number { return 1 }
function outer(value: number): number { return value }

const value = inner()
const result = outer(value)
```

## Non-conformant

```ts
function inner(): number { return 1 }
function outer(value: number): number { return value }

const result = outer(inner())
```
