import * as THREE from "three"
import type { ScopeConnection, ScopeGraph, ScopeNode } from "../scope-types"
import type { SpatialWorld } from "./spatial-world"

type RoomRecord = {
  readonly node: ScopeNode
  readonly object: THREE.Group
  readonly level: number
  readonly x: number
  readonly z: number
  readonly wing: number
  readonly label: THREE.Vector3
  readonly port: THREE.Vector3
  readonly floorMaterial: THREE.MeshStandardMaterial
  readonly lampMaterial: THREE.MeshStandardMaterial
  readonly outlineMaterial: THREE.LineBasicMaterial
}

type StoreySupport = {
  readonly group: THREE.Group
  readonly level: number
}

type ColumnSpan = {
  readonly mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>
  readonly lower: number
  readonly upper: number
  readonly wing: number
}

type StairSpan = {
  readonly lower: number
  readonly upper: number
  readonly steps: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[]
  readonly landing: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  readonly railPosts: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[]
}

type CaptionRecord = {
  readonly wing: number
  readonly offset: number
  readonly topLevel: number
  readonly position: THREE.Vector3
}

const ROOM_WIDTH = 2.7
const ROOM_DEPTH = 2.15
const ROOM_HEIGHT = 2.2
const WING_WIDTH = 11.6
const WING_CENTERS = [-8.1, 8.1]
const BAY_OFFSETS = [-3.5, 0, 3.5]

const createMaterial = (color: number, roughness: number, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness })

const addMesh = <T extends THREE.BufferGeometry, M extends THREE.Material>(
  parent: THREE.Object3D,
  geometry: T,
  material: M,
  position?: THREE.Vector3,
) => {
  const mesh = new THREE.Mesh(geometry, material)
  if (position) mesh.position.copy(position)
  parent.add(mesh)
  return mesh
}

const profileMesh = (
  points: ReadonlyArray<THREE.Vector2>,
  depth: number,
  material: THREE.MeshStandardMaterial,
) => {
  const shape = new THREE.Shape()
  shape.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) shape.lineTo(point.x, point.y)
  shape.closePath()
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    material,
  )
  mesh.position.z = -depth / 2
  return mesh
}

const tubeBetween = (
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  material: THREE.MeshStandardMaterial,
  radius = 0.055,
) => {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal")
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 6, false), material))
}

const roomRoof = (
  category: ScopeNode["category"],
  terracotta: THREE.MeshStandardMaterial,
  timber: THREE.MeshStandardMaterial,
  oxidized: THREE.MeshStandardMaterial,
) => {
  const roof = new THREE.Group()
  switch (category) {
    case "Schema": {
      const gable = profileMesh(
        [
          new THREE.Vector2(-1.27, 0),
          new THREE.Vector2(0, 0.72),
          new THREE.Vector2(1.27, 0),
        ],
        ROOM_DEPTH,
        terracotta,
      )
      gable.position.y = ROOM_HEIGHT
      roof.add(gable)
      break
    }
    case "Error": {
      const broken = profileMesh(
        [
          new THREE.Vector2(-1.25, 0),
          new THREE.Vector2(-0.18, 0.62),
          new THREE.Vector2(0.12, 0.33),
          new THREE.Vector2(1.25, 0.58),
          new THREE.Vector2(1.25, 0),
        ],
        ROOM_DEPTH,
        terracotta,
      )
      broken.position.y = ROOM_HEIGHT
      roof.add(broken)
      break
    }
    case "Service": {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(1.28, 1.28, ROOM_DEPTH, 28, 1, false, 0, Math.PI),
        oxidized,
      )
      barrel.rotation.x = Math.PI / 2
      barrel.position.y = ROOM_HEIGHT
      roof.add(barrel)
      break
    }
    case "Interface": {
      addMesh(roof, new THREE.BoxGeometry(2.72, 0.2, ROOM_DEPTH), timber, new THREE.Vector3(0, ROOM_HEIGHT + 0.12, 0))
      for (const x of [-0.95, 0, 0.95]) {
        addMesh(roof, new THREE.BoxGeometry(0.12, 0.48, 0.18), timber, new THREE.Vector3(x, ROOM_HEIGHT + 0.32, -0.65))
      }
      break
    }
    case "Type": {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.18, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        terracotta,
      )
      dome.position.y = ROOM_HEIGHT
      roof.add(dome)
      break
    }
    case "EffectfulFunction": {
      const shed = profileMesh(
        [
          new THREE.Vector2(-1.27, 0),
          new THREE.Vector2(-1.27, 0.7),
          new THREE.Vector2(1.27, 0.18),
          new THREE.Vector2(1.27, 0),
        ],
        ROOM_DEPTH,
        oxidized,
      )
      shed.position.y = ROOM_HEIGHT
      roof.add(shed)
      break
    }
  }
  return roof
}

const addPortal = (
  room: THREE.Group,
  category: ScopeNode["category"],
  material: THREE.MeshStandardMaterial,
) => {
  const front = ROOM_DEPTH / 2 + 0.025
  const uprights = [-0.77, 0.77]
  for (const x of uprights) {
    addMesh(room, new THREE.CylinderGeometry(0.055, 0.07, 1.28, 8), material, new THREE.Vector3(x, 0.71, front))
  }

  const archY = 1.3
  if (category === "Schema") {
    tubeBetween(room, [new THREE.Vector3(-0.8, archY, front), new THREE.Vector3(0, 1.8, front), new THREE.Vector3(0.8, archY, front)], material)
  } else if (category === "Error") {
    tubeBetween(room, [new THREE.Vector3(-0.8, archY, front), new THREE.Vector3(-0.1, 1.76, front), new THREE.Vector3(0.15, 1.5, front), new THREE.Vector3(0.8, 1.76, front)], material)
  } else if (category === "Service" || category === "Type") {
    const points = Array.from({ length: 9 }, (_, index) => {
      const theta = Math.PI - (Math.PI * index) / 8
      return new THREE.Vector3(Math.cos(theta) * 0.8, archY + Math.sin(theta) * 0.5, front)
    })
    tubeBetween(room, points, material)
  } else if (category === "EffectfulFunction") {
    tubeBetween(room, [new THREE.Vector3(-0.8, archY, front), new THREE.Vector3(0.8, 1.7, front)], material)
  } else {
    tubeBetween(room, [new THREE.Vector3(-0.8, 1.68, front), new THREE.Vector3(0.8, 1.68, front)], material)
  }
}

const buildRoom = (
  node: ScopeNode,
  plaster: THREE.MeshStandardMaterial,
  plasterShade: THREE.MeshStandardMaterial,
  timber: THREE.MeshStandardMaterial,
  oxidized: THREE.MeshStandardMaterial,
  terracotta: THREE.MeshStandardMaterial,
  brass: THREE.MeshStandardMaterial,
) => {
  const room = new THREE.Group()
  room.name = `Room: ${node.label}`

  const floorMaterial = createMaterial(0xb95d3f, 0.78)
  const lampMaterial = createMaterial(0x9b582e, 0.38, 0.48)
  lampMaterial.emissive.set(0x160b04)
  lampMaterial.emissiveIntensity = 0.2
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x79513b, transparent: true, opacity: 0.4 })

  const floor = addMesh(room, new THREE.BoxGeometry(ROOM_WIDTH, 0.18, ROOM_DEPTH), floorMaterial, new THREE.Vector3(0, 0, 0))
  floor.userData.nodeId = node.id
  floor.name = `Pickable room: ${node.label}`
  addMesh(room, new THREE.BoxGeometry(ROOM_WIDTH - 0.22, 1.76, 0.16), plasterShade, new THREE.Vector3(0, 0.95, -ROOM_DEPTH / 2 + 0.06))
  addMesh(room, new THREE.BoxGeometry(0.17, 1.72, ROOM_DEPTH), plaster, new THREE.Vector3(-ROOM_WIDTH / 2 + 0.08, 0.94, 0))
  addMesh(room, new THREE.BoxGeometry(0.17, 1.72, ROOM_DEPTH), plaster, new THREE.Vector3(ROOM_WIDTH / 2 - 0.08, 0.94, 0))

  const hearth = addMesh(room, new THREE.CylinderGeometry(0.42, 0.48, 0.24, 12), lampMaterial, new THREE.Vector3(0, 0.21, 0.06))
  hearth.userData.nodeId = node.id
  const plinth = addMesh(room, new THREE.CylinderGeometry(0.64, 0.64, 0.06, 12), brass, new THREE.Vector3(0, 0.075, 0.06))
  plinth.userData.nodeId = node.id

  if (node.category === "Schema") {
    const fields = node.current?.schema?.fields ?? node.proposed?.schema?.fields ?? []
    for (let index = 0; index < fields.length; index += 1) {
      const x = -1.05 + ((index + 0.5) / fields.length) * 2.1
      addMesh(room, new THREE.BoxGeometry(Math.min(0.11, 1.6 / fields.length), 1.08, 0.22), timber, new THREE.Vector3(x, 0.64, -0.72))
    }
  }

  const roof = roomRoof(node.category, terracotta, timber, oxidized)
  room.add(roof)
  addPortal(room, node.category, oxidized)

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH)), outlineMaterial)
  outline.position.y = ROOM_HEIGHT / 2
  room.add(outline)

  return { room, floorMaterial, lampMaterial, outlineMaterial }
}

export const buildArchitecture = (graph: ScopeGraph): SpatialWorld => {
  const root = new THREE.Group()
  root.name = "Architectural section model"

  const plaster = createMaterial(0xeadcc4, 0.92)
  const plasterShade = createMaterial(0xc7b493, 0.96)
  const terracotta = createMaterial(0xa94c32, 0.82)
  const timber = createMaterial(0x754633, 0.78)
  const oxidized = createMaterial(0x426b62, 0.42, 0.67)
  const brass = createMaterial(0xb98a45, 0.28, 0.78)
  const footing = createMaterial(0xa49886, 0.95)

  const sortedScopes = [...new Set(graph.nodes.map((node) => node.scope))].sort((a, b) => a.localeCompare(b))
  const scopeWing = new Map<string, number>()
  const leftScopeCount = Math.ceil(sortedScopes.length / 2)
  sortedScopes.forEach((scope, index) => scopeWing.set(scope, index < leftScopeCount ? 0 : 1))

  const wingNodes = [[], []] as ScopeNode[][]
  for (const node of graph.nodes) wingNodes[scopeWing.get(node.scope) ?? 0].push(node)
  for (const nodes of wingNodes) nodes.sort((a, b) => a.scope.localeCompare(b.scope) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))

  const levelCount = wingNodes.map((nodes) => Math.max(1, Math.ceil(nodes.length / 3)))
  const storeys: StoreySupport[] = []
  const columns: ColumnSpan[] = []
  const stairSpans: StairSpan[] = []

  for (let wing = 0; wing < 2; wing += 1) {
    const center = WING_CENTERS[wing]
    const foundation = addMesh(root, new THREE.BoxGeometry(WING_WIDTH, 0.52, 3.45), footing, new THREE.Vector3(center, -0.45, -0.12))
    foundation.name = "Stone footing"
    addMesh(root, new THREE.BoxGeometry(WING_WIDTH + 0.6, 0.14, 3.9), terracotta, new THREE.Vector3(center, -0.15, -0.12))

    for (let level = 0; level < levelCount[wing]; level += 1) {
      const storey = new THREE.Group()
      storey.name = `Storey ${level + 1}`
      addMesh(storey, new THREE.BoxGeometry(WING_WIDTH, 0.3, 3.05), terracotta, new THREE.Vector3(0, -0.12, -0.1))
      addMesh(storey, new THREE.BoxGeometry(WING_WIDTH - 0.35, 2.0, 0.18), plasterShade, new THREE.Vector3(0, 0.95, -1.47))
      for (const x of [-5.15, -1.75, 1.75, 5.15]) {
        addMesh(storey, new THREE.BoxGeometry(0.18, 1.12, 0.2), plaster, new THREE.Vector3(x, 1.25, -1.32))
      }
      storey.position.x = center
      root.add(storey)
      storeys.push({ group: storey, level })
    }

    for (let level = 0; level < levelCount[wing]; level += 1) {
      const upper = level + 1
      for (const x of [center - 5.05, center + 5.05]) {
        for (const z of [-1.35, 1.25]) {
          const column = addMesh(root, new THREE.CylinderGeometry(0.17, 0.21, 1, 10), oxidized, new THREE.Vector3(x, 0.5, z))
          columns.push({ mesh: column, lower: level, upper, wing })
        }
      }
    }

    for (let level = 0; level < levelCount[wing] - 1; level += 1) {
      const stairGroup = new THREE.Group()
      stairGroup.name = "Open stair and landing"
      root.add(stairGroup)
      const steps: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = []
      const railPosts: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[] = []
      for (let step = 0; step < 7; step += 1) {
        const tread = addMesh(stairGroup, new THREE.BoxGeometry(0.82, 0.14, 0.36), timber, new THREE.Vector3(center - 4.35, 0, 1.35 - step * 0.25))
        steps.push(tread)
        const post = addMesh(stairGroup, new THREE.CylinderGeometry(0.035, 0.035, 1, 6), oxidized, new THREE.Vector3(center - 4.72, 0, 1.35 - step * 0.25))
        railPosts.push(post)
      }
      const landing = addMesh(stairGroup, new THREE.BoxGeometry(1.12, 0.15, 0.9), timber, new THREE.Vector3(center - 4.35, 0, -0.5))
      stairSpans.push({ lower: level, upper: level + 1, steps, landing, railPosts })
    }
  }

  const rooms: RoomRecord[] = []
  const nodes = new Map<string, { object: THREE.Group; label: THREE.Vector3; port: THREE.Vector3 }>()
  for (let wing = 0; wing < 2; wing += 1) {
    wingNodes[wing].forEach((node, index) => {
      const level = Math.floor(index / 3)
      const x = WING_CENTERS[wing] + BAY_OFFSETS[index % 3]
      const z = 0.02
      const built = buildRoom(node, plaster, plasterShade, timber, oxidized, terracotta, brass)
      root.add(built.room)
      const label = new THREE.Vector3(x, 0, z + 0.18)
      const port = new THREE.Vector3(x, 0, z + ROOM_DEPTH / 2 + 0.2)
      const record: RoomRecord = { node, object: built.room, level, x, z, wing, label, port, floorMaterial: built.floorMaterial, lampMaterial: built.lampMaterial, outlineMaterial: built.outlineMaterial }
      rooms.push(record)
      nodes.set(node.id, { object: built.room, label, port })
    })
  }

  const captions: { text: string; position: THREE.Vector3 }[] = []
  const captionRecords: CaptionRecord[] = []
  sortedScopes.forEach((scope, scopeIndex) => {
    const wing = scopeWing.get(scope) ?? 0
    const scopesInWing = sortedScopes.filter((candidate) => scopeWing.get(candidate) === wing)
    const localIndex = scopesInWing.indexOf(scope)
    const topLevel = Math.max(0, ...rooms.filter((room) => room.node.scope === scope).map((room) => room.level))
    const position = new THREE.Vector3(WING_CENTERS[wing] + (localIndex - (scopesInWing.length - 1) / 2) * 2.6, 0, -0.05)
    captions.push({ text: scope, position })
    captionRecords.push({ wing, offset: position.x - WING_CENTERS[wing], topLevel, position })
  })

  const floorY = (level: number, spread: number) => level * THREE.MathUtils.lerp(3.05, 5.05, spread)
  const setSpread = (value: number) => {
    const spread = THREE.MathUtils.clamp(value, 0, 1)
    for (const storey of storeys) storey.group.position.y = floorY(storey.level, spread)
    for (const room of rooms) {
      const y = floorY(room.level, spread)
      room.object.position.set(room.x, y, room.z)
      room.label.set(room.x, y + ROOM_HEIGHT + 1.0, room.z + 0.16)
      room.port.set(room.x, y + 1.18, room.z + ROOM_DEPTH / 2 + 0.2)
    }
    for (const column of columns) {
      const lowerY = column.lower === 0 ? -0.14 : floorY(column.lower, spread)
      const upperY = column.upper === levelCount[column.wing] ? floorY(column.lower, spread) + ROOM_HEIGHT + .35 : floorY(column.upper, spread) - .14
      const height = Math.max(0.25, upperY - lowerY)
      column.mesh.position.y = lowerY + height / 2
      column.mesh.scale.y = height
    }
    for (const stair of stairSpans) {
      const lowerY = floorY(stair.lower, spread)
      const upperY = floorY(stair.upper, spread)
      stair.steps.forEach((step, index) => {
        const t = (index + 1) / 8
        step.position.y = lowerY + (upperY - lowerY) * t
      })
      stair.railPosts.forEach((post, index) => {
        const t = (index + 1) / 8
        const stepY = lowerY + (upperY - lowerY) * t
        post.position.y = stepY + 0.45
        post.scale.y = 0.9
      })
      stair.landing.position.y = upperY - 0.08
    }
    for (const caption of captionRecords) {
      caption.position.set(
        WING_CENTERS[caption.wing] + caption.offset,
        floorY(caption.topLevel, spread) + ROOM_HEIGHT + 1.8,
        -0.05,
      )
    }
  }

  const setSelected = (id: string) => {
    for (const room of rooms) {
      const selected = room.node.id === id
      room.floorMaterial.color.set(selected ? 0xc45d35 : 0xb95d3f)
      room.floorMaterial.emissive.set(selected ? 0x3a1005 : 0x000000)
      room.floorMaterial.emissiveIntensity = selected ? 0.45 : 0
      room.lampMaterial.color.set(selected ? 0xd5a14d : 0x9b582e)
      room.lampMaterial.emissive.set(selected ? 0x6b2b09 : 0x160b04)
      room.lampMaterial.emissiveIntensity = selected ? 1.35 : 0.2
      room.outlineMaterial.color.set(selected ? 0xd5a14d : 0x79513b)
      room.outlineMaterial.opacity = selected ? 0.95 : 0.4
    }
  }

  const route = (connection: ScopeConnection, index: number): THREE.Curve<THREE.Vector3> => {
    const from = nodes.get(connection.from)?.port
    const to = nodes.get(connection.to)?.port
    if (!from || !to) return new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3())
    const rise = 0.45 + (index % 4) * 0.16
    const start = from.clone()
    const end = to.clone()
    const startLeg = start.clone().add(new THREE.Vector3(0, rise, 0.28))
    const endLeg = end.clone().add(new THREE.Vector3(0, rise, 0.28))
    const crown = startLeg.clone().lerp(endLeg, 0.5).add(new THREE.Vector3(0, 0.48 + (index % 3) * 0.14, 0.12))
    const curve = new THREE.CurvePath<THREE.Vector3>()
    curve.add(new THREE.LineCurve3(start, startLeg))
    curve.add(new THREE.QuadraticBezierCurve3(startLeg, crown, endLeg))
    curve.add(new THREE.LineCurve3(endLeg, end))
    return curve
  }

  setSpread(0.65)

  return {
    root,
    nodes,
    captions,
    background: 0xe9e4da,
    dark: false,
    cameraDirection: new THREE.Vector3(.6, .38, 1.3).normalize(),
    spreadLabel: "Section pull-apart",
    explanation: "Each room is a contract; each wing is a module. Storey height is a layout choice, not a measure of importance.",
    setSpread,
    setSelected,
    route,
  }
}
