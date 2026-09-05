import type { CodeCategory, CodeDefinition } from "./review-types"

export type ScopeChange = "added" | "modified" | "removed" | "unchanged"
export type ScopeConnectionKind = "schema" | "dependency" | "input" | "success" | "error" | "service"

export interface SchemaFieldView {
  readonly name: string
  readonly type: string
  readonly optional: boolean
  readonly mutable: boolean
  readonly constraints: ReadonlyArray<string>
  readonly referenceIds: ReadonlyArray<string>
}

export interface SchemaView {
  readonly kind: string
  readonly summary: string
  readonly fields: ReadonlyArray<SchemaFieldView>
  readonly constraints: ReadonlyArray<string>
  readonly encoded?: SchemaView
}

export interface ScopeVersion {
  readonly label: string
  readonly category: CodeCategory
  readonly scope: string
  readonly relativePath: string
  readonly source: string
  readonly schema?: SchemaView
}

export interface ScopeNode {
  readonly id: string
  readonly label: string
  readonly category: CodeCategory
  readonly scope: string
  readonly change: ScopeChange
  readonly rationale?: string
  readonly current?: ScopeVersion
  readonly proposed?: ScopeVersion
}

export interface ScopeConnection {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: ScopeConnectionKind
  readonly currentLabel?: string
  readonly proposedLabel?: string
  readonly label: string
  readonly change: ScopeChange
}

export interface ScopeGraph {
  readonly nodes: ReadonlyArray<ScopeNode>
  readonly connections: ReadonlyArray<ScopeConnection>
  readonly issues: ReadonlyArray<string>
}

export interface ScopeDeclaration {
  readonly definition: CodeDefinition
  readonly source: string
}

export type ScopeModuleLoader = (relativePath: string) => Promise<Record<string, unknown>>
