# function-derived-model

## What it does

Reports an interface or type alias with a structural suffix when its type stem case-insensitively equals a named function declaration or function-valued variable name, and that function’s raw source text contains the full type name as a substring. For `LoadInput`, it reports: `LoadInput is named after its sole function role instead of independent semantics.`

The checked suffixes are `Context`, `Data`, `Info`, `Input`, `Model`, `Options`, `Output`, `Params`, `Result`, and `State`. Names such as `UserRequest` are allowed.

## When to use it

Use it to prefer domain concepts over types that only describe one function role.

## Conformant

```ts
interface UserRequest { id: string }

function send(input: UserRequest) {
  return input.id
}
```

## Non-conformant

```ts
interface LoadInput { id: string }

function load(input: LoadInput) {
  return input.id
}
```
