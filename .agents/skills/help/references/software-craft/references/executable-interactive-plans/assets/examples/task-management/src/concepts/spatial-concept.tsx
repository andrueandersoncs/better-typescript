import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { relationshipStyles } from "../board-semantics"
import { categoryLabel, ChangeBadge, relationships, type ConceptProps } from "./shared"
import type { WorldBuilder } from "./spatial-world"
import "./spatial-concept.css"

const dispose = (root: THREE.Object3D) => {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.geometry) geometries.add(mesh.geometry)
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material)
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

type Runtime = { refresh(): void; spread(value: number): void; reset(): void; focus(): void }

export function SpatialConcept({ graph, revision, selectedId, onSelect, onInspect, build }: ConceptProps & { build: WorldBuilder }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef(new Map<string, HTMLButtonElement>())
  const captionRefs = useRef(new Map<string, HTMLSpanElement>())
  const captionLeaderRefs = useRef(new Map<string, SVGLineElement>())
  const runtime = useRef<Runtime | null>(null)
  const latest = useRef({ selectedId, onSelect, focusedId: "", allLinks: false })
  const [focusedId, setFocusedId] = useState("")
  const [allLinks, setAllLinks] = useState(false)
  const [spread, setSpread] = useState(.65)
  const spreadRef = useRef(spread)
  const [scene, setScene] = useState({ status: "loading", dark: false, spreadLabel: "Separate parts", explanation: "" })
  latest.current = { selectedId, onSelect, focusedId, allLinks }
  spreadRef.current = spread
  const selected = graph.nodes.find((node) => node.id === selectedId)!
  const version = revision === "comparison" ? selected.proposed ?? selected.current : selected[revision]
  const incoming = graph.connections.filter((edge) => edge.to === selectedId)
  const outgoing = graph.connections.filter((edge) => edge.from === selectedId)
  const scopes = [...new Set(graph.nodes.map((node) => node.scope))]

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }) }
    catch { setScene((value) => ({ ...value, status: "unavailable" })); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute("aria-hidden", "true")
    stage.prepend(renderer.domElement)
    const world = build(graph)
    world.nodes.forEach((node, id) => node.object.traverse((object) => { if (object instanceof THREE.Mesh) object.userData.nodeId = id }))
    const scene3d = new THREE.Scene()
    scene3d.background = new THREE.Color(world.background)
    scene3d.add(world.root)
    const generator = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = generator.fromScene(room, .04)
    dispose(room)
    generator.dispose()
    scene3d.environment = environment.texture
    scene3d.environmentIntensity = world.dark ? .65 : .85
    world.setSpread(1)
    world.root.updateMatrixWorld(true)
    const fitPoints: THREE.Vector3[] = []
    const bounds = new THREE.Box3()
    world.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.computeBoundingBox()
      const box = object.geometry.boundingBox!
      for (let corner = 0; corner < 8; corner++) {
        const point = new THREE.Vector3(corner & 1 ? box.max.x : box.min.x, corner & 2 ? box.max.y : box.min.y, corner & 4 ? box.max.z : box.min.z).applyMatrix4(object.matrixWorld)
        fitPoints.push(point)
        bounds.expandByPoint(point)
      }
    })
    world.setSpread(spreadRef.current)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const span = Math.max(size.x, size.y, size.z)
    const camera = new THREE.PerspectiveCamera(38, 1, .1, span * 30)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    controls.minPolarAngle = .08
    controls.maxPolarAngle = Math.PI * .9
    controls.listenToKeyEvents(stage)
    const hemisphere = new THREE.HemisphereLight(0xe9f2ff, world.dark ? 0x142e45 : 0x766b53, 1.2)
    scene3d.add(hemisphere)
    const key = new THREE.DirectionalLight(0xffeedb, 3.1)
    key.position.copy(center).add(new THREE.Vector3(-span * .5, span, span * .8))
    key.target.position.copy(center)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: .1, far: span * 4 })
    key.shadow.normalBias = .025
    scene3d.add(key, key.target)
    const rim = new THREE.DirectionalLight(world.dark ? 0x73bde2 : 0xffffff, 2.2)
    rim.position.copy(center).add(new THREE.Vector3(span, span * .4, -span))
    rim.target.position.copy(center)
    scene3d.add(rim, rim.target)
    const links = new THREE.Group()
    scene3d.add(links)
    const linkVisuals = new Map<string, THREE.Group>()
    const direction = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const rebuildLinks = () => {
      dispose(links)
      links.clear()
      linkVisuals.clear()
      graph.connections.forEach((edge, index) => {
        const curve = world.route(edge, index)
        const color = world.dark ? relationshipStyles[edge.kind].color : relationships[edge.kind].color
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthTest: true })
        const group = new THREE.Group()
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, span * .00135, 6, false), material))
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(span * .008, span * .025, 8), material)
        arrow.position.copy(curve.getPoint(.79))
        direction.copy(curve.getTangent(.79)).normalize()
        arrow.quaternion.setFromUnitVectors(up, direction)
        group.add(arrow)
        links.add(group)
        linkVisuals.set(edge.id, group)
      })
    }
    rebuildLinks()
    const projected = new THREE.Vector3()
    const scratch = new THREE.Vector3()
    let width = 0
    let height = 0
    let disposed = false
    const labelBoxes = graph.nodes.map((node) => ({ id: node.id, x: 0, y: 0, width: Math.min(170, node.label.length * 7 + 18), shown: false, priority: 0 }))
    const captionBoxes = world.captions.map((caption) => ({ ...caption, x: 0, y: 0, width: caption.text.length * 7 + 16, shown: false }))
    const collisionBoxes = [...labelBoxes, ...captionBoxes]
    const captionOffsets = [0, -28, 28, -56, 56, -84, 84]
    const neighbors = new Set<string>()
    const updateLabels = () => {
      for (const box of labelBoxes) box.shown = false
      for (const box of labelBoxes) {
        const visual = world.nodes.get(box.id)
        const label = labelRefs.current.get(box.id)
        if (!visual || !label) continue
        projected.copy(visual.label).project(camera)
        box.x = (projected.x * .5 + .5) * width
        box.y = (-projected.y * .5 + .5) * height
        const collision = labelBoxes.some((other) => other.shown && Math.abs(other.x - box.x) < (other.width + box.width) / 2 + 3 && Math.abs(other.y - box.y) < 25)
        box.shown = projected.z > -1 && projected.z < 1 && box.x > box.width / 2 && box.x < width - box.width / 2 && box.y > 18 && box.y < height - 35 && !collision
        label.hidden = !box.shown
        label.style.transform = `translate(${box.x}px, ${box.y}px) translate(-50%, -50%)`
        label.style.zIndex = String(box.priority + 2)
      }
      for (const caption of captionBoxes) caption.shown = false
      for (const caption of captionBoxes) {
        const label = captionRefs.current.get(caption.text)
        const leader = captionLeaderRefs.current.get(caption.text)
        if (!label || !leader) continue
        projected.copy(caption.position).project(camera)
        caption.x = (projected.x * .5 + .5) * width
        const anchorY = (-projected.y * .5 + .5) * height
        for (const offset of captionOffsets) {
          caption.y = anchorY + offset
          const collides = collisionBoxes.some((other) => other.shown && Math.abs(other.x - caption.x) < (other.width + caption.width) / 2 + 4 && Math.abs(other.y - caption.y) < 25)
          if (projected.z > -1 && projected.z < 1 && caption.x > caption.width / 2 && caption.x < width - caption.width / 2 && caption.y > 20 && caption.y < height - 20 && !collides) { caption.shown = true; break }
        }
        label.hidden = !caption.shown
        label.style.transform = `translate(${caption.x}px, ${caption.y}px) translate(-50%, -50%)`
        leader.style.display = caption.shown && caption.y !== anchorY ? "" : "none"
        leader.setAttribute("x1", String(caption.x))
        leader.setAttribute("x2", String(caption.x))
        leader.setAttribute("y1", String(anchorY))
        leader.setAttribute("y2", String(caption.y))
      }
    }
    const draw = () => { if (!disposed) { renderer.render(scene3d, camera); updateLabels() } }
    const refresh = () => {
      const state = latest.current
      world.setSelected(state.selectedId)
      neighbors.clear()
      neighbors.add(state.selectedId)
      graph.connections.forEach((edge) => { if (edge.from === state.selectedId || edge.to === state.selectedId) { neighbors.add(edge.from); neighbors.add(edge.to) } })
      for (const box of labelBoxes) box.priority = box.id === state.selectedId ? 2 : neighbors.has(box.id) ? 1 : 0
      labelBoxes.sort((a, b) => b.priority - a.priority)
      const focus = graph.connections.find((edge) => edge.id === state.focusedId && (edge.from === state.selectedId || edge.to === state.selectedId))
      graph.connections.forEach((edge) => {
        const group = linkVisuals.get(edge.id)!
        const incident = edge.from === state.selectedId || edge.to === state.selectedId
        group.visible = focus ? edge.id === focus.id : incident || state.allLinks
        const material = (group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = incident ? 1 : .17
      })
      draw()
    }
    const reset = () => {
      const view = world.cameraDirection.clone().normalize()
      camera.position.copy(center).add(view)
      camera.lookAt(center)
      camera.updateMatrixWorld(true)
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      let distance = 1
      for (const point of fitPoints) {
        scratch.copy(point).applyMatrix4(camera.matrixWorldInverse)
        distance = Math.max(distance, scratch.z + 1 + Math.abs(scratch.x) * 1.08 / (tan * camera.aspect), scratch.z + 1 + Math.abs(scratch.y) * 1.12 / tan)
      }
      controls.target.copy(center)
      camera.position.copy(center).addScaledVector(view, distance)
      controls.minDistance = span * .12
      controls.maxDistance = distance * 3
      controls.update()
      draw()
    }
    const focus = () => {
      const node = world.nodes.get(latest.current.selectedId)
      if (!node) return
      direction.copy(camera.position).sub(controls.target).normalize()
      controls.target.copy(node.port)
      const nodeSize = new THREE.Box3().setFromObject(node.object).getSize(scratch).length()
      camera.position.copy(node.port).addScaledVector(direction, Math.max(nodeSize * 2.5, span * .2))
      controls.update()
      draw()
    }
    const resize = new ResizeObserver(() => {
      width = stage.clientWidth
      height = stage.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      reset()
      refresh()
    })
    resize.observe(stage)
    controls.addEventListener("change", draw)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downX = 0
    let downY = 0
    const onDown = (event: PointerEvent) => { downX = event.clientX; downY = event.clientY }
    const onUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(world.root, true).find(({ object }) => {
        if (!(object instanceof THREE.Mesh) || !object.userData.nodeId) return false
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        return materials.some((material) => material.visible && (!material.transparent || material.opacity > 0))
      })
      if (hit) latest.current.onSelect(hit.object.userData.nodeId)
    }
    renderer.domElement.addEventListener("pointerdown", onDown)
    renderer.domElement.addEventListener("pointerup", onUp)
    runtime.current = { refresh, reset, focus, spread(value) { world.setSpread(value); rebuildLinks(); refresh() } }
    refresh()
    setScene({ status: "ready", dark: world.dark, spreadLabel: world.spreadLabel, explanation: world.explanation })
    return () => {
      disposed = true
      runtime.current = null
      resize.disconnect()
      controls.removeEventListener("change", draw)
      controls.dispose()
      renderer.domElement.removeEventListener("pointerdown", onDown)
      renderer.domElement.removeEventListener("pointerup", onUp)
      dispose(world.root)
      dispose(links)
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [build, graph])

  useEffect(() => { runtime.current?.refresh() }, [selectedId, focusedId, allLinks])
  useEffect(() => { runtime.current?.spread(spread) }, [spread])
  const revealStage = () => { if (window.matchMedia("(max-width: 1000px)").matches) stageRef.current?.scrollIntoView({ block: "start", behavior: "instant" }) }

  const renderReferences = (edges: typeof incoming, direction: "incoming" | "outgoing") => <section className="spatial-references">
    <h4>{direction === "incoming" ? "Referenced by" : "References"} <span>{edges.length}</span></h4>
    {edges.length === 0 ? <p>None in this revision.</p> : <ul>{edges.map((edge) => {
      const neighbor = graph.nodes.find((node) => node.id === (direction === "incoming" ? edge.from : edge.to))!
      return <li key={edge.id}>
        <div><button onClick={() => { setFocusedId(""); onSelect(neighbor.id); revealStage() }}>{neighbor.label}</button><small>{relationships[edge.kind].label} · {edge.label}</small></div>
        <button className="spatial-link-toggle" aria-label={`Isolate ${edge.label}: ${direction === "incoming" ? neighbor.label : selected.label} to ${direction === "incoming" ? selected.label : neighbor.label}`} aria-pressed={focusedId === edge.id} onClick={() => { setFocusedId(focusedId === edge.id ? "" : edge.id); revealStage() }}>Show</button>
      </li>
    })}</ul>}
  </section>

  return <div className="spatial-concept" data-renderer={scene.status} data-dark={scene.dark}>
    <div className="spatial-viewport">
      <div className="spatial-camera-controls"><button onClick={() => runtime.current?.reset()}>Reset view</button><button onClick={() => runtime.current?.focus()}>Focus selection</button><button aria-pressed={allLinks} onClick={() => { setFocusedId(""); setAllLinks(!allLinks) }}>All links</button></div>
      <div className="spatial-stage" ref={stageRef} tabIndex={0} aria-label="Interactive 3D contracts. Drag to orbit, scroll to zoom, arrow keys to pan. Select contracts by their labels or the selected contract menu.">
        <svg className="spatial-caption-leaders" aria-hidden="true">{scopes.map((scope) => <line key={scope} ref={(element) => { if (element) captionLeaderRefs.current.set(scope, element); else captionLeaderRefs.current.delete(scope) }} />)}</svg>
        <div className="spatial-labels">{graph.nodes.map((node) => <button key={node.id} ref={(element) => { if (element) labelRefs.current.set(node.id, element); else labelRefs.current.delete(node.id) }} aria-label={`Select ${node.label}`} aria-pressed={selectedId === node.id} className="spatial-node-label" onClick={() => { setFocusedId(""); onSelect(node.id) }}>{node.label}</button>)}{scopes.map((scope) => <span key={scope} className="spatial-scope-label" ref={(element) => { if (element) captionRefs.current.set(scope, element); else captionRefs.current.delete(scope) }}>{scope}</span>)}</div>
        {scene.status !== "ready" && <p className="spatial-loading" role="status">{scene.status === "unavailable" ? "WebGL is unavailable in this browser. Use a WebGL-enabled browser to explore these 3D metaphors." : "Constructing the 3D world…"}</p>}
      </div>
      <div className="spatial-manipulation"><label>{scene.spreadLabel}<input type="range" min="0" max="1" step=".01" value={spread} onChange={(event) => setSpread(Number(event.target.value))} /><output>{Math.round(spread * 100)}%</output></label><span>Drag to orbit · Scroll to zoom · Click a part</span></div>
      <p className="spatial-mapping">{scene.explanation} Arrows show references, not execution.</p>
    </div>
    <aside className="spatial-inspector" aria-label="Selected 3D contract">
      <h3>{selected.label}</h3><p className="spatial-contract-meta">{categoryLabel(selected)} · {selected.scope}</p><ChangeBadge node={selected} revision={revision} />
      {version?.schema && <p className="spatial-schema-summary">{version.schema.summary}</p>}
      {renderReferences(outgoing, "outgoing")}{renderReferences(incoming, "incoming")}
      {version?.schema && <details><summary>Fields and constraints ({version.schema.fields.length})</summary><dl>{version.schema.fields.map((field) => <div key={field.name}><dt>{field.name}{field.optional ? "?" : ""}</dt><dd>{field.type}{field.constraints.length > 0 && <small>{field.constraints.join(" · ")}</small>}</dd></div>)}</dl>{version.schema.constraints.map((constraint) => <p key={constraint}>{constraint}</p>)}</details>}
      <button className="spatial-source-button" onClick={() => onInspect(selectedId)}>Inspect source</button>
    </aside>
  </div>
}
