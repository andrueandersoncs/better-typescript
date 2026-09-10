# Manual reference validation branches

- ID: 014
- Added: 2026-09-10
- Source: paste
- Path: none

## Why it is bad

> I don't like it because it sort of implies, with its structure, that it should be pattern matching instead of manually branching with if statements

## Code

```ts
  const validateReference = (reference: Exclude<Operand, { readonly _tag: "Literal" }>) => {
    if (!Predicate.isTagged(reference, "RowField")) return Effect.void
    const canonical = Option.fromNullishOr(resource.fields[reference.field])
    if (Option.isNone(canonical)) return policyFailure({ reason: `SQL policy references unknown row.${reference.field}` })
    const physical = Option.fromNullishOr(storage.fields[reference.field])
    if (Option.isNone(physical)) return policyFailure({ reason: `SQL policy references unknown row.${reference.field}` })
    const scalar = fieldDescription(canonical.value)
    if (Option.isNone(scalar)) return policyFailure({ reason: `SQL policy references unknown row.${reference.field}` })
    const tableField = tableFieldNamed(table, reference.field)
    if (Option.isNone(tableField)) return policyFailure({ reason: `SQL policy references unknown row.${reference.field}` })
    const sameSchema = schemaEquals(canonical.value, physical.value)
    const canonicalIdentity = hasIdentityEncoding(canonical.value)
    const physicalIdentity = hasIdentityEncoding(physical.value)
    const identityEncoding = canonicalIdentity && physicalIdentity
    const validEncoding = sameSchema && identityEncoding
    if (!validEncoding) return policyFailure({ reason: `SQL policy row.${reference.field} must use an identity storage encoding` })
    if (scalar.value.collection) return policyFailure({ reason: `SQL policy row.${reference.field} uses an unsupported storage scalar` })

    return storageCompatible(scalar.value, tableField.value)
      ? Effect.void
      : policyFailure({ reason: `SQL policy row.${reference.field} does not have a compatible physical scalar` })
  }
```

## Analysis

### Shape: Interleaved validation guard chain

- Observable shape: One validator interleaves derived-value declarations with many early-return `if` guards and ends with a conditional return.
- Existing rules: [`no-manual-type-dispatch`](../../../docs/rules/no-manual-type-dispatch.md) requires at least three adjacent same-subject guards; [`prefer-option-match`](../../../docs/rules/prefer-option-match.md) only owns Option ternaries that unwrap the checked identifier.
- Pattern: none
- Emergence: no-pattern
- Reason: This example suggests pattern matching, but its guards validate successive derived values rather than dispatching on one stable subject. The AST shape does not establish a predictable boundary or one semantics-preserving Match replacement; a broad rule would also reject ordinary validation pipelines.
