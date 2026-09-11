# require-blank-lines-between-statement-kinds

## What it does

Requires a blank line between neighboring single-line statements with different TypeScript syntax kinds. Reports the later statement, including when both statements occupy the same line.

Applies at file level, inside blocks (including function bodies), in namespaces, and within each switch clause. It does not compare class members, object properties, or separate switch clauses. An `else` belongs to its `if`, not a separate sibling statement.

`const`, `let`, and `var` share the variable-statement kind. Calls and assignments share the expression-statement kind. Export modifiers do not change a declaration's kind. Functions, classes, interfaces, type aliases, imports, returns, and each control-flow statement kind form separate groups.

A separator is an empty or space/tab-only line between statements. A comment-only line is not enough; an empty line before a leading comment is sufficient. LF and CRLF are supported.

[`require-blank-lines-around-multiline-statements`](./require-blank-lines-around-multiline-statements.md) owns boundaries where either neighbor spans multiple lines, so this rule does not duplicate those reports. [`no-blank-lines-between-single-line-declarations`](./no-blank-lines-between-single-line-declarations.md) forbids blank lines only between same-kind single-line declarations inside functions.

## When to use it

Use it to separate different kinds of work while keeping same-kind single-line statements together.

## Conformant

```ts
const a = 1
const b = 2
const c = 3

class D {}

const e = 5
```

## Non-conformant

```ts
const a = 1
const b = 2
const c = 3
class D {}
const e = 5
```
