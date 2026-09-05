import * as THREE from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
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
  Service: { width: 2.34, depth: 2.16 },
  Interface: { width: 2.72, depth: 1.62 },
  Type: { width: 2.14, depth: 2.14 },
  EffectfulFunction: { width: 3.34, depth: 1.44 },
  Error: { width: 2.06, depth: 1.94 },
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
  const geometries = boxes.map((box) => new THREE.BoxGeometry(box.width, box.height, box.depth)
    .translate(box.x, box.y, box.z))
  const merged = mergeGeometries(geometries, false)
  geometries.forEach((geometry) => geometry.dispose())
  return merged ?? new THREE.BufferGeometry()
}

const prismGeometry = (points: ReadonlyArray<Point>, bottom: number, height: number) => {
  const contour = points.map((point) => new THREE.Vector2(point.x, point.z))
  const triangles = THREE.ShapeUtils.triangulateShape(contour, [])
  const count = points.length
  const positions = new Float32Array(count * 6)

  points.forEach((point, index) => {
    const offset = index * 3
    positions[offset] = point.x
    positions[offset + 1] = bottom
    positions[offset + 2] = point.z
    positions[(count + index) * 3] = point.x
    positions[(count + index) * 3 + 1] = bottom + height
    positions[(count + index) * 3 + 2] = point.z
  })

  const indices: number[] = []
  triangles.forEach(([first, second, third]) => {
    indices.push(count + first, count + third, count + second)
    indices.push(first, second, third)
  })
  points.forEach((_, index) => {
    const next = (index + 1) % count
    indices.push(index, count + index, count + next, index, count + next, next)
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const createMaterials = (category: CodeCategory) => {
  const entity = new THREE.Color(entityStyles[category].color)
  const top = entity.clone().lerp(new THREE.Color("#f5f0d4"), 0.18)
  return {
    primary: new THREE.MeshStandardMaterial({ color: entity, roughness: 0.62, metalness: 0.27 }),
    top: new THREE.MeshStandardMaterial({ color: top, roughness: 0.46, metalness: 0.48 }),
    circuit: new THREE.MeshStandardMaterial({ color: "#254d43", roughness: 0.7, metalness: 0.16 }),
  }
}

const contactsFor = (geometry: THREE.BufferGeometry, position: Point): ComponentContacts => {
  geometry.computeBoundingBox()
  const floor = geometry.boundingBox!.min.y
  const vertices = geometry.getAttribute("position")
  const contact = (axis: "x" | "z", direction: number) => {
    let boundary = direction < 0 ? Infinity : -Infinity
    let tangentSum = 0, count = 0
    for (let index = 0; index < vertices.count; index += 1) {
      if (vertices.getY(index) !== floor) continue
      const value = axis === "x" ? vertices.getX(index) : vertices.getZ(index)
      const tangent = axis === "x" ? vertices.getZ(index) : vertices.getX(index)
      if ((value - boundary) * direction > 0) {
        boundary = value
        tangentSum = tangent
        count = 1
      } else if (value === boundary) {
        tangentSum += tangent
        count += 1
      }
    }
    return {
      x: position.x + (axis === "x" ? boundary : tangentSum / count),
      y: 0.34 + floor,
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
    mesh.name = name
    mesh.userData.scopeNodeId = node.id
    group.add(mesh)
    pickables.push(mesh)
    if (!materials.includes(material)) materials.push(material)
    return mesh
  }

  const addSchema = () => {
    const fields = version?.schema?.fields ?? []
    const rowCount = Math.min(fields.length, 7)
    const plateCount = Math.max(2, Math.min(4, Math.ceil(Math.max(rowCount, 1) / 2)))
    const plateDepth = footprint.depth / (plateCount + 0.7)
    const plates: BoxSpec[] = []
    for (let index = 0; index < plateCount; index += 1) {
      const width = footprint.width * (0.94 - index * 0.07)
      plates.push({
        width,
        depth: plateDepth * 0.86,
        height: 0.14,
        x: 0,
        y: 0.09 + index * 0.08,
        z: (index - (plateCount - 1) / 2) * plateDepth,
      })
    }
    addSolid(mergedBoxes(plates), palette.primary, "schema-plates")

    if (rowCount > 0) {
      const rows: BoxSpec[] = []
      fields.slice(0, 7).forEach((field, index) => {
        const plate = index % plateCount
        const lane = Math.floor(index / plateCount)
        const width = footprint.width * (field.optional ? 0.36 : 0.52)
        rows.push({
          width,
          depth: 0.055,
          height: 0.035,
          x: field.mutable ? -footprint.width * 0.09 : footprint.width * 0.06,
          y: 0.19 + plate * 0.08,
          z: (plate - (plateCount - 1) / 2) * plateDepth + (lane - 0.5) * 0.1,
        })
      })
      addSolid(mergedBoxes(rows), palette.circuit, "schema-field-rows")
    }
  }

  const addService = () => {
    const radius = Math.min(footprint.width, footprint.depth) * 0.46
    const hub = new THREE.CylinderGeometry(radius, radius, 0.26, 6)
    hub.rotateY(Math.PI / 6)
    hub.translate(0, 0.14, 0)
    addSolid(hub, palette.primary, "service-hub")

    const ring = new THREE.TorusGeometry(radius * 0.47, 0.065, 6, 18)
    ring.rotateX(Math.PI / 2)
    ring.translate(0, 0.31, 0)
    addSolid(ring, palette.top, "service-inset-ring")

    const ports: BoxSpec[] = Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 6 + index * Math.PI / 3
      return {
        width: 0.16,
        depth: 0.16,
        height: 0.07,
        x: Math.cos(angle) * radius * 0.68,
        y: 0.31,
        z: Math.sin(angle) * radius * 0.68,
      }
    })
    addSolid(mergedBoxes(ports), palette.circuit, "service-ports")
  }

  const addInterface = () => {
    const rail = 0.16
    const outerWidth = footprint.width * 0.92
    const outerDepth = footprint.depth * 0.84
    addSolid(mergedBoxes([
      { width: outerWidth, depth: rail, height: 0.22, x: 0, y: 0.12, z: -outerDepth / 2 + rail / 2 },
      { width: outerWidth, depth: rail, height: 0.22, x: 0, y: 0.12, z: outerDepth / 2 - rail / 2 },
      { width: rail, depth: outerDepth - rail * 2, height: 0.22, x: -outerWidth / 2 + rail / 2, y: 0.12, z: 0 },
      { width: rail, depth: outerDepth - rail * 2, height: 0.22, x: outerWidth / 2 - rail / 2, y: 0.12, z: 0 },
    ]), palette.primary, "interface-frame")

    const pins: BoxSpec[] = Array.from({ length: 5 }, (_, index) => ({
      width: 0.08,
      depth: 0.13,
      height: 0.055,
      x: (index - 2) * (outerWidth * 0.13),
      y: 0.255,
      z: -outerDepth * 0.31,
    }))
    addSolid(mergedBoxes(pins), palette.circuit, "interface-socket-pins")
  }

  const addType = () => {
    const radius = Math.min(footprint.width, footprint.depth) * 0.46
    addSolid(prismGeometry([
      { x: 0, z: -radius },
      { x: radius, z: 0 },
      { x: 0, z: radius },
      { x: -radius, z: 0 },
    ], 0.02, 0.28), palette.primary, "type-diamond")
    addSolid(prismGeometry([
      { x: 0, z: -radius * 0.36 },
      { x: radius * 0.36, z: 0 },
      { x: 0, z: radius * 0.36 },
      { x: -radius * 0.36, z: 0 },
    ], 0.3, 0.055), palette.top, "type-diamond-inset")
  }

  const addFunction = () => {
    const halfWidth = footprint.width * 0.47
    const halfDepth = footprint.depth * 0.43
    const neck = footprint.width * 0.1
    addSolid(prismGeometry([
      { x: -halfWidth, z: -halfDepth * 0.44 },
      { x: neck, z: -halfDepth * 0.44 },
      { x: neck, z: -halfDepth },
      { x: halfWidth, z: 0 },
      { x: neck, z: halfDepth },
      { x: neck, z: halfDepth * 0.44 },
      { x: -halfWidth, z: halfDepth * 0.44 },
    ], 0.02, 0.28), palette.primary, "function-arrow")
    addSolid(mergedBoxes([
      { width: footprint.width * 0.32, depth: 0.09, height: 0.045, x: -footprint.width * 0.18, y: 0.31, z: 0 },
      { width: 0.09, depth: footprint.depth * 0.2, height: 0.045, x: footprint.width * 0.16, y: 0.31, z: 0 },
    ]), palette.circuit, "function-operation-mark")
  }

  const addError = () => {
    const halfWidth = footprint.width * 0.46
    const halfDepth = footprint.depth * 0.43
    addSolid(prismGeometry([
      { x: 0, z: -halfDepth },
      { x: halfWidth, z: halfDepth },
      { x: -halfWidth, z: halfDepth },
    ], 0.02, 0.26), palette.primary, "error-warning-triangle")
    addSolid(mergedBoxes([
      { width: 0.11, depth: footprint.depth * 0.28, height: 0.06, x: 0, y: 0.3, z: -footprint.depth * 0.03 },
      { width: 0.14, depth: 0.14, height: 0.06, x: 0, y: 0.3, z: footprint.depth * 0.25 },
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
    const changeMaterial = new THREE.MeshStandardMaterial({
      color: changeColors[node.change],
      roughness: 0.52,
      metalness: 0.34,
    })
    materials.push(changeMaterial)
    addSolid(mergedBoxes([{
      width: Math.min(0.24, footprint.width * 0.12),
      depth: Math.min(0.24, footprint.depth * 0.16),
      height: 0.05,
      x: -footprint.width * 0.12,
      y: 0.32,
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

  const contacts = contactsFor((pickables[0] as THREE.Mesh).geometry, position)
  return { group, materials, halo, pickables, contacts }
}
