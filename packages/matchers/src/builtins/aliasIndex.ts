import { Schema } from "effect"

// aliasListSchema is the per-file alias list because index entries share one contract.
export const aliasListSchema = Schema.Array(Schema.String)
// aliasesByFileSchema maps paths to alias lists because the index keys files.
export const aliasesByFileSchema = Schema.HashMap(Schema.String, aliasListSchema)

// AliasIndex is the program-wide alias lookup because subscriptions share one contract.
export const AliasIndex = Schema.Struct({
  aliasesByFile: aliasesByFileSchema
})

// AliasIndex type mirrors the schema because subscriptions share one immutable contract.
export interface AliasIndex extends Schema.Schema.Type<typeof AliasIndex> {}
