# require-blank-lines-around-multiline-statements

## What it does

Reports a statement that spans multiple lines without a blank line between it and a neighboring statement. The first and last statements in a statement list are exempt on their outer sides. Single-line statements do not require surrounding blank lines.

## When to use it

Use it to visually separate multi-line declarations, calls, conditionals, loops, and other statements.

## Conformant

```ts
const tables = loadTables()

for (const table of tables) {
  if (isDuplicate(table)) {
    return
  }

  register(table)
}

finish()
```

## Non-conformant

```ts
const tables = loadTables()
for (const table of tables) {
  if (isDuplicate(table)) {
    return
  }
  register(table)
}
finish()
```
