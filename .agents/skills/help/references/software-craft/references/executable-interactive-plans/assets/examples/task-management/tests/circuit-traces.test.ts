import { describe, expect, it } from "vitest"
import { Box3, Color, Raycaster, Vector3, type Mesh, type MeshStandardMaterial } from "three"
import { createCircuitTraces } from "../src/circuit-traces"
import { relationshipStyles } from "../src/board-semantics"

const rectangularComponent = (component: { id: string; x: number; z: number; width: number; depth: number }) => ({
  ...component,
  contacts: {
    left: { x: component.x - component.width / 2, y: 0.36, z: component.z },
    right: { x: component.x + component.width / 2, y: 0.36, z: component.z },
    top: { x: component.x, y: 0.36, z: component.z - component.depth / 2 },
    bottom: { x: component.x, y: 0.36, z: component.z + component.depth / 2 },
  },
})

describe("circuit traces", () => {
  it("connects opposite corners around wider intervening components", () => {
    const components = Array.from({ length: 9 }, (_, index) => rectangularComponent({
      id: `node-${index}`,
      x: (index % 3) * 3 - 3,
      z: Math.floor(index / 3) * 2.5 - 2.5,
      width: index === 0 || index === 8 ? 1.25 : 2.02,
      depth: index === 0 || index === 8 ? 0.86 : 1.13,
    }))
    const circuit = createCircuitTraces({
      connections: [{ id: "diagonal", from: "node-0", to: "node-8", kind: "schema", label: "reference", change: "unchanged" }],
      components,
      boardWidth: 12.1,
      boardDepth: 10.6,
      comparison: false,
    })
    const bounds = new Box3().setFromObject(circuit.group)
    expect(bounds.min.x).toBeLessThan(-2)
    expect(bounds.min.z).toBeLessThan(-2)
    expect(bounds.max.x).toBeGreaterThan(2)
    expect(bounds.max.z).toBeGreaterThan(2)
    expect(bounds.min.x).toBeGreaterThan(-6.05)
    expect(bounds.max.x).toBeLessThan(6.05)
    expect(bounds.min.z).toBeGreaterThan(-5.3)
    expect(bounds.max.z).toBeLessThan(5.3)
  })

  it("keeps a self-reference beside its component instead of the board perimeter", () => {
    const circuit = createCircuitTraces({
      connections: [{ id: "recursive", from: "node", to: "node", kind: "schema", label: "children", change: "unchanged" }],
      components: [rectangularComponent({ id: "node", x: 0, z: 0, width: 1.25, depth: 0.86 })],
      boardWidth: 6.8,
      boardDepth: 5.6,
      comparison: false,
    })
    const bounds = new Box3().setFromObject(circuit.group)
    expect(bounds.max.x).toBeGreaterThan(0.625)
    expect(bounds.max.z).toBeGreaterThan(0.43)
    expect(bounds.min.x).toBeGreaterThan(-1.25)
    expect(bounds.max.x).toBeLessThan(1.25)
    expect(bounds.min.z).toBeGreaterThan(-1.25)
    expect(bounds.max.z).toBeLessThan(1.25)
  })

  it("draws typed copper above the routing mask", () => {
    const circuit = createCircuitTraces({
      connections: [{ id: "input", from: "owner", to: "input", kind: "input", label: "input", change: "unchanged" }],
      components: [
        rectangularComponent({ id: "owner", x: -2, z: 0, width: 1.25, depth: 0.86 }),
        rectangularComponent({ id: "input", x: 2, z: 0, width: 1.25, depth: 0.86 }),
      ],
      boardWidth: 7,
      boardDepth: 4,
      comparison: false,
    })
    circuit.group.updateMatrixWorld(true)
    const ray = new Raycaster(new Vector3(0, 2, 0), new Vector3(0, -1, 0))
    const surface = ray.intersectObject(circuit.group, true)[0].object as Mesh
    expect((surface.material as MeshStandardMaterial).color.getHexString()).toBe(new Color(relationshipStyles.input.color).getHexString())
  })
})
