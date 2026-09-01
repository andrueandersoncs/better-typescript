interface TableDefinition { name: string; schema: string }
export const make = (fields: TableDefinition): string => fields.name
