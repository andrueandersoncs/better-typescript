interface TableDefinition { name: string; schema: string }
export const Table = {
  make(this: void, fields: TableDefinition): string { return fields.name },
}
