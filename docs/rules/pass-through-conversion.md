# pass-through-conversion

## What it does

Reports a named function or method that copies one named object type into a different named object type with the same fields and field types. The checked function has one parameter, an explicit return type, and returns only a non-empty object literal. Each returned field must be a direct same-name copy, or the object must spread the parameter.

## When to use it

Use this rule to find parallel first-party representations with no real conversion boundary. Collapse the representations, or keep and document the transformation that makes the boundary meaningful.

## Conformant

A real field transformation is allowed. The tested fixture also allows a function with no explicit named return type.

```ts
interface WireIdentity {
  value: string;
}

interface DomainIdentity {
  value: string;
}

export const clean = (identity: WireIdentity): DomainIdentity => ({
  value: identity.value.trim(),
});

export const inferred = (identity: WireIdentity) => ({
  value: identity.value,
});
```

## Non-conformant

This adapter only copies the field into an identical shape.

```ts
interface WireIdentity {
  value: string;
}

interface DomainIdentity {
  value: string;
}

export const toDomain = (identity: WireIdentity): DomainIdentity => ({
  value: identity.value,
});
```
