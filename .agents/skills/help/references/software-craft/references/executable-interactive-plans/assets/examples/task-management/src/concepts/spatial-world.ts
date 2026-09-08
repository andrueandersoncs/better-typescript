import * as THREE from "three"
import type { ScopeConnection, ScopeGraph } from "../scope-types"

export interface SpatialNode {
  readonly object: THREE.Group
  readonly label: THREE.Vector3
  readonly port: THREE.Vector3
}

export interface SpatialWorld {
  readonly root: THREE.Group
  readonly nodes: Map<string, SpatialNode>
  readonly captions: ReadonlyArray<{ text: string; position: THREE.Vector3 }>
  readonly background: number
  readonly dark: boolean
  readonly cameraDirection: THREE.Vector3
  readonly spreadLabel: string
  readonly explanation: string
  setSpread(value: number): void
  setSelected(id: string): void
  route(connection: ScopeConnection, index: number): THREE.Curve<THREE.Vector3>
}

export type WorldBuilder = (graph: ScopeGraph) => SpatialWorld
