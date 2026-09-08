import * as THREE from "three"
import type { ScopeConnection, ScopeGraph, ScopeNode } from "../scope-types"
import type { SpatialNode, SpatialWorld } from "./spatial-world"

type PartRecord = {
  readonly node: ScopeNode
  readonly object: THREE.Group
  readonly label: THREE.Vector3
  readonly port: THREE.Vector3
  readonly home: THREE.Vector3
  readonly axis: THREE.Vector3
  readonly explodeIndex: number
  readonly materials: THREE.MeshStandardMaterial[]
  readonly witness: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
}

type ScopeRun = {
  readonly scope: string
  readonly axisIndex: number
  readonly parts: PartRecord[]
  readonly caption: { text: string; position: THREE.Vector3 }
}

const silver = 0xaeb9bd
const graphite = 0x34434a
const steel = 0x73848c
const orange = 0xe27b24
const vermilion = 0xbb392f
const amber = 0xf2a028
const faceDepth = { Schema: .53, Interface: .22, Service: .25, EffectfulFunction: .29, Error: .33, Type: .2 }

const localZ = new THREE.Vector3(0, 0, 1)

function ringShape(outer: number, inner: number, sides = 48): THREE.Shape {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const aperture = new THREE.Path()
  aperture.absarc(0, 0, inner, 0, Math.PI * 2, true)
  shape.holes.push(aperture)
  return shape
}

function extrudedRing(outer: number, inner: number, depth: number, bevel = 0.06): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(ringShape(outer, inner), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 24,
  })
}

function addMesh(
  part: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  nodeId: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.nodeId = nodeId
  mesh.castShadow = true
  mesh.receiveShadow = true
  part.add(mesh)
  return mesh
}

function material(color: number, roughness = 0.34, metalness = 0.82): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function orientPart(part: THREE.Group, axis: THREE.Vector3): void {
  part.quaternion.setFromUnitVectors(localZ, axis)
}

function addSchema(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[]): void {
  const fieldCount = node.proposed?.schema?.fields.length ?? node.current?.schema?.fields.length ?? 0
  const shell = material(graphite, 0.27)
  materials.push(shell)
  addMesh(part, extrudedRing(1.48, 0.76, 0.64, 0.09), shell, node.id).position.z = -0.32

  const face = material(silver, 0.25)
  materials.push(face)
  addMesh(part, extrudedRing(1.24, 0.84, 0.18, 0.04), face, node.id).position.z = 0.35

  const ribMaterial = material(steel, 0.31)
  materials.push(ribMaterial)
  for (let index = 0; index < fieldCount; index += 1) {
    const angle = (index / fieldCount) * Math.PI * 2
    const rib = addMesh(part, new THREE.BoxGeometry(0.28, 0.62, 0.74), ribMaterial, node.id)
    rib.position.set(Math.cos(angle) * 1.3, Math.sin(angle) * 1.3, 0)
    rib.rotation.z = angle
  }
}

function perforatedPlateShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-1.42, -1.08)
  shape.lineTo(1.42, -1.08)
  shape.lineTo(1.62, -0.78)
  shape.lineTo(1.62, 0.78)
  shape.lineTo(1.42, 1.08)
  shape.lineTo(-1.42, 1.08)
  shape.lineTo(-1.62, 0.78)
  shape.lineTo(-1.62, -0.78)
  shape.closePath()
  for (const [x, y] of [[-1.05, -0.62], [1.05, -0.62], [1.05, 0.62], [-1.05, 0.62], [0, 0]]) {
    const hole = new THREE.Path()
    hole.absarc(x, y, x === 0 ? 0.32 : 0.2, 0, Math.PI * 2, true)
    shape.holes.push(hole)
  }
  return shape
}

function addInterface(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[]): void {
  const plateMaterial = material(silver, 0.28)
  materials.push(plateMaterial)
  const plate = addMesh(part, new THREE.ExtrudeGeometry(perforatedPlateShape(), {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.07,
    bevelThickness: 0.07,
    bevelSegments: 2,
    curveSegments: 16,
  }), plateMaterial, node.id)
  plate.position.z = -0.15

  const rimMaterial = material(orange, 0.25)
  materials.push(rimMaterial)
  const rim = addMesh(part, new THREE.TorusGeometry(0.58, 0.1, 10, 32), rimMaterial, node.id)
  rim.position.z = 0.22
}

function addService(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[]): void {
  const outer = material(graphite, 0.25)
  const cage = material(orange, 0.26)
  const rollers = material(silver, 0.18)
  materials.push(outer, cage, rollers)
  addMesh(part, extrudedRing(1.37, 0.86, 0.4, 0.07), outer, node.id).position.z = -0.2
  addMesh(part, new THREE.TorusGeometry(1.07, 0.08, 8, 32), cage, node.id).position.z = 0.25
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2
    const roller = addMesh(part, new THREE.CylinderGeometry(0.14, 0.14, 0.46, 12), rollers, node.id)
    roller.position.set(Math.cos(angle) * 1.08, Math.sin(angle) * 1.08, 0)
    roller.rotation.x = Math.PI / 2
  }
}

function addFunction(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[], lugCount: number): void {
  const bladeMaterial = material(steel, 0.24)
  const hubMaterial = material(graphite, 0.23)
  const accent = material(orange, 0.22)
  materials.push(bladeMaterial, hubMaterial, accent)
  addMesh(part, extrudedRing(0.62, 0.24, 0.58, 0.06), hubMaterial, node.id).position.z = -0.29
  for (let index = 0; index < lugCount; index += 1) {
    const angle = (index / lugCount) * Math.PI * 2 + Math.PI / 8
    const blade = addMesh(part, new THREE.BoxGeometry(0.55, 1.18, 0.2), bladeMaterial, node.id)
    blade.position.set(Math.cos(angle) * 0.78, Math.sin(angle) * 0.78, 0.04)
    blade.rotation.z = angle + Math.PI / 2
    const lug = addMesh(part, new THREE.TorusGeometry(0.18, 0.065, 8, 16), accent, node.id)
    lug.position.set(Math.cos(angle) * 1.32, Math.sin(angle) * 1.32, 0.17)
  }
}

function addError(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[]): void {
  const nut = material(vermilion, 0.3)
  const collar = material(graphite, 0.26)
  materials.push(nut, collar)
  const hex = ringShape(1.35, 0.56)
  const points: THREE.Vector2[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + (index / 6) * Math.PI * 2
    points.push(new THREE.Vector2(Math.cos(angle) * 1.35, Math.sin(angle) * 1.35))
  }
  hex.curves = []
  hex.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) hex.lineTo(point.x, point.y)
  hex.closePath()
  const aperture = new THREE.Path()
  aperture.absarc(0, 0, 0.56, 0, Math.PI * 2, true)
  hex.holes.push(aperture)
  addMesh(part, new THREE.ExtrudeGeometry(hex, { depth: 0.5, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), nut, node.id).position.z = -0.25
  addMesh(part, extrudedRing(0.72, 0.4, 0.16, 0.03), collar, node.id).position.z = 0.27
}

function addType(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[]): void {
  const washer = material(silver, 0.2)
  const etch = material(orange, 0.28)
  materials.push(washer, etch)
  addMesh(part, extrudedRing(1.38, 0.66, 0.34, 0.08), washer, node.id).position.z = -0.17
  addMesh(part, new THREE.TorusGeometry(1.02, 0.055, 8, 32), etch, node.id).position.z = 0.2
}

function addMechanicalPart(part: THREE.Group, node: ScopeNode, materials: THREE.MeshStandardMaterial[], portCount: number): void {
  switch (node.category) {
    case "Schema": addSchema(part, node, materials); break
    case "Interface": addInterface(part, node, materials); break
    case "Service": addService(part, node, materials); break
    case "EffectfulFunction": addFunction(part, node, materials, portCount); break
    case "Error": addError(part, node, materials); break
    case "Type": addType(part, node, materials); break
  }
}

function makeWitness(root: THREE.Group): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x8a9aa1, transparent: true, opacity: 0.6 }))
  root.add(line)
  return line
}

function updateLine(line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3): void {
  const positions = line.geometry.getAttribute("position") as THREE.BufferAttribute
  positions.setXYZ(0, from.x, from.y, from.z)
  positions.setXYZ(1, to.x, to.y, to.z)
  positions.needsUpdate = true
  line.geometry.computeBoundingSphere()
}

export function buildAssembly(graph: ScopeGraph): SpatialWorld {
  const root = new THREE.Group()
  root.name = "Exploded precision mechanical assembly"

  const axes = [
    { origin: new THREE.Vector3(-1.5, 3.55, -0.8), direction: new THREE.Vector3(1, 0.06, -0.23).normalize() },
    { origin: new THREE.Vector3(-2.4, -3.35, 1.2), direction: new THREE.Vector3(1, -0.04, 0.2).normalize() },
  ]
  const scopeOrder: string[] = []
  const byScope = new Map<string, ScopeNode[]>()
  for (const node of graph.nodes) {
    const key = node.scope || "assembly"
    if (!byScope.has(key)) {
      byScope.set(key, [])
      scopeOrder.push(key)
    }
    byScope.get(key)?.push(node)
  }

  const runs: ScopeRun[] = []
  const cursors = [0, 0]
  const records = new Map<string, PartRecord>()
  const nodes = new Map<string, SpatialNode>()
  const captions: { text: string; position: THREE.Vector3 }[] = []

  for (const [scopeIndex, scope] of scopeOrder.entries()) {
    const axisIndex = scopeIndex % 2
    const axis = axes[axisIndex]
    const scopedNodes = byScope.get(scope) ?? []
    const runLength = Math.max(2.5, scopedNodes.length * 1.05 + 0.75)
    const start = cursors[axisIndex] - (scopedNodes.length - 1) * .525
    cursors[axisIndex] += runLength + 1.3
    const caption = { text: scope, position: axis.origin.clone() }
    const run: ScopeRun = { scope, axisIndex, parts: [], caption }
    runs.push(run)
    captions.push(caption)

    scopedNodes.forEach((node, index) => {
      const part = new THREE.Group()
      part.name = `${node.category} mechanical part: ${node.label}`
      orientPart(part, axis.direction)
      const materials: THREE.MeshStandardMaterial[] = []
      addMechanicalPart(part, node, materials, graph.connections.filter((edge) => edge.from === node.id).length)
      root.add(part)

      const home = axis.origin.clone().addScaledVector(axis.direction, start + index * 1.05)
      const record: PartRecord = {
        node,
        object: part,
        label: new THREE.Vector3(),
        port: new THREE.Vector3(),
        home,
        axis: axis.direction,
        explodeIndex: index - (scopedNodes.length - 1) / 2,
        materials,
        witness: makeWitness(root),
      }
      records.set(node.id, record)
      nodes.set(node.id, { object: part, label: record.label, port: record.port })
      run.parts.push(record)
    })
  }

  const axialRanks = new Map<PartRecord, number>()
  for (const axisIndex of [0, 1]) {
    const cartridge = runs
      .filter((run) => run.axisIndex === axisIndex)
      .flatMap((run) => run.parts)
    cartridge.forEach((record, index) => axialRanks.set(record, index - (cartridge.length - 1) / 2))
  }

  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x617780, transparent: true, opacity: 0.64 })
  for (const axis of axes) {
    const start = axis.origin.clone().addScaledVector(axis.direction, -15.2)
    const end = axis.origin.clone().addScaledVector(axis.direction, 15.2)
    const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), axisMaterial)
    root.add(guide)
    for (let mark = -12; mark <= 12; mark += 3) {
      const point = axis.origin.clone().addScaledVector(axis.direction, mark)
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([point.clone().add(new THREE.Vector3(0, -0.18, 0)), point.clone().add(new THREE.Vector3(0, 0.18, 0))]),
        axisMaterial,
      )
      root.add(tick)
    }
  }

  let selectedId: string | undefined
  const setSelected = (id: string): void => {
    if (selectedId === id) return
    for (const record of records.values()) {
      const active = record.node.id === id
      for (const partMaterial of record.materials) {
        partMaterial.emissive.setHex(active ? amber : 0x000000)
        partMaterial.emissiveIntensity = active ? 0.38 : 0
      }
    }
    selectedId = id
  }

  const setSpread = (value: number): void => {
    const spread = THREE.MathUtils.clamp(value, 0, 1)
    for (const record of records.values()) {
      const displacement = (axialRanks.get(record) ?? record.explodeIndex) * spread * 2.4
      record.object.position.copy(record.home).addScaledVector(record.axis, displacement)
      record.label.copy(record.object.position)
      record.label.y += 1.85
      record.label.z += .32
      record.port.set(record.node.category === "EffectfulFunction" ? .42 : 1, 0, faceDepth[record.node.category]).applyQuaternion(record.object.quaternion).add(record.object.position)
      updateLine(record.witness, record.home, record.object.position)
    }
    for (const run of runs) {
      const first = run.parts[0]?.object.position
      const last = run.parts.at(-1)?.object.position
      if (!first || !last) continue
      run.caption.position.copy(first).lerp(last, 0.5).add(new THREE.Vector3(0, run.axisIndex === 0 ? 1.9 : -1.9, 0.4))
    }
  }

  setSpread(0.65)

  return {
    root,
    nodes,
    captions,
    background: 0xe4e9ec,
    dark: false,
    cameraDirection: new THREE.Vector3(18, 14, 24).normalize(),
    spreadLabel: "Exploded separation",
    explanation: "Each machined part is a contract; each cartridge is a module. Separation reveals parts, not an assembly or execution sequence.",
    setSpread,
    setSelected,
    route(connection: ScopeConnection, index: number): THREE.Curve<THREE.Vector3> {
      const from = records.get(connection.from)?.port
      const to = records.get(connection.to)?.port
      if (!from || !to) return new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3())
      const midpoint = from.clone().lerp(to, 0.5)
      midpoint.y += 1.35 + (index % 3) * 0.28
      midpoint.z += ((index % 2) * 2 - 1) * 0.72
      return new THREE.CatmullRomCurve3([from.clone(), midpoint, to.clone()], false, "centripetal")
    },
  }
}
