# Unbroken schema and RPC declarations

- ID: 013
- Added: 2026-09-08
- Source: paste
- Path: none

## Why it is bad

Particularly, I don't like the lack of spacing and boundaries

## Code

```ts
    const CreateShapeSchema = Schema.Struct(createFields)
    interface CreateShape extends Schema.Schema.Type<typeof CreateShapeSchema> {}
    const createInputSchema = Schema.make<Schema.Codec<CreateInput<S, Creation>, unknown, S["DecodingServices"], S["EncodingServices"]>>(CreateShapeSchema.ast)
    const IdentifierKeySchema = Schema.Literal(table.identifier)
    const IdentifierShapeSchema = Schema.Record(IdentifierKeySchema, canonicalIdentifierSchema)
    const identifierRequestSchema = Schema.make<Schema.Codec<Readonly<Record<CanonicalKey, CanonicalId>>, unknown, S["DecodingServices"], S["EncodingServices"]>>(IdentifierShapeSchema.ast)
    const canonicalRowWireSchema = Schema.toCodecJson(canonicalRowSchema)
    const createWireSchema = Schema.toCodecJson(createInputSchema)
    const identifierWireSchema = Schema.toCodecJson(identifierRequestSchema)
    const rowsWireSchema = Schema.Array(canonicalRowWireSchema)
    const canonicalFilterFields = Record.filter(options.schema.fields, (_schema, field) => Array.contains(filterFields, field))
    const CanonicalFilterSchema = Schema.Struct(Record.map(canonicalFilterFields, Schema.optionalKey))
    interface CanonicalFilter extends Schema.Schema.Type<typeof CanonicalFilterSchema> {}
    const OptionalFilterSchema = Schema.optionalKey(CanonicalFilterSchema)
    const ListShapeSchema = Schema.Struct({ filter: OptionalFilterSchema, limit: OptionalLimitSchema, cursor: OptionalCursorSchema })
    interface ListShape extends Schema.Schema.Type<typeof ListShapeSchema> {}
    const listInputSchema = Schema.make<Schema.Codec<ListInput<S, List>, unknown, S["DecodingServices"], S["EncodingServices"]>>(ListShapeSchema.ast)
    const listWireSchema = Option.isNone(listPolicy) ? EmptyPayloadSchema : Schema.toCodecJson(listInputSchema)
    const PageSchema = Schema.Struct({ items: rowsWireSchema, nextCursor: NextCursorSchema })
    interface Page extends Schema.Schema.Type<typeof PageSchema> {}
    const listSuccessSchema = Option.isNone(listPolicy) ? rowsWireSchema : PageSchema
    const mutableFields = Record.remove(options.schema.fields, table.identifier)
    const optionalPatchFields = Record.map(mutableFields, Schema.optionalKey)
    const patchFields: Readonly<Record<string, Schema.Constraint>> = Record.set(optionalPatchFields, table.identifier, ForbiddenFieldSchema)
    const PatchFieldsSchema = Schema.Struct(patchFields)
    interface PatchFields extends Schema.Schema.Type<typeof PatchFieldsSchema> {}
    const identifierFields = Record.singleton(table.identifier, canonicalIdentifierSchema)
    const patchPayloadFields: Readonly<Record<string, Schema.Constraint>> = Record.set(identifierFields, "patch", PatchFieldsSchema)
    const PatchShapeSchema = Schema.Struct(patchPayloadFields)
    interface PatchShape extends Schema.Schema.Type<typeof PatchShapeSchema> {}
    const patchInputSchema = Schema.make<Schema.Codec<Readonly<Record<CanonicalKey, CanonicalId>> & { readonly patch: PatchInput<S, CanonicalKey> }, unknown, S["DecodingServices"], S["EncodingServices"]>>(PatchShapeSchema.ast)
    const patchWireSchema = Schema.toCodecJson(patchInputSchema)
    const getProcedure = Rpc.make(`${options.name}.get`, { payload: identifierWireSchema, success: canonicalRowWireSchema, error: ResourceErrorSchema })
    const listProcedure = Rpc.make(`${options.name}.list`, { payload: listWireSchema, success: listSuccessSchema, error: ResourceErrorSchema })
    const createProcedure = Rpc.make(`${options.name}.create`, { payload: createWireSchema, success: canonicalRowWireSchema, error: ResourceErrorSchema })
    const updateProcedure = Rpc.make(`${options.name}.update`, { payload: canonicalRowWireSchema, success: canonicalRowWireSchema, error: ResourceErrorSchema })
    const patchProcedure = Rpc.make(`${options.name}.patch`, { payload: patchWireSchema, success: canonicalRowWireSchema, error: ResourceErrorSchema })
    const removeProcedure = Rpc.make(`${options.name}.remove`, { payload: identifierWireSchema, success: Schema.Void, error: ResourceErrorSchema })
    const identifierFrom = (input: typeof identifierRequestSchema.Type) => input[table.identifier as CanonicalKey]
    const getHandler = flow(identifierFrom, repository.get)
    const removeHandler = flow(identifierFrom, repository.remove)
    const listHandler = Option.isNone(listPolicy) ? repository.list : repository.page
```

## Analysis

### Shape: Unbroken heterogeneous declaration run

- Observable shape: Forty-two adjacent single-line declarations in one block cross schema construction, wire conversion, RPC procedure, and handler concerns without a syntactic separator or extracted boundary.
- Existing rules: `no-blank-lines-between-single-line-declarations` deliberately keeps adjacent single-line declarations contiguous. `require-blank-lines-around-multiline-declarations` applies only when a declaration already spans multiple lines.
- Pattern: none
- Emergence: no-pattern
- Reason: The AST and checker cannot identify the intended conceptual group boundaries. A declaration-count threshold would be arbitrary, and inserting blank lines between these single-line declarations would conflict with the existing rule. Formatting complex declarations across lines would activate the existing multiline-boundary rule; extracting cohesive helpers is a design decision rather than a predictable lint replacement.
