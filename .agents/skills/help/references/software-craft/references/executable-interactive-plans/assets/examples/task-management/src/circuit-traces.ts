import * as THREE from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { createBoardMaterial } from "./board-materials"
import { changeColors, relationshipStyles } from "./board-semantics"
import type { ScopeConnection } from "./scope-types"
import type { ComponentContacts } from "./board-components"

type Footprint = {
  readonly id: string
  readonly x: number
  readonly z: number
  readonly width: number
  readonly depth: number
  readonly contacts: ComponentContacts
}

type CircuitTraceOptions = {
  readonly connections: ReadonlyArray<ScopeConnection>
  readonly components: ReadonlyArray<Footprint>
  readonly boardWidth: number
  readonly boardDepth: number
  readonly comparison: boolean
}

type Point = { readonly x: number; readonly z: number }
type Side = "left" | "right" | "top" | "bottom"
type Obstacle = Footprint & { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
type Segment = { readonly from: Point; readonly to: Point }
type Endpoint = { readonly pad: Point; readonly exit: Point; readonly contact: ComponentContacts[Side] }
type Rail = Segment & { readonly width: number }
type RelationshipPattern = (typeof relationshipStyles)[ScopeConnection["kind"]]["pattern"]
type RelationshipMarker = (typeof relationshipStyles)[ScopeConnection["kind"]]["marker"]
type TraceVisual = {
  readonly connection: ScopeConnection
  readonly material: THREE.MeshStandardMaterial
}

const trackWidth = 0.145
const doubleRailWidth = 0.066
const doubleRailOffset = 0.09
const busWidth = 0.265
const clearanceWidth = 0.235
const padRadius = 0.055
const routeClearance = 0.24 // Includes solder leads and the track's mask clearance.
const boardMargin = 0.2
const traceY = 0.102
const layerStep = 0.032
const traceHeight = 0.018
const markerHeight = 0.034
const markerSize = 0.44
const maskMaterialColor = 0x123d32

const distance = (from: Point, to: Point) => Math.abs(from.x - to.x) + Math.abs(from.z - to.z)
const pointEquals = (left: Point, right: Point) => Math.abs(left.x - right.x) < 0.0001 && Math.abs(left.z - right.z) < 0.0001

const simplify = (points: ReadonlyArray<Point>) => points.reduce<Point[]>((result, point) => {
  if (result.length === 0 || !pointEquals(result[result.length - 1], point)) result.push(point)
  if (result.length < 3) return result
  const first = result[result.length - 3]
  const middle = result[result.length - 2]
  const last = result[result.length - 1]
  if ((first.x === middle.x && middle.x === last.x) || (first.z === middle.z && middle.z === last.z)) result.splice(result.length - 2, 1)
  return result
}, [])

const segmentsOf = (points: ReadonlyArray<Point>) => points.slice(1).map((to, index) => ({ from: points[index], to }))

const intersects = (segment: Segment, obstacle: Obstacle) => {
  if (segment.from.x === segment.to.x) {
    const low = Math.min(segment.from.z, segment.to.z)
    const high = Math.max(segment.from.z, segment.to.z)
    return segment.from.x > obstacle.left && segment.from.x < obstacle.right && high > obstacle.top && low < obstacle.bottom
  }
  const low = Math.min(segment.from.x, segment.to.x)
  const high = Math.max(segment.from.x, segment.to.x)
  return segment.from.z > obstacle.top && segment.from.z < obstacle.bottom && high > obstacle.left && low < obstacle.right
}

const routeIsClear = (points: ReadonlyArray<Point>, obstacles: ReadonlyArray<Obstacle>) =>
  segmentsOf(points).every((segment) => obstacles.every((obstacle) => !intersects(segment, obstacle)))

const endpointFor = (component: Footprint, side: Side, index: number, total: number): Endpoint => {
  if (side === "left" || side === "right") {
    const offsetLimit = Math.max(0, component.depth / 2 - 0.11)
    const offset = total <= 1 ? 0 : -offsetLimit + index / (total - 1) * offsetLimit * 2
    const x = component.x + (side === "left" ? -1 : 1) * (component.width / 2 + 0.045)
    const z = component.z + offset
    return { pad: { x, z }, exit: { x: x + (side === "left" ? -1 : 1) * routeClearance, z }, contact: component.contacts[side] }
  }
  const offsetLimit = Math.max(0, component.width / 2 - 0.11)
  const offset = total <= 1 ? 0 : -offsetLimit + index / (total - 1) * offsetLimit * 2
  const z = component.z + (side === "top" ? -1 : 1) * (component.depth / 2 + 0.045)
  const x = component.x + offset
  return { pad: { x, z }, exit: { x, z: z + (side === "top" ? -1 : 1) * routeClearance }, contact: component.contacts[side] }
}

const sidesToward = (from: Footprint, to: Footprint): ReadonlyArray<Side> => {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const horizontal: Side = dx < 0 ? "left" : "right"
  const vertical: Side = dz < 0 ? "top" : "bottom"
  return Math.abs(dx) >= Math.abs(dz)
    ? [horizontal, vertical, horizontal === "left" ? "right" : "left", vertical === "top" ? "bottom" : "top"]
    : [vertical, horizontal, vertical === "top" ? "bottom" : "top", horizontal === "left" ? "right" : "left"]
}

const routeCandidates = (from: Point, to: Point, xLanes: ReadonlyArray<number>, zLanes: ReadonlyArray<number>) => {
  const candidates: Point[][] = [
    [from, { x: to.x, z: from.z }, to],
    [from, { x: from.x, z: to.z }, to],
  ]
  xLanes.forEach((x) => candidates.push([from, { x, z: from.z }, { x, z: to.z }, to]))
  zLanes.forEach((z) => candidates.push([from, { x: from.x, z }, { x: to.x, z }, to]))
  return candidates.map(simplify)
}

const detourCandidates = (from: Point, to: Point, xLanes: ReadonlyArray<number>, zLanes: ReadonlyArray<number>) => {
  const candidates: Point[][] = []
  xLanes.forEach((x) => zLanes.forEach((z) => {
    candidates.push([from, { x, z: from.z }, { x, z }, { x: to.x, z }, to])
    candidates.push([from, { x: from.x, z }, { x, z }, { x, z: to.z }, to])
  }))
  return candidates.map(simplify)
}

const segmentsConflict = (left: Segment, right: Segment, clearance: number) => {
  const leftVertical = left.from.x === left.to.x
  const rightVertical = right.from.x === right.to.x
  const margin = clearance / 2
  if (leftVertical === rightVertical) {
    if (leftVertical) {
      if (Math.abs(left.from.x - right.from.x) >= clearance) return false
      return Math.min(Math.max(left.from.z, left.to.z), Math.max(right.from.z, right.to.z)) + margin >= Math.max(Math.min(left.from.z, left.to.z), Math.min(right.from.z, right.to.z)) - margin
    }
    if (Math.abs(left.from.z - right.from.z) >= clearance) return false
    return Math.min(Math.max(left.from.x, left.to.x), Math.max(right.from.x, right.to.x)) + margin >= Math.max(Math.min(left.from.x, left.to.x), Math.min(right.from.x, right.to.x)) - margin
  }
  const vertical = leftVertical ? left : right
  const horizontal = leftVertical ? right : left
  return vertical.from.x >= Math.min(horizontal.from.x, horizontal.to.x) - margin && vertical.from.x <= Math.max(horizontal.from.x, horizontal.to.x) + margin
    && horizontal.from.z >= Math.min(vertical.from.z, vertical.to.z) - margin && horizontal.from.z <= Math.max(vertical.from.z, vertical.to.z) + margin
}

const pathsConflict = (left: ReadonlyArray<Point>, right: ReadonlyArray<Point>, clearance: number) =>
  segmentsOf(left).some((segment) => segmentsOf(right).some((other) => segmentsConflict(segment, other, clearance)))

const offsetSegment = (segment: Segment, offset: number): Segment => {
  const length = distance(segment.from, segment.to)
  const normal = { x: -(segment.to.z - segment.from.z) / length, z: (segment.to.x - segment.from.x) / length }
  return {
    from: { x: segment.from.x + normal.x * offset, z: segment.from.z + normal.z * offset },
    to: { x: segment.to.x + normal.x * offset, z: segment.to.z + normal.z * offset },
  }
}

const dashedSegments = (segment: Segment, width: number): Rail[] => {
  const length = distance(segment.from, segment.to)
  const dash = 0.31
  const gap = 0.17
  const dx = (segment.to.x - segment.from.x) / length
  const dz = (segment.to.z - segment.from.z) / length
  const rails: Rail[] = []
  for (let start = 0; start < length; start += dash + gap) {
    const end = Math.min(length, start + dash)
    rails.push({
      from: { x: segment.from.x + dx * start, z: segment.from.z + dz * start },
      to: { x: segment.from.x + dx * end, z: segment.from.z + dz * end },
      width,
    })
  }
  return rails
}

const zigzagSegments = (segment: Segment, width: number): Rail[] => {
  const length = distance(segment.from, segment.to)
  const teeth = Math.max(2, Math.round(length / 0.22))
  const dx = (segment.to.x - segment.from.x) / length
  const dz = (segment.to.z - segment.from.z) / length
  const normal = { x: -dz, z: dx }
  const points = Array.from({ length: teeth + 1 }, (_, index) => {
    if (index === 0) return segment.from
    if (index === teeth) return segment.to
    const along = length * index / teeth
    const offset = (index % 2 === 0 ? -1 : 1) * 0.058
    return {
      x: segment.from.x + dx * along + normal.x * offset,
      z: segment.from.z + dz * along + normal.z * offset,
    }
  })
  return segmentsOf(points).map((part) => ({ ...part, width }))
}

const doubleRailsFor = (path: ReadonlyArray<Point>): Rail[] =>
  [-doubleRailOffset, doubleRailOffset].flatMap((offset) => {
    const rails = segmentsOf(path).map((segment) => ({ ...offsetSegment(segment, offset), width: doubleRailWidth }))
    return rails.flatMap((rail, index) => index === rails.length - 1
      ? [rail]
      : [rail, { from: rail.to, to: rails[index + 1].from, width: doubleRailWidth }])
  })

const railsFor = (path: ReadonlyArray<Point>, pattern: RelationshipPattern): Rail[] => {
  if (pattern === "double") return doubleRailsFor(path)
  return segmentsOf(path).flatMap((segment) => {
    if (pattern === "dashed") return dashedSegments(segment, trackWidth)
    if (pattern === "zigzag") return zigzagSegments(segment, trackWidth - 0.018)
    return [{ ...segment, width: pattern === "bus" ? busWidth : trackWidth }]
  })
}

const cornersFor = (path: ReadonlyArray<Point>, pattern: RelationshipPattern) => {
  if (pattern === "dashed" || pattern === "zigzag" || pattern === "double") return []
  const corners = path.slice(1, -1)
  return corners.map((point) => ({ point, radius: pattern === "bus" ? busWidth / 2 : trackWidth / 2 }))
}

const segmentGeometry = (from: Point, to: Point, y: number, width: number, height: number) => {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  if (length < 0.001) return undefined
  const geometry = new THREE.BoxGeometry(length, height, width)
  geometry.rotateY(-Math.atan2(dz, dx))
  geometry.translate((from.x + to.x) / 2, y, (from.z + to.z) / 2)
  return geometry
}

const cornerGeometry = (point: Point, y: number, radius: number, height: number) => {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 8)
  geometry.translate(point.x, y, point.z)
  return geometry
}

const leadGeometries = (endpoint: Endpoint, y: number) => {
  const { pad, contact } = endpoint
  const stem = new THREE.CylinderGeometry(0.042, 0.055, Math.abs(contact.y - y), 8)
  stem.translate(pad.x, (contact.y + y) / 2, pad.z)
  const attachment = segmentGeometry(pad, contact, contact.y, 0.075, 0.04)!
  return [stem, attachment]
}

const merge = (geometries: THREE.BufferGeometry[]) => {
  if (geometries.length === 0) return undefined
  const merged = mergeGeometries(geometries)
  geometries.forEach((geometry) => geometry.dispose())
  return merged ?? undefined
}

const directionFrom = (from: Point, to: Point) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z)
  return { x: (to.x - from.x) / length, z: (to.z - from.z) / length }
}

const terminalFor = (path: ReadonlyArray<Point>) => {
  const segments = segmentsOf(path)
  let approach = segments[0]
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (distance(segment.from, segment.to) >= 0.9) {
      approach = segment
      break
    }
    if (distance(segment.from, segment.to) > distance(approach.from, approach.to)) approach = segment
  }
  const direction = directionFrom(approach.from, approach.to)
  const setback = Math.min(0.65, distance(approach.from, approach.to) / 2)
  return { center: { x: approach.to.x - direction.x * setback, z: approach.to.z - direction.z * setback }, direction }
}

const chevronGeometries = (center: Point, direction: Point, y: number, size = markerSize) => {
  const side = { x: -direction.z * size / 2, z: direction.x * size / 2 }
  const tip = { x: center.x + direction.x * size / 2, z: center.z + direction.z * size / 2 }
  const rear = { x: center.x - direction.x * size / 2, z: center.z - direction.z * size / 2 }
  return [
    segmentGeometry({ x: rear.x + side.x, z: rear.z + side.z }, tip, y, 0.074, markerHeight)!,
    segmentGeometry({ x: rear.x - side.x, z: rear.z - side.z }, tip, y, 0.074, markerHeight)!,
  ]
}

const terminalGeometries = (path: ReadonlyArray<Point>, marker: RelationshipMarker, y: number) => {
  const { center, direction } = terminalFor(path)
  const topY = y + traceHeight / 2 + markerHeight / 2 + 0.004
  if (marker === "diamond") {
    const geometry = new THREE.CylinderGeometry(markerSize / 2, markerSize / 2, markerHeight, 4)
    geometry.translate(center.x, topY, center.z)
    return [geometry]
  }
  if (marker === "circle") {
    const geometry = new THREE.TorusGeometry(markerSize / 2 - 0.035, 0.032, 7, 12)
    geometry.rotateX(Math.PI / 2)
    geometry.translate(center.x, topY, center.z)
    return [geometry]
  }
  if (marker === "cross") {
    const horizontal = new THREE.BoxGeometry(markerSize, markerHeight, 0.072)
    const vertical = new THREE.BoxGeometry(0.072, markerHeight, markerSize)
    horizontal.rotateY(Math.PI / 4)
    vertical.rotateY(Math.PI / 4)
    horizontal.translate(center.x, topY, center.z)
    vertical.translate(center.x, topY, center.z)
    return [horizontal, vertical]
  }
  if (marker === "square") {
    const geometry = new THREE.BoxGeometry(markerSize, markerHeight, markerSize)
    geometry.translate(center.x, topY, center.z)
    return [geometry]
  }
  if (marker === "arrow") return chevronGeometries(center, direction, topY)
  if (marker === "double-arrow") {
    const front = { x: center.x + direction.x * 0.23, z: center.z + direction.z * 0.23 }
    const rear = { x: center.x - direction.x * 0.23, z: center.z - direction.z * 0.23 }
    return [...chevronGeometries(front, direction, topY, 0.34), ...chevronGeometries(rear, direction, topY, 0.34)]
  }
  return []
}


const changeMarkGeometry = (endpoint: Endpoint, y: number) => {
  const geometry = new THREE.TorusGeometry(0.14, 0.022, 6, 12)
  geometry.rotateX(Math.PI / 2)
  geometry.translate(endpoint.exit.x, y + traceHeight / 2 + 0.018, endpoint.exit.z)
  return geometry
}

const routingClearanceFor = (pattern: RelationshipPattern) => pattern === "bus" ? 0.36 : clearanceWidth

export const createCircuitTraces = (options: CircuitTraceOptions) => {
  const group = new THREE.Group()
  group.name = "Circuit traces"
  const components = new Map(options.components.map((component) => [component.id, component]))
  const obstacles = options.components.map((component) => ({
    ...component,
    left: component.x - component.width / 2 - routeClearance,
    right: component.x + component.width / 2 + routeClearance,
    top: component.z - component.depth / 2 - routeClearance,
    bottom: component.z + component.depth / 2 + routeClearance,
  }))
  const halfWidth = options.boardWidth / 2 - boardMargin
  const halfDepth = options.boardDepth / 2 - boardMargin
  const xLanes = [...new Set([
    -halfWidth,
    halfWidth,
    ...obstacles.flatMap((obstacle) => [obstacle.left - 0.12, obstacle.right + 0.12]),
  ])].filter((lane) => lane >= -halfWidth && lane <= halfWidth)
  const zLanes = [...new Set([
    -halfDepth,
    halfDepth,
    ...obstacles.flatMap((obstacle) => [obstacle.top - 0.12, obstacle.bottom + 0.12]),
  ])].filter((lane) => lane >= -halfDepth && lane <= halfDepth)
  const endpointTotals = new Map<string, number>()
  options.connections.forEach((connection) => {
    endpointTotals.set(connection.from, (endpointTotals.get(connection.from) ?? 0) + 1)
    endpointTotals.set(connection.to, (endpointTotals.get(connection.to) ?? 0) + 1)
  })
  const endpointSeen = new Map<string, number>()
  const endpointOrders = new Map<string, readonly [number, number]>()
  options.connections.forEach((connection) => {
    const fromOrder = endpointSeen.get(connection.from) ?? 0
    endpointSeen.set(connection.from, fromOrder + 1)
    const toOrder = endpointSeen.get(connection.to) ?? 0
    endpointSeen.set(connection.to, toOrder + 1)
    endpointOrders.set(connection.id, [fromOrder, toOrder])
  })

  const clearanceMaterial = createBoardMaterial({ color: maskMaterialColor, surface: "substrate" })
  const changeGeometries = new Map<string, THREE.BufferGeometry[]>()
  const traces: TraceVisual[] = []
  const placedPaths: Array<{ readonly points: ReadonlyArray<Point>; readonly layer: number; readonly clearance: number }> = []

  options.connections.forEach((connection) => {
    const from = components.get(connection.from)
    const to = components.get(connection.to)
    if (!from || !to) return
    const [fromOrder, toOrder] = endpointOrders.get(connection.id) ?? [0, 0]
    const fromTotal = endpointTotals.get(from.id) ?? 1
    const toTotal = endpointTotals.get(to.id) ?? 1
    let route: Point[] | undefined
    let fromEndpoint: Endpoint | undefined
    let toEndpoint: Endpoint | undefined

    const fromSides: ReadonlyArray<Side> = from.id === to.id ? ["right"] : sidesToward(from, to)
    const toSides: ReadonlyArray<Side> = from.id === to.id ? ["bottom"] : sidesToward(to, from)
    let shortest = Infinity
    for (const candidates of [routeCandidates, detourCandidates]) {
      for (const fromSide of fromSides) for (const toSide of toSides) {
        const source = endpointFor(from, fromSide, fromOrder, fromTotal)
        const target = endpointFor(to, toSide, toOrder, toTotal)
        for (const candidate of candidates(source.exit, target.exit, xLanes, zLanes)) {
          const length = candidate.reduce((total, point, index) => index === 0 ? total : total + distance(candidate[index - 1], point), 0)
          if (length >= shortest || !routeIsClear(candidate, obstacles)) continue
          shortest = length
          route = candidate
          fromEndpoint = source
          toEndpoint = target
        }
      }
      if (route) break
    }
    if (!route || !fromEndpoint || !toEndpoint) return

    const path = simplify([fromEndpoint.pad, ...route, toEndpoint.pad])
    const style = relationshipStyles[connection.kind]
    const routingClearance = routingClearanceFor(style.pattern)
    const occupiedLayers = new Set(placedPaths.filter((placed) => pathsConflict(path, placed.points, Math.max(routingClearance, placed.clearance))).map((placed) => placed.layer))
    let layer = 0
    while (occupiedLayers.has(layer)) layer += 1
    placedPaths.push({ points: path, layer, clearance: routingClearance })
    const y = traceY + layer * layerStep
    const material = createBoardMaterial({
      color: style.color,
      surface: "trace",
      accent: style.color,
      emissive: style.color,
      emissiveIntensity: 0.08,
    })
    const trace = new THREE.Group()
    trace.name = `Circuit trace ${connection.id}`
    trace.userData.connectionId = connection.id
    trace.userData.scopeConnection = connection
    const maskGeometries: THREE.BufferGeometry[] = []
    const copperGeometries: THREE.BufferGeometry[] = []
    railsFor(path, style.pattern).forEach((rail) => {
      const mask = segmentGeometry(rail.from, rail.to, y - 0.012, rail.width + 0.1, 0.014)
      const copper = segmentGeometry(rail.from, rail.to, y, rail.width, traceHeight)
      if (mask) maskGeometries.push(mask)
      if (copper) copperGeometries.push(copper)
    })
    cornersFor(path, style.pattern).forEach(({ point, radius }) => {
      maskGeometries.push(cornerGeometry(point, y - 0.012, radius + 0.05, 0.014))
      copperGeometries.push(cornerGeometry(point, y, radius, traceHeight))
    })
    path.forEach((point, index) => {
      const endpoint = index === 0 || index === path.length - 1
      if (!endpoint) return
      maskGeometries.push(cornerGeometry(point, y - 0.012, padRadius + 0.04, 0.014))
      copperGeometries.push(cornerGeometry(point, y, padRadius, 0.026))
    })
    copperGeometries.push(...leadGeometries(fromEndpoint, y), ...leadGeometries(toEndpoint, y))
    copperGeometries.push(...terminalGeometries(path, style.marker, y))
    const maskGeometry = merge(maskGeometries)
    const copperGeometry = merge(copperGeometries)
    if (maskGeometry) {
      const mask = new THREE.Mesh(maskGeometry, clearanceMaterial)
      mask.receiveShadow = true
      trace.add(mask)
    }
    if (copperGeometry) {
      const copper = new THREE.Mesh(copperGeometry, material)
      copper.castShadow = true
      copper.receiveShadow = true
      trace.add(copper)
    }
    group.add(trace)
    traces.push({ connection, material })
    if (options.comparison && connection.change !== "unchanged") {
      const markColor = changeColors[connection.change]
      const marks = changeGeometries.get(markColor) ?? []
      marks.push(changeMarkGeometry(fromEndpoint, y))
      changeGeometries.set(markColor, marks)
    }
  })

  changeGeometries.forEach((geometries, color) => {
    const geometry = merge(geometries)
    if (!geometry) return
    const material = createBoardMaterial({
      color,
      surface: "status",
      accent: "#fff4d6",
      emissive: color,
      emissiveIntensity: 0.16,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  })

  const select = (id: string) => {
    traces.forEach((trace) => {
      const incident = !id || trace.connection.from === id || trace.connection.to === id
      trace.material.emissiveIntensity = incident && id ? 0.34 : 0.08
    })
  }

  return { group, select }
}
