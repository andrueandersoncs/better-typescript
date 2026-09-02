# no-property-access-after-call

## What it does

Reports a property access whose receiver is a function call. The access is allowed when the property is immediately called, so method-call chains remain valid.

## When to use it

Use it to give a function call result a name before reading one of its properties.

## Conformant

```ts
const result = someObj.callSomeMethod()
void result.accessSomeProperty

someObj.someCall1().someCall2().someCall3()
```

## Non-conformant

```ts
const property = someObj.callSomeMethod().accessSomeProperty
```
