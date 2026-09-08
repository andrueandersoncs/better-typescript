import type { ScopeGraph, ScopeNode } from "../scope-types"

export type Revision = "comparison" | "current" | "proposed"
export type ConceptProps = {
  readonly graph: ScopeGraph
  readonly revision: Revision
  readonly selectedId: string
  readonly onSelect: (id: string) => void
  readonly onInspect: (id: string) => void
}

export const relationships = {
  schema: { label: "Composition", color: "#8b641c", short: "C" },
  dependency: { label: "Dependency", color: "#586779", short: "D" },
  input: { label: "Input", color: "#2267c5", short: "I" },
  success: { label: "Success", color: "#24784b", short: "S" },
  error: { label: "Error", color: "#be403c", short: "E" },
  service: { label: "Service", color: "#7751ad", short: "R" },
} as const

export const categoryLabel = (node: ScopeNode) => node.category === "EffectfulFunction" ? "Function" : node.category

export const ChangeBadge = ({ node, revision }: { readonly node: ScopeNode; readonly revision: Revision }) => revision === "comparison" && node.change !== "unchanged"
  ? <span className="concept-change" data-change={node.change}>{node.change}</span>
  : null
