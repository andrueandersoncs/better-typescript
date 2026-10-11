import type { TableForeignKey, TableIndex, TableUnique } from "./physical/relations.ts"
import type { Table } from "./relations.ts"

type TableRelationFields<Fields extends string> = readonly Fields[]

export interface TableReference {
  readonly table: Table
  readonly fields: ReadonlyArray<string>
}

export type TableRelationsInput<Fields extends string = string> = Readonly<Partial<{
  readonly unique: ReadonlyArray<
    Omit<TableUnique, "name" | "fields">
    & Partial<Pick<TableUnique, "name">>
    & { readonly fields: TableRelationFields<Fields> }
  >
  readonly foreignKeys: ReadonlyArray<
    Omit<TableForeignKey, "name" | "fields" | "references">
    & Partial<Pick<TableForeignKey, "name">>
    & Partial<Readonly<{ scope: TableRelationFields<Fields> }>>
    & {
      readonly fields: TableRelationFields<Fields>
      readonly references: TableReference
    }
  >
  readonly indexes: ReadonlyArray<
    Omit<TableIndex, "name" | "fields">
    & Partial<Pick<TableIndex, "name">>
    & { readonly fields: TableRelationFields<Fields> }
  >
}>>
