import type { CodeCategory } from "./review-types"
import type { ScopeChange, ScopeConnectionKind } from "./scope-types"

export const entityStyles = {
  Schema: { label: "Schema", color: "#83cdb9" },
  Service: { label: "Service", color: "#8ab9ed" },
  Interface: { label: "Interface", color: "#c4a8df" },
  Type: { label: "Type", color: "#e6c580" },
  EffectfulFunction: { label: "Function", color: "#eee6c9" },
  Error: { label: "Error", color: "#ed9486" },
} as const satisfies Record<CodeCategory, { label: string; color: string }>

export const relationshipStyles = {
  schema: { label: "Schema composition", color: "#e4c58c", pattern: "double", marker: "diamond" },
  dependency: { label: "Dependency", color: "#b9c8c4", pattern: "dashed", marker: "circle" },
  input: { label: "Input", color: "#73dbe6", pattern: "single", marker: "arrow" },
  success: { label: "Success", color: "#96e6aa", pattern: "single", marker: "double-arrow" },
  error: { label: "Error", color: "#ff9b89", pattern: "zigzag", marker: "cross" },
  service: { label: "Requires service", color: "#b1bfff", pattern: "bus", marker: "square" },
} as const satisfies Record<ScopeConnectionKind, {
  label: string
  color: string
  pattern: "single" | "double" | "dashed" | "zigzag" | "bus"
  marker: "diamond" | "circle" | "arrow" | "double-arrow" | "cross" | "square"
}>

export const changeNames: Record<ScopeChange, string> = {
  added: "Added · proposed",
  modified: "Modified · current → proposed",
  removed: "Removed · current",
  unchanged: "Unchanged",
}

export const changeColors: Record<ScopeChange, string> = {
  added: "#5fa77a",
  modified: "#c38345",
  removed: "#b77770",
  unchanged: "#789084",
}
