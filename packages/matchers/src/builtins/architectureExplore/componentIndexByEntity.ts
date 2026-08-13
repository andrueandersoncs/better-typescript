import { Array, HashMap, Tuple, pipe } from "effect"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import { portableKeyToken } from "./portableKeyToken.js"

const componentIndexEntry = (componentIndex: number) => (member: SemanticModuleEntityKey) => {
  const token = portableKeyToken(member)

  return Tuple.make(token, componentIndex)
}

const componentIndexEntries = (
  component: ReadonlyArray<SemanticModuleEntityKey>,
  componentIndex: number
) => Array.map(component, componentIndexEntry(componentIndex))

export const componentIndexByEntity = (components: SemanticModuleReferenceGraph["components"]) =>
  pipe(components, Array.flatMap(componentIndexEntries), HashMap.fromIterable)
