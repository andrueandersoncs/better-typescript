# closed-abstraction

## What it does

Reports an interface or type alias whose name occurs as a raw substring in the source text of exactly one named function declaration or function-valued variable. The owner limit counts project-wide lexical word occurrences of the function name, minus its declaration occurrence, and allows at most one. The pair forms a closed abstraction with little independent reuse.

## When to use it

Use this rule to find private data vocabularies and functions that should be collapsed into their owner, replaced with an existing concept, or deepened into a useful module.

## Conformant

```ts
interface SharedData {
  id: string
}

function load(input: SharedData) {
  return input.id
}

function save(input: SharedData) {
  return input.id
}
```

## Non-conformant

```ts
interface LoadData {
  id: string
}

function load(input: LoadData) {
  return input.id
}
```
