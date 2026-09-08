import * as THREE from "three"
import type { ScopeConnection, ScopeGraph, ScopeNode } from "../scope-types"
import type { SpatialWorld } from "./spatial-world"

type NodeRig = {
  readonly node: ScopeNode
  readonly object: THREE.Group
  readonly label: THREE.Vector3
  readonly port: THREE.Vector3
  readonly selection: THREE.Mesh
  readonly materials: THREE.MeshStandardMaterial[]
  readonly home: THREE.Vector3
  readonly orbit: number
  readonly angle: number
  readonly system: number
}

type ScopeSystem = {
  readonly index: number
  readonly name: string
  readonly members: ScopeNode[]
  readonly center: THREE.Vector3
  readonly fixture: THREE.Group
  readonly rings: THREE.Group
  readonly caption: { text: string; position: THREE.Vector3 }
}

const midnight = 0x081522
const palette = {
  petrol: 0x1f8b8d,
  celadon: 0xa7d5bd,
  ivory: 0xf4ead3,
  copper: 0xc8794a,
  brass: 0xbf9450,
  shadow: 0x102b3b,
  crystal: 0x76b9c0,
}

const normal = (color: number, roughness = 0.38, metalness = 0.38) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness })

const brass = () => normal(palette.brass, 0.24, 0.82)

function pickable(mesh: THREE.Mesh, node: ScopeNode): THREE.Mesh {
  mesh.userData.nodeId = node.id
  return mesh
}

function ring(radius: number, tube: number, material: THREE.Material, rotation: [number, number, number] = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 96), material)
  mesh.rotation.set(...rotation)
  return mesh
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const length = a.distanceTo(b)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return mesh
}

function engravedOrbit(radius: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group()
  const rail = ring(radius, 0.026, material)
  rail.scale.set(1.28, 0.72, 1)
  group.add(rail)
  const inner = ring(radius - 0.11, 0.009, material)
  inner.scale.set(1.28, 0.72, 1)
  group.add(inner)
  for (let mark = 0; mark < 12; mark += 1) {
    const theta = (mark / 12) * Math.PI * 2
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.22, 0.05), material)
    tick.position.set(Math.cos(theta) * radius * 1.28, Math.sin(theta) * radius * 0.72, 0)
    tick.rotation.z = theta + Math.PI / 2
    group.add(tick)
  }
  return group
}

function buildSchema(node: ScopeNode, fields: number, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const group = new THREE.Group()
  const shell = normal(palette.petrol, 0.28, 0.56)
  const core = pickable(new THREE.Mesh(new THREE.SphereGeometry(1.04, 28, 20), shell), node)
  group.add(core)
  materials.push(shell)
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.88, 24, 16), normal(palette.shadow, 0.52, 0.25))
  group.add(inner)
  for (let field = 0; field < Math.max(1, fields); field += 1) {
    const y = (field - (Math.max(1, fields) - 1) / 2) * 0.19
    const band = ring(1.075 + (field % 2) * 0.025, 0.045, normal(field % 2 ? palette.celadon : palette.ivory, 0.3, 0.5), [Math.PI / 2, 0, 0])
    band.position.y = y
    band.scale.x = 1 - Math.min(field, 4) * 0.04
    group.add(band)
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.18, 24), normal(palette.copper, 0.26, 0.72))
  cap.position.y = 1.01
  group.add(cap)
  return group
}

function buildFunction(node: ScopeNode, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const group = new THREE.Group()
  const coreMaterial = normal(palette.ivory, 0.25, 0.66)
  const core = pickable(new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 16), coreMaterial), node)
  group.add(core)
  materials.push(coreMaterial)
  const axial = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.6, 16), brass())
  axial.rotation.z = Math.PI / 2
  group.add(axial)
  const panelMaterial = normal(palette.petrol, 0.31, 0.68)
  for (const direction of [-1, 1]) {
    const armStart = new THREE.Vector3(direction * 0.48, 0, 0)
    const armEnd = new THREE.Vector3(direction * 1.08, 0.12, 0)
    group.add(cylinderBetween(armStart, armEnd, 0.06, brass()))
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.38, 0.055), panelMaterial)
    panel.position.set(direction * 1.42, 0.17, 0)
    panel.rotation.y = direction * 0.18
    group.add(panel)
    for (const row of [-0.1, 0.1]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.31, 0.065), normal(palette.celadon, 0.3, 0.4))
      seam.position.set(direction * 1.42 + row, 0.17, 0.035)
      group.add(seam)
    }
  }
  group.add(ring(0.68, 0.035, brass(), [Math.PI / 2, 0, 0]))
  return group
}

function buildService(node: ScopeNode, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const group = new THREE.Group()
  const coreMaterial = normal(palette.celadon, 0.3, 0.48)
  const core = pickable(new THREE.Mesh(new THREE.SphereGeometry(0.82, 28, 18), coreMaterial), node)
  group.add(core)
  materials.push(coreMaterial)
  const belt = ring(1.2, 0.07, normal(palette.copper, 0.24, 0.75), [0.36, 0.08, 0.2])
  belt.scale.set(1.36, 0.55, 1)
  group.add(belt)
  const girdle = ring(0.86, 0.032, normal(palette.ivory, 0.3, 0.5), [Math.PI / 2, 0, 0])
  group.add(girdle)
  for (let n = 0; n < 4; n += 1) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.38, 10), brass())
    nozzle.position.set(Math.cos(n * Math.PI / 2) * 0.74, 0, Math.sin(n * Math.PI / 2) * 0.74)
    nozzle.lookAt(0, 0, 0)
    group.add(nozzle)
  }
  return group
}

function buildError(node: ScopeNode, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const group = new THREE.Group()
  const crystalMaterial = normal(palette.crystal, 0.18, 0.3)
  const crystal = pickable(new THREE.Mesh(new THREE.DodecahedronGeometry(0.94, 1), crystalMaterial), node)
  group.add(crystal)
  materials.push(crystalMaterial)
  const shardMaterial = normal(palette.copper, 0.24, 0.68)
  for (let n = 0; n < 5; n += 1) {
    const theta = (n / 5) * Math.PI * 2
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.63, 5), shardMaterial)
    shard.position.set(Math.cos(theta) * 0.8, (n % 2 ? 0.15 : -0.18), Math.sin(theta) * 0.8)
    shard.lookAt(0, 0, 0)
    group.add(shard)
  }
  group.add(ring(0.74, 0.022, normal(palette.ivory, 0.3, 0.42), [0.45, 0.2, 0]))
  return group
}

function buildInterface(node: ScopeNode, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const group = new THREE.Group()
  const apertureMaterial = normal(palette.ivory, 0.21, 0.72)
  const aperture = pickable(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.18, 14, 36), apertureMaterial), node)
  aperture.rotation.x = Math.PI / 2
  group.add(aperture)
  materials.push(apertureMaterial)
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.24, 30, 1, true), normal(palette.petrol, 0.32, 0.58))
  throat.rotation.x = Math.PI / 2
  group.add(throat)
  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), normal(palette.shadow, 0.4, 0.35))
  iris.position.z = 0.13
  group.add(iris)
  for (let n = 0; n < 6; n += 1) {
    const theta = (n / 6) * Math.PI * 2
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.07), brass())
    vane.position.set(Math.cos(theta) * 0.5, Math.sin(theta) * 0.5, 0.16)
    vane.rotation.z = theta + 0.5
    group.add(vane)
  }
  return group
}

function buildType(node: ScopeNode, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const group = new THREE.Group()
  const bodyMaterial = normal(palette.copper, 0.25, 0.64)
  const body = pickable(new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 2), bodyMaterial), node)
  group.add(body)
  materials.push(bodyMaterial)
  const collar = ring(0.8, 0.045, normal(palette.petrol, 0.32, 0.56), [0.72, 0.35, 0])
  group.add(collar)
  for (let n = 0; n < 3; n += 1) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.56, 4), brass())
    fin.position.set(Math.cos(n * Math.PI * 2 / 3) * 0.75, 0.06, Math.sin(n * Math.PI * 2 / 3) * 0.75)
    fin.rotation.x = Math.PI / 2
    group.add(fin)
  }
  return group
}

function buildBody(node: ScopeNode, materials: THREE.MeshStandardMaterial[]): THREE.Group {
  const fields = node.proposed?.schema?.fields.length ?? node.current?.schema?.fields.length ?? 0
  switch (node.category) {
    case "Schema": return buildSchema(node, fields, materials)
    case "EffectfulFunction": return buildFunction(node, materials)
    case "Service": return buildService(node, materials)
    case "Error": return buildError(node, materials)
    case "Interface": return buildInterface(node, materials)
    default: return buildType(node, materials)
  }
}

function fixture(system: ScopeSystem): void {
  const brassMaterial = brass()
  const darkBrass = normal(0x72562e, 0.3, 0.78)
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.04, 0.32, 32), brassMaterial)
  pedestal.position.copy(system.center)
  pedestal.position.y -= 0.42
  system.fixture.add(pedestal)
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.39, 20, 14), normal(palette.copper, 0.2, 0.75))
  globe.position.copy(system.center)
  system.fixture.add(globe)
  const meridian = ring(0.62, 0.042, darkBrass, [Math.PI / 2, 0.22, 0])
  meridian.position.copy(system.center)
  system.fixture.add(meridian)
  const axisA = new THREE.Vector3(-0.95, -0.2, -0.5).add(system.center)
  const axisB = new THREE.Vector3(0.95, 0.2, 0.5).add(system.center)
  system.fixture.add(cylinderBetween(axisA, axisB, 0.04, brassMaterial))
}

export function buildOrbits(graph: ScopeGraph): SpatialWorld {
  const root = new THREE.Group()
  root.name = "binary-orbital-apparatus"
  const scopeNames = [...new Set(graph.nodes.map((node) => node.scope))].sort()
  const names = scopeNames.length > 1 ? [scopeNames[0], scopeNames.slice(1).join(" / ")] : [scopeNames[0] ?? "module", "module orbit"]
  const members = [
    graph.nodes.filter((node) => node.scope === names[0]),
    graph.nodes.filter((node) => node.scope !== names[0]),
  ]
  if (members[1].length === 0 && members[0].length > 1) members[1].push(...members[0].splice(Math.ceil(members[0].length / 2)))
  const centers = [new THREE.Vector3(-6.7, 0.5, 0.25), new THREE.Vector3(6.9, 2.15, -0.55)]
  const systems: ScopeSystem[] = members.map((group, index) => {
    const caption = { text: names[index], position: new THREE.Vector3() }
    const system: ScopeSystem = { index, name: names[index], members: group, center: centers[index], fixture: new THREE.Group(), rings: new THREE.Group(), caption }
    fixture(system)
    const railMaterial = normal(index ? palette.celadon : palette.copper, 0.28, 0.7)
    for (let rail = 0; rail < Math.max(1, group.length); rail += 1) system.rings.add(engravedOrbit(3.0 + rail * 0.94, railMaterial))
    root.add(system.fixture, system.rings)
    return system
  })
  const nodes = new Map<string, { object: THREE.Group; label: THREE.Vector3; port: THREE.Vector3 }>()
  const rigs: NodeRig[] = []
  for (const system of systems) {
    system.members.forEach((node, index) => {
      const materials: THREE.MeshStandardMaterial[] = []
      const object = buildBody(node, materials)
      object.name = `contract-body:${node.id}`
      const selectionMaterial = new THREE.MeshStandardMaterial({ color: palette.ivory, emissive: palette.copper, emissiveIntensity: 0, metalness: 0.8, roughness: 0.24, transparent: true, opacity: 0 })
      const selection = ring(1.4, 0.022, selectionMaterial, [0.42, 0.16, 0])
      object.add(selection)
      root.add(object)
      const orbit = 3.0 + index * 0.94
      const angle = index * 2.399 + system.index * 0.78
      const rig: NodeRig = { node, object, label: new THREE.Vector3(), port: new THREE.Vector3(), selection, materials, home: new THREE.Vector3(), orbit, angle, system: system.index }
      rigs.push(rig)
      nodes.set(node.id, { object, label: rig.label, port: rig.port })
    })
  }
  const captions = systems.map((system) => system.caption)

  const setSpread = (value: number) => {
    const spread = THREE.MathUtils.clamp(value, 0, 1)
    for (const system of systems) {
      const inclination = (system.index ? -0.32 : 0.38) + (system.index ? -0.25 : 0.22) * spread
      system.rings.position.copy(system.center)
      system.rings.rotation.set(inclination, system.index ? 0.34 : -0.22, system.index ? 0.16 : -0.12)
      system.rings.scale.setScalar(0.68 + spread * 0.48)
      system.caption.position.set(0, 1.55, -1.2).applyEuler(system.rings.rotation).add(system.center)
    }
    for (const rig of rigs) {
      const system = systems[rig.system]
      const radial = rig.orbit * (0.68 + spread * 0.48)
      rig.home.set(Math.cos(rig.angle) * radial * 1.28, Math.sin(rig.angle) * radial * 0.72, 0).applyEuler(system.rings.rotation).add(system.center)
      rig.object.position.copy(rig.home)
      rig.object.rotation.set(0.12 * Math.sin(rig.angle), rig.angle + 0.4, -0.1 * Math.cos(rig.angle))
      rig.label.copy(rig.home).add(new THREE.Vector3(0, 1.28, 0.2))
      rig.port.copy(rig.home).add(new THREE.Vector3(0, 0.12, 0.88))
    }
  }

  const setSelected = (id: string) => {
    for (const rig of rigs) {
      const selected = rig.node.id === id
      const selectionMaterial = rig.selection.material as THREE.MeshStandardMaterial
      selectionMaterial.opacity = selected ? 0.95 : 0
      selectionMaterial.emissiveIntensity = selected ? 1.8 : 0
      for (const material of rig.materials) {
        material.emissive.setHex(selected ? palette.copper : 0x000000)
        material.emissiveIntensity = selected ? 0.22 : 0
      }
      rig.selection.scale.setScalar(selected ? 1.12 : 1)
    }
  }

  setSpread(0.65)
  setSelected("")
  return {
    root,
    nodes,
    captions,
    background: midnight,
    dark: true,
    cameraDirection: new THREE.Vector3(.35, .28, 1.5),
    spreadLabel: "Orbital separation",
    explanation: "Bodies are contracts; orbital systems group modules. Distance and size do not encode gravity, importance, or execution order.",
    setSpread,
    setSelected,
    route(connection: ScopeConnection, index: number) {
      const from = nodes.get(connection.from)?.port ?? new THREE.Vector3()
      const to = nodes.get(connection.to)?.port ?? new THREE.Vector3()
      const chord = to.clone().sub(from)
      const midpoint = from.clone().add(to).multiplyScalar(0.5)
      const lift = 2.1 + (index % 4) * 0.35 + Math.min(1.6, chord.length() * 0.08)
      const lateral = new THREE.Vector3(-chord.z, 0, chord.x).normalize().multiplyScalar((index % 2 ? 1 : -1) * 0.55)
      const control = midpoint.add(lateral).add(new THREE.Vector3(0, lift, 0))
      return new THREE.QuadraticBezierCurve3(from.clone(), control, to.clone())
    },
  }
}
