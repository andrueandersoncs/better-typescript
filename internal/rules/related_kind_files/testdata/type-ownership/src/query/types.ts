import type { TableDefinition } from "../table-builder/types.js"
import type { QueryInput } from "../shared/types.js"

export class QueryDefinition { constructor(readonly table: TableDefinition) {} }
export interface QueryResult { readonly input: QueryInput }
