import * as THREE from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { createBoardMaterial } from "./board-materials"
import { changeColors, entityStyles } from "./board-semantics"
import type { CodeCategory } from "./review-types"
import type { SchemaView, ScopeNode, ScopeVersion } from "./scope-types"

type Footprint = { readonly width: number; readonly depth: number }
type Point = { readonly x: number; readonly z: number }
export type ComponentContacts = Readonly<Record<"left" | "right" | "top" | "bottom", { readonly x: number; readonly y: number; readonly z: number }>>
type ComponentOptions = {
  readonly node: ScopeNode
  readonly version: ScopeVersion | undefined
  readonly comparison: boolean
  readonly position: Point
  readonly footprint: Footprint
}
type BoxSpec = Footprint & { readonly x: number; readonly y: number; readonly z: number; readonly height: number }

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const fixedFootprints: Record<Exclude<CodeCategory, "Schema">, Footprint> = {
  Service: { width: 2.72, depth: 2.16 },
  Interface: { width: 3.1, depth: 1.74 },
  Type: { width: 2.58, depth: 1.82 },
  EffectfulFunction: { width: 3.42, depth: 1.64 },
  Error: { width: 2.28, depth: 2.04 },
}

export const componentFootprint = (category: CodeCategory, schema?: SchemaView): Footprint => {
  if (category !== "Schema") return fixedFootprints[category]

  const fields = clamp(schema?.fields.length ?? 0, 0, 7)
  return {
    width: 2.12 + fields * 0.17,
    depth: 1.18 + fields * 0.14,
  }
}

const mergedBoxes = (boxes: ReadonlyArray<BoxSpec>) => {
  const geometries = boxes.map((box) => {
    const radius = Math.min(box.width, box.height, box.depth) * 0.22
    return new RoundedBoxGeometry(box.width, box.height, box.depth, 3, radius).translate(box.x, box.y, box.z)
  })
  const merged = mergeGeometries(geometries, false)
  geometries.forEach((geometry) => geometry.dispose())
  return merged ?? new THREE.BufferGeometry()
}

const prismGeometry = (points: ReadonlyArray<Point>, bottom: number, height: number) => {
  const shape = new THREE.Shape()
  shape.moveTo(points[0].x, -points[0].z)
  points.slice(1).forEach((point) => shape.lineTo(point.x, -point.z))
  shape.closePath()
  const bevel = Math.min(0.04, height * 0.2)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, height - bevel * 2),
    steps: 1,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 1,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bottom + bevel, 0)
  geometry.computeVertexNormals()
  return geometry
}

const createMaterials = (category: CodeCategory) => {
  const entity = new THREE.Color(entityStyles[category].color)
  const body = entity.clone().offsetHSL(0, 0.22, -0.17)
  const top = entity.clone().offsetHSL(0, 0.12, 0.1).lerp(new THREE.Color("#fff5dc"), 0.04)
  return {
    primary: createBoardMaterial({ color: body, surface: "component", accent: top }),
    top: createBoardMaterial({ color: top, surface: "cap", accent: "#fff7e7" }),
    circuit: createBoardMaterial({ color: "#0b241f", surface: "detail", accent: entity }),
  }
}

const contactsFor = (solids: ReadonlyArray<THREE.Object3D>, position: Point, elevation: number): ComponentContacts => {
  const meshes = solids.filter((solid): solid is THREE.Mesh => solid instanceof THREE.Mesh)
  const bounds = new THREE.Box3()
  meshes.forEach((mesh) => {
    mesh.geometry.computeBoundingBox()
    bounds.union(mesh.geometry.boundingBox!)
  })

  const floor = bounds.min.y
  const center = bounds.getCenter(new THREE.Vector3())
  const contact = (axis: "x" | "z", direction: number) => {
    let boundary = direction < 0 ? Infinity : -Infinity
    let tangentSum = 0, count = 0
    meshes.forEach((mesh) => {
      const vertices = mesh.geometry.getAttribute("position")
      for (let index = 0; index < vertices.count; index += 1) {
        if (Math.abs(vertices.getY(index) - floor) > 0.0001) continue
        const value = axis === "x" ? vertices.getX(index) : vertices.getZ(index)
        const tangent = axis === "x" ? vertices.getZ(index) : vertices.getX(index)
        if ((value - boundary) * direction > 0) {
          boundary = value
          tangentSum = tangent
          count = 1
        } else if (Math.abs(value - boundary) < 0.0001) {
          tangentSum += tangent
          count += 1
        }
      }
    })
    if (count === 0) {
      boundary = axis === "x"
        ? direction < 0 ? bounds.min.x : bounds.max.x
        : direction < 0 ? bounds.min.z : bounds.max.z
      tangentSum = axis === "x" ? center.z : center.x
      count = 1
    }
    return {
      x: position.x + (axis === "x" ? boundary : tangentSum / count),
      y: elevation + floor,
      z: position.z + (axis === "z" ? boundary : tangentSum / count),
    }
  }
  return { left: contact("x", -1), right: contact("x", 1), top: contact("z", -1), bottom: contact("z", 1) }
}

export const createBoardComponent = (options: ComponentOptions) => {
  const { node, version, comparison, position, footprint } = options
  const category = version?.category ?? node.category
  const group = new THREE.Group()
  const pickables: THREE.Object3D[] = []
  const palette = createMaterials(category)
  const materials: THREE.MeshStandardMaterial[] = []

  group.position.set(position.x, 0.34, position.z)
  group.userData.scopeNodeId = node.id

  const addSolid = (geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, name: string) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = name
    mesh.userData.scopeNodeId = node.id
    group.add(mesh)
    pickables.push(mesh)
    if (!materials.includes(material)) materials.push(material)
    return mesh
  }

  const addSchema = () => {
    const fields = version?.schema?.fields ?? []
    const rowCount = clamp(fields.length || 3, 2, 5)
    const cardWidth = footprint.width * 0.9
    const cardDepth = footprint.depth * 0.82
    addSolid(mergedBoxes([
      { width: cardWidth * 0.94, depth: cardDepth * 0.92, height: 0.16, x: 0.08, y: 0.09, z: 0.08 },
      { width: cardWidth, depth: cardDepth, height: 0.22, x: -0.04, y: 0.2, z: -0.04 },
    ]), palette.primary, "schema-record-card")
    addSolid(mergedBoxes([
      { width: cardWidth * 0.72, depth: 0.13, height: 0.075, x: -cardWidth * 0.04, y: 0.355, z: -cardDepth * 0.31 },
      { width: 0.12, depth: cardDepth * 0.7, height: 0.065, x: -cardWidth * 0.39, y: 0.35, z: cardDepth * 0.06 },
    ]), palette.top, "schema-record-header")

    const rowSpan = cardDepth * 0.47
    const rows: BoxSpec[] = []
    for (let index = 0; index < rowCount; index += 1) {
      const field = fields[index]
      const z = -cardDepth * 0.08 + index * rowSpan / Math.max(1, rowCount - 1)
      const lineWidth = cardWidth * (field?.optional ? 0.42 : 0.57)
      rows.push(
        { width: 0.13, depth: 0.13, height: 0.065, x: -cardWidth * 0.29, y: 0.35, z },
        { width: lineWidth, depth: 0.075, height: 0.055, x: cardWidth * (field?.mutable ? 0.08 : 0.04), y: 0.35, z },
      )
    }
    addSolid(mergedBoxes(rows), palette.circuit, "schema-field-rows")
  }

  const addService = () => {
    const rackWidth = footprint.width * 0.88
    const rackDepth = footprint.depth * 0.72
    addSolid(mergedBoxes([
      { width: rackWidth, depth: rackDepth, height: 0.2, x: 0, y: 0.11, z: 0.06 },
      { width: rackWidth * 0.95, depth: rackDepth, height: 0.21, x: 0, y: 0.32, z: 0 },
      { width: rackWidth * 0.9, depth: rackDepth, height: 0.22, x: 0, y: 0.535, z: -0.06 },
    ]), palette.primary, "service-server-stack")
    addSolid(mergedBoxes([
      { width: rackWidth * 0.82, depth: 0.11, height: 0.075, x: 0, y: 0.235, z: rackDepth * 0.43 },
      { width: rackWidth * 0.78, depth: 0.11, height: 0.075, x: 0, y: 0.45, z: rackDepth * 0.4 },
      { width: rackWidth * 0.74, depth: 0.11, height: 0.075, x: 0, y: 0.67, z: rackDepth * 0.37 },
    ]), palette.top, "service-rack-fascias")
    addSolid(mergedBoxes([
      ...Array.from({ length: 3 }, (_, index) => ({
        width: 0.18,
        depth: 0.17,
        height: 0.065,
        x: (index - 1) * rackWidth * 0.18,
        y: 0.735,
        z: rackDepth * 0.2,
      })),
      { width: 0.09, depth: 0.09, height: 0.065, x: rackWidth * 0.32, y: 0.735, z: rackDepth * 0.2 },
      { width: 0.09, depth: 0.09, height: 0.065, x: rackWidth * 0.39, y: 0.735, z: rackDepth * 0.2 },
    ]), palette.circuit, "service-network-ports")
  }

  const addInterface = () => {
    const outerWidth = footprint.width * 0.9
    const outerDepth = footprint.depth * 0.76
    const rail = 0.18
    const armWidth = outerWidth * 0.22
    addSolid(mergedBoxes([
      { width: rail, depth: outerDepth, height: 0.34, x: -outerWidth * 0.43, y: 0.18, z: 0 },
      { width: armWidth, depth: rail, height: 0.34, x: -outerWidth * 0.34, y: 0.18, z: -outerDepth / 2 + rail / 2 },
      { width: armWidth, depth: rail, height: 0.34, x: -outerWidth * 0.34, y: 0.18, z: outerDepth / 2 - rail / 2 },
      { width: rail, depth: outerDepth, height: 0.34, x: outerWidth * 0.43, y: 0.18, z: 0 },
      { width: armWidth, depth: rail, height: 0.34, x: outerWidth * 0.34, y: 0.18, z: -outerDepth / 2 + rail / 2 },
      { width: armWidth, depth: rail, height: 0.34, x: outerWidth * 0.34, y: 0.18, z: outerDepth / 2 - rail / 2 },
    ]), palette.primary, "interface-contract-brackets")

    const pinRows = [-0.24, 0, 0.24]
    addSolid(mergedBoxes(pinRows.map((offset) => ({
      width: outerWidth * 0.58,
      depth: 0.1,
      height: 0.09,
      x: 0,
      y: 0.41,
      z: outerDepth * offset,
    }))), palette.top, "interface-matching-pins")
    addSolid(mergedBoxes(pinRows.flatMap((offset) => [
      { width: 0.16, depth: 0.16, height: 0.06, x: -outerWidth * 0.25, y: 0.47, z: outerDepth * offset },
      { width: 0.16, depth: 0.16, height: 0.06, x: outerWidth * 0.25, y: 0.47, z: outerDepth * offset },
    ])), palette.circuit, "interface-sockets")
  }

  const addType = () => {
    const halfWidth = footprint.width * 0.46
    const halfDepth = footprint.depth * 0.42
    addSolid(prismGeometry([
      { x: -halfWidth, z: -halfDepth },
      { x: halfWidth * 0.45, z: -halfDepth },
      { x: halfWidth, z: 0 },
      { x: halfWidth * 0.45, z: halfDepth },
      { x: -halfWidth, z: halfDepth },
    ], 0.02, 0.38), palette.primary, "type-tag")

    const hole = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 18)
    hole.translate(-halfWidth * 0.68, 0.435, 0)
    addSolid(hole, palette.circuit, "type-tag-hole")
    addSolid(mergedBoxes([
      { width: halfWidth * 0.72, depth: 0.13, height: 0.08, x: halfWidth * 0.12, y: 0.45, z: -halfDepth * 0.32 },
      { width: 0.14, depth: halfDepth * 0.92, height: 0.08, x: halfWidth * 0.12, y: 0.45, z: halfDepth * 0.05 },
    ]), palette.top, "type-letter-t")
  }

  const addFunction = () => {
    const halfWidth = footprint.width * 0.47
    const halfDepth = footprint.depth * 0.42
    addSolid(mergedBoxes([{
      width: footprint.width * 0.92,
      depth: footprint.depth * 0.72,
      height: 0.22,
      x: 0,
      y: 0.12,
      z: 0,
    }]), palette.primary, "function-pipeline-base")
    addSolid(mergedBoxes([{
      width: footprint.width * 0.24,
      depth: footprint.depth * 0.58,
      height: 0.34,
      x: -footprint.width * 0.03,
      y: 0.37,
      z: 0,
    }]), palette.top, "function-processor")
    addSolid(mergedBoxes([
      { width: footprint.width * 0.24, depth: 0.075, height: 0.065, x: -footprint.width * 0.28, y: 0.285, z: -halfDepth * 0.28 },
      { width: footprint.width * 0.24, depth: 0.075, height: 0.065, x: -footprint.width * 0.28, y: 0.285, z: halfDepth * 0.28 },
      { width: 0.14, depth: 0.17, height: 0.065, x: -halfWidth * 0.84, y: 0.285, z: -halfDepth * 0.28 },
      { width: 0.14, depth: 0.17, height: 0.065, x: -halfWidth * 0.84, y: 0.285, z: halfDepth * 0.28 },
      { width: 0.11, depth: halfDepth * 0.74, height: 0.065, x: -footprint.width * 0.07, y: 0.57, z: 0 },
      { width: footprint.width * 0.1, depth: 0.08, height: 0.065, x: -footprint.width * 0.025, y: 0.57, z: -halfDepth * 0.28 },
      { width: footprint.width * 0.08, depth: 0.08, height: 0.065, x: -footprint.width * 0.035, y: 0.57, z: 0 },
    ]), palette.circuit, "function-inputs-and-f")
    addSolid(prismGeometry([
      { x: footprint.width * 0.1, z: -halfDepth * 0.13 },
      { x: halfWidth * 0.58, z: -halfDepth * 0.13 },
      { x: halfWidth * 0.58, z: -halfDepth * 0.38 },
      { x: halfWidth * 0.86, z: 0 },
      { x: halfWidth * 0.58, z: halfDepth * 0.38 },
      { x: halfWidth * 0.58, z: halfDepth * 0.13 },
      { x: footprint.width * 0.1, z: halfDepth * 0.13 },
    ], 0.24, 0.2), palette.top, "function-output-arrow")
  }

  const addError = () => {
    const halfWidth = footprint.width * 0.46
    const halfDepth = footprint.depth * 0.43
    addSolid(prismGeometry([
      { x: 0, z: -halfDepth },
      { x: halfWidth, z: halfDepth },
      { x: -halfWidth, z: halfDepth },
    ], 0.02, 0.4), palette.primary, "error-warning-sign")
    addSolid(prismGeometry([
      { x: 0, z: -halfDepth * 0.66 },
      { x: halfWidth * 0.7, z: halfDepth * 0.66 },
      { x: -halfWidth * 0.7, z: halfDepth * 0.66 },
    ], 0.44, 0.08), palette.top, "error-warning-face")
    addSolid(mergedBoxes([
      { width: 0.12, depth: footprint.depth * 0.27, height: 0.075, x: 0, y: 0.54, z: -footprint.depth * 0.025 },
      { width: 0.15, depth: 0.15, height: 0.075, x: 0, y: 0.54, z: footprint.depth * 0.25 },
    ]), palette.circuit, "error-exclamation")
  }

  switch (category) {
    case "Schema": addSchema(); break
    case "Service": addService(); break
    case "Interface": addInterface(); break
    case "Type": addType(); break
    case "EffectfulFunction": addFunction(); break
    case "Error": addError(); break
  }

  const ghosted = (comparison && node.change === "removed") || !version
  if (ghosted) {
    materials.forEach((material) => {
      material.transparent = true
      material.opacity = material === palette.circuit ? 0.2 : 0.34
      material.depthWrite = false
    })
  }

  if (comparison && node.change !== "unchanged") {
    const changeMaterial = createBoardMaterial({
      color: changeColors[node.change],
      surface: "status",
      accent: "#fff4d6",
    })
    materials.push(changeMaterial)
    addSolid(mergedBoxes([{
      width: Math.min(0.24, footprint.width * 0.12),
      depth: Math.min(0.24, footprint.depth * 0.16),
      height: 0.05,
      x: -footprint.width * 0.12,
      y: 0.8,
      z: -footprint.depth * 0.12,
    }]), changeMaterial, "change-status-mark")
  }

  const halfWidth = footprint.width * 0.49, halfDepth = footprint.depth * 0.49
  const haloGeometry = new THREE.BufferGeometry()
  haloGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -halfWidth, 0, -halfDepth, halfWidth, 0, -halfDepth,
    halfWidth, 0, halfDepth, -halfWidth, 0, halfDepth,
  ], 3))
  const halo = new THREE.LineLoop(haloGeometry, new THREE.LineBasicMaterial({ color: "#ffe4a0", transparent: true, opacity: 0.9 }))
  halo.name = "selection-halo"
  halo.position.y = 0.01
  halo.visible = false
  group.add(halo)

  const contacts = contactsFor(pickables, position, group.position.y)
  return { group, materials, halo, pickables, contacts }
}
