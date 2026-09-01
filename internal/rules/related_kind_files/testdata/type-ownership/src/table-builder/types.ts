export interface TableDefinition { readonly name: string }
export class Table { constructor(readonly definition: TableDefinition) {} }
