import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { createBoardMaterial } from "./board-materials"
import { createCircuitTraces } from "./circuit-traces"
import { componentFootprint, createBoardComponent } from "./board-components"
import { changeColors, changeNames, entityStyles, relationshipStyles } from "./board-semantics"
import type { ScopeChange, ScopeConnection, ScopeGraph, ScopeNode, ScopeVersion } from "./scope-types"
import "./scope-board.css"

type ScopeBoardProps = {
  readonly graph: ScopeGraph
  readonly selectedId: string
  readonly onSelect: (id: string) => void
  readonly disabled?: boolean
}

type Point = { readonly x: number; readonly z: number }
type NodeVisual = ReturnType<typeof createBoardComponent>
type CameraPose = {
  readonly position: readonly [number, number, number]
  readonly target: readonly [number, number, number]
  readonly boardWidth: number
  readonly boardDepth: number
}
type BoardRuntime = {
  readonly select: (id: string) => void
  readonly reset: () => void
  readonly setInteractionDisabled: (disabled: boolean) => void
  readonly dispose: () => void
}

type ComparisonMode = "comparison" | "current" | "proposed"



const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const versionFor = (node: ScopeNode, mode: ComparisonMode): ScopeVersion | undefined => mode === "current"
  ? node.current
  : mode === "proposed"
    ? node.proposed
    : node.proposed ?? node.current
const labelFor = (node: ScopeNode, mode: ComparisonMode) => versionFor(node, mode)?.label ?? node.label
const nodeStatus = (node: ScopeNode, mode: ComparisonMode) => mode === "comparison"
  ? changeNames[node.change]
  : versionFor(node, mode)
    ? mode === "current" ? "Current definition" : "Proposed definition"
    : mode === "current" ? "Absent from current" : "Absent from proposed"



const disposeObject = (root: THREE.Object3D) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material?.dispose()
  })
}


const boardLayout = (nodes: ReadonlyArray<ScopeNode>, mode: ComparisonMode, compact: boolean) => {
  const byScope = new Map<string, ScopeNode[]>()
  nodes.forEach((node) => {
    const key = versionFor(node, mode)?.scope ?? node.scope
    const nodesForScope = byScope.get(key) ?? []
    nodesForScope.push(node)
    byScope.set(key, nodesForScope)
  })
  const groups = [...byScope.entries()].map(([scope, groupNodes]) => ({ scope, nodes: groupNodes }))
  const maximumGroupSize = Math.max(1, ...groups.map((group) => group.nodes.length))
  const localColumns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(maximumGroupSize))))
  const localRows = Math.ceil(maximumGroupSize / localColumns)
  const regionWidth = Math.max(6.4, localColumns * 4.2 + 1.45)
  const regionDepth = Math.max(5.6, localRows * 3.55 + 1.7)
  const groupColumns = compact ? 1 : Math.max(1, Math.ceil(Math.sqrt(groups.length)))
  const groupRows = Math.ceil(groups.length / groupColumns)
  const boardWidth = groupColumns * (regionWidth + 0.55) + 0.75
  const boardDepth = groupRows * (regionDepth + 0.55) + 0.75
  const positions = new Map<string, Point>()
  const regions: Array<{ readonly scope: string; readonly x: number; readonly z: number }> = []

  groups.forEach((group, groupIndex) => {
    const gx = groupIndex % groupColumns
    const gz = Math.floor(groupIndex / groupColumns)
    const centerX = (gx - (groupColumns - 1) / 2) * (regionWidth + 0.55)
    const centerZ = (gz - (groupRows - 1) / 2) * (regionDepth + 0.55)
    regions.push({ scope: group.scope, x: centerX, z: centerZ })
    group.nodes.forEach((node, index) => {
      const column = index % localColumns
      const row = Math.floor(index / localColumns)
      positions.set(node.id, {
        x: centerX + (column - (localColumns - 1) / 2) * 4.2,
        z: centerZ + (row - (localRows - 1) / 2) * 3.55,
      })
    })
  })

  return { positions, regions, regionWidth, regionDepth, boardWidth, boardDepth }
}

const relationshipMarkerPaths = {
  diamond: "M35 9 L39 5 L43 9 L39 13 Z",
  circle: "M43 9 A4 4 0 1 1 35 9 A4 4 0 1 1 43 9",
  arrow: "M36 5 L42 9 L36 13",
  "double-arrow": "M31 5 L37 9 L31 13 M37 5 L43 9 L37 13",
  cross: "M35 5 L43 13 M43 5 L35 13",
  square: "M35 5 H43 V13 H35 Z",
}

const RelationshipSwatch = ({ kind }: { readonly kind: ScopeConnection["kind"] }) => {
  const style = relationshipStyles[kind]
  return <svg viewBox="0 0 48 18" aria-hidden="true" fill="none" stroke={style.color} strokeWidth="2" strokeLinejoin="round">
    {style.pattern === "double"
      ? <path d="M2 6 H32 M2 12 H32" />
      : <path
          d={style.pattern === "zigzag" ? "M2 9 H6 L10 5 L16 13 L22 5 L28 13 L32 9 H35" : "M2 9 H35"}
          strokeWidth={style.pattern === "bus" ? 4 : 2}
          strokeDasharray={style.pattern === "dashed" ? "4 3" : undefined}
        />}
    <path d={relationshipMarkerPaths[style.marker]} />
  </svg>
}

export const ScopeBoard = ({ graph, selectedId, onSelect, disabled = false }: ScopeBoardProps) => {
  const stageRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nodeLabelRefs = useRef(new Map<string, HTMLButtonElement>())
  const regionLabelRefs = useRef(new Map<string, HTMLSpanElement>())
  const runtimeRef = useRef<BoardRuntime | undefined>(undefined)
  const selectRef = useRef(onSelect)
  const disabledRef = useRef(disabled)
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("comparison")
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 620px)").matches)
  const [hoveredId, setHoveredId] = useState("")
  const selectedIdRef = useRef(selectedId)
  const cameraPoseRef = useRef<CameraPose | undefined>(undefined)
  const [rendererStatus, setRendererStatus] = useState<"checking" | "ready" | "fallback">("checking")
  selectRef.current = onSelect
  disabledRef.current = disabled
  selectedIdRef.current = selectedId

  const visibleConnections = useMemo(() => graph.connections.filter((connection) =>
    comparisonMode === "current" ? connection.change !== "added" : comparisonMode === "proposed" ? connection.change !== "removed" : true
  ), [graph.connections, comparisonMode])
  const selectedConnections = useMemo(
    () => selectedId ? visibleConnections.filter((connection) => connection.from === selectedId || connection.to === selectedId) : [],
    [visibleConnections, selectedId],
  )
  const layout = useMemo(() => boardLayout(graph.nodes, comparisonMode, compact), [graph.nodes, comparisonMode, compact])
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes])
  const selectedNode = nodeById.get(selectedId)

  useEffect(() => {
    const stage = stageRef.current
    const overlay = overlayRef.current
    if (!stage || !overlay) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    } catch {
      setRendererStatus("fallback")
      return
    }

    setRendererStatus("ready")
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.94
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setClearColor(0xe8eee8, 0)
    renderer.domElement.className = "scope-board-canvas"
    renderer.domElement.setAttribute("aria-hidden", "true")
    stage.prepend(renderer.domElement)

    const scene = new THREE.Scene()
    const boardSpan = Math.max(layout.boardWidth, layout.boardDepth)
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, boardSpan * 12)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = true
    controls.enableRotate = true
    controls.enableZoom = true
    controls.minPolarAngle = 0.08
    controls.maxPolarAngle = Math.PI / 2 - 0.035
    controls.keyPanSpeed = 14
    controls.listenToKeyEvents(stage)
    controls.enabled = !disabledRef.current

    const createEnvironmentTarget = () => {
      const generator = new THREE.PMREMGenerator(renderer)
      const environmentScene = new RoomEnvironment()
      const target = generator.fromScene(environmentScene, 0.04)
      disposeObject(environmentScene)
      generator.dispose()
      return target
    }
    let environmentTarget = createEnvironmentTarget()
    scene.environment = environmentTarget.texture
    scene.environmentIntensity = 0.34

    const hemisphere = new THREE.HemisphereLight(0xe8f4ff, 0x061d18, 0.72)
    scene.add(hemisphere)
    const keyLight = new THREE.DirectionalLight(0xfff0d2, 2.15)
    keyLight.position.set(-boardSpan * 0.38, boardSpan * 0.72, boardSpan * 0.42)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.left = -boardSpan * 0.65
    keyLight.shadow.camera.right = boardSpan * 0.65
    keyLight.shadow.camera.top = boardSpan * 0.65
    keyLight.shadow.camera.bottom = -boardSpan * 0.65
    keyLight.shadow.camera.near = 0.1
    keyLight.shadow.camera.far = boardSpan * 2.2
    keyLight.shadow.bias = -0.00025
    keyLight.shadow.normalBias = 0.025
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0xb7ddff, 0.62)
    fillLight.position.set(boardSpan * 0.46, boardSpan * 0.34, boardSpan * 0.3)
    scene.add(fillLight)
    const rimLight = new THREE.DirectionalLight(0xffbd82, 0.42)
    rimLight.position.set(0, boardSpan * 0.28, -boardSpan * 0.55)
    scene.add(rimLight)

    const board = new THREE.Mesh(
      new RoundedBoxGeometry(layout.boardWidth, 0.32, layout.boardDepth, 4, 0.12),
      createBoardMaterial({ color: "#0b342b", surface: "substrate", accent: "#4b9278" }),
    )
    board.position.y = -0.18
    board.receiveShadow = true
    scene.add(board)

    layout.regions.forEach((region) => {
      const regionPlate = new THREE.Mesh(
        new RoundedBoxGeometry(layout.regionWidth, 0.055, layout.regionDepth, 3, 0.075),
        createBoardMaterial({ color: "#185340", surface: "region", accent: "#72b99b", transparent: true, opacity: 0.86 }),
      )
      regionPlate.position.set(region.x, 0.005, region.z)
      regionPlate.receiveShadow = true
      scene.add(regionPlate)
      const perimeter = new THREE.LineSegments(
        new THREE.EdgesGeometry(new RoundedBoxGeometry(layout.regionWidth, 0.065, layout.regionDepth, 3, 0.075)),
        new THREE.LineBasicMaterial({ color: 0xb5dec6, transparent: true, opacity: 0.52 }),
      )
      perimeter.position.set(region.x, 0.045, region.z)
      scene.add(perimeter)
    })

    const nodeVisuals = new Map<string, NodeVisual>()
    const pickables: THREE.Object3D[] = []
    const components = graph.nodes.map((node) => {
      const position = layout.positions.get(node.id) ?? { x: 0, z: 0 }
      const version = versionFor(node, comparisonMode)
      const footprint = componentFootprint(version?.category ?? node.category, version?.schema)
      const visual = createBoardComponent({ node, version, comparison: comparisonMode === "comparison", position, footprint })
      scene.add(visual.group)
      nodeVisuals.set(node.id, visual)
      pickables.push(...visual.pickables)
      return { id: node.id, x: position.x, z: position.z, width: footprint.width, depth: footprint.depth, contacts: visual.contacts }
    })
    const circuitTraces = createCircuitTraces({
      connections: visibleConnections,
      components,
      boardWidth: layout.boardWidth,
      boardDepth: layout.boardDepth,
      comparison: comparisonMode === "comparison",
    })
    scene.add(circuitTraces.group)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5)
    const hitPoint = new THREE.Vector3()
    const labelPoint = new THREE.Vector3()
    const fitPoint = new THREE.Vector3()
    const regionPoint = new THREE.Vector3()
    const cameraTarget = new THREE.Vector3(0, 0.12, 0)
    const defaultCameraDirection = new THREE.Vector3(0, 0.92, 0.39).normalize()
    let viewport = { width: 0, height: 0 }
    let cameraInitialized = false
    const labelBounds = components.map((component) => ({ id: component.id, left: 0, top: 0, width: 0, height: 0, hidden: true }))

    const updateLabels = () => {
      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(controls.target)
      const labelWidth = clamp(viewport.height / visibleHeight * 4.45, 62, 150)
      components.forEach((component, index) => {
        const label = nodeLabelRefs.current.get(component.id)
        if (!label) return
        labelPoint.set(component.x, 0.08, component.z + component.depth / 2 + 0.56).project(camera)
        const bounds = labelBounds[index]
        bounds.left = (labelPoint.x * 0.5 + 0.5) * viewport.width
        bounds.top = (-labelPoint.y * 0.5 + 0.5) * viewport.height
        bounds.hidden = labelPoint.z < -1 || labelPoint.z > 1
        label.style.maxWidth = `${labelWidth}px`
        label.style.transform = `translate3d(${(labelPoint.x * 0.5 + 0.5) * viewport.width}px, ${(-labelPoint.y * 0.5 + 0.5) * viewport.height}px, 0) translate(-50%, 0)`
        label.hidden = labelPoint.z < -1 || labelPoint.z > 1
      })
      layout.regions.forEach((region) => {
        const label = regionLabelRefs.current.get(region.scope)
        if (!label) return
        regionPoint.set(region.x, 0.12, region.z - layout.regionDepth / 2 + 0.65).project(camera)
        label.style.transform = `translate3d(${(regionPoint.x * 0.5 + 0.5) * viewport.width}px, ${(-regionPoint.y * 0.5 + 0.5) * viewport.height}px, 0) translate(-50%, -50%)`
        label.hidden = regionPoint.z < -1 || regionPoint.z > 1
      })
      // Read after all label writes so hit targets share a single layout pass.
      labelBounds.forEach((bounds) => {
        const label = nodeLabelRefs.current.get(bounds.id)
        if (!label) return
        bounds.width = label.offsetWidth
        bounds.height = label.offsetHeight
        bounds.left -= bounds.width / 2
      })
    }

    const draw = () => {
      renderer.render(scene, camera)
      updateLabels()
    }

    const fitDistanceFor = (direction: THREE.Vector3) => {
      camera.position.copy(cameraTarget).add(direction)
      camera.lookAt(cameraTarget)
      camera.updateMatrixWorld(true)
      const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const tanHorizontal = tanVertical * camera.aspect
      let distance = 1
      for (let corner = 0; corner < 8; corner += 1) {
        fitPoint.set(
          (corner & 1 ? 1 : -1) * layout.boardWidth / 2,
          corner & 4 ? 0.95 : -0.34,
          (corner & 2 ? 1 : -1) * layout.boardDepth / 2,
        ).applyMatrix4(camera.matrixWorldInverse)
        const alongView = fitPoint.z + 1
        distance = Math.max(
          distance,
          alongView + Math.abs(fitPoint.x) * 1.08 / tanHorizontal,
          alongView + Math.abs(fitPoint.y) * 1.08 / tanVertical,
        )
      }
      return distance
    }

    const resetView = () => {
      if (!viewport.width || !viewport.height) return
      const distance = fitDistanceFor(defaultCameraDirection)
      controls.target.copy(cameraTarget)
      camera.position.copy(cameraTarget).addScaledVector(defaultCameraDirection, distance)
      controls.minDistance = distance * 0.38
      controls.maxDistance = distance * 2.6
      controls.update()
      draw()
    }

    const restoreView = () => {
      const pose = cameraPoseRef.current
      if (!pose || Math.abs(pose.boardWidth - layout.boardWidth) > 0.01 || Math.abs(pose.boardDepth - layout.boardDepth) > 0.01) return
      camera.position.fromArray(pose.position)
      controls.target.fromArray(pose.target)
      controls.update()
      draw()
    }

    const onCameraChange = () => draw()

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect()
      if (!width || !height) return
      setCompact(width < 560)
      viewport = { width, height }
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      if (!cameraInitialized) {
        cameraInitialized = true
        resetView()
        restoreView()
      } else draw()
    }

    const applySelection = (id: string) => {
      nodeVisuals.forEach((visual, nodeId) => {
        const isSelected = nodeId === id
        visual.halo.visible = isSelected
        visual.materials.forEach((material) => {
          material.emissive.copy(material.color)
          material.emissiveIntensity = isSelected ? 0.24 : 0.025
        })
      })
      circuitTraces.select(id)
      draw()
    }

    const intersections: THREE.Intersection[] = []
    const pick = (event: PointerEvent): string | undefined => {
      if (!viewport.width || !viewport.height) return undefined
      pointer.x = event.offsetX / viewport.width * 2 - 1
      pointer.y = -(event.offsetY / viewport.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      intersections.length = 0
      raycaster.intersectObjects(pickables, false, intersections)
      const hit = intersections[0]?.object.userData.scopeNodeId as string | undefined
      if (hit) return hit
      if (!raycaster.ray.intersectPlane(hitPlane, hitPoint)) return undefined
      for (const component of components) {
        if (Math.abs(hitPoint.x - component.x) <= component.width / 2 && Math.abs(hitPoint.z - component.z) <= component.depth / 2) return component.id
      }
      return undefined
    }

    const pickLabel = (event: PointerEvent): string | undefined => {
      for (const bounds of labelBounds) {
        if (bounds.hidden) continue
        if (event.offsetX >= bounds.left && event.offsetX <= bounds.left + bounds.width && event.offsetY >= bounds.top && event.offsetY <= bounds.top + bounds.height) return bounds.id
      }
      return undefined
    }

    const activePointers = new Map<number, Point>()
    let selectionSuppressed = false
    const onPointerDown = (event: PointerEvent) => {
      if (disabledRef.current || event.button !== 0) return
      stage.focus({ preventScroll: true })
      if (activePointers.size === 0) selectionSuppressed = false
      activePointers.set(event.pointerId, { x: event.clientX, z: event.clientY })
      if (activePointers.size > 1) selectionSuppressed = true
    }
    const onPointerMove = (event: PointerEvent) => {
      const origin = activePointers.get(event.pointerId)
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.z) > 6) selectionSuppressed = true
      if (!disabledRef.current && !selectionSuppressed) {
        const id = pickLabel(event) ?? pick(event) ?? ""
        const node = nodeById.get(id)
        renderer.domElement.title = node ? `${labelFor(node, comparisonMode)} · ${entityStyles[versionFor(node, comparisonMode)?.category ?? node.category].label} · ${nodeStatus(node, comparisonMode)}` : ""
        setHoveredId(id)
      }
    }
    const onPointerUp = (event: PointerEvent) => {
      const canSelect = !disabledRef.current && !selectionSuppressed && event.isPrimary && event.button === 0 && activePointers.has(event.pointerId)
      activePointers.delete(event.pointerId)
      if (canSelect) {
        const id = pickLabel(event) ?? pick(event)
        if (id) selectRef.current(id)
      }
      if (activePointers.size === 0) selectionSuppressed = false
    }
    const onPointerCancel = (event: PointerEvent) => {
      selectionSuppressed = true
      activePointers.delete(event.pointerId)
      setHoveredId("")
    }
    const onPointerLeave = () => setHoveredId("")
    const onContextLost = (event: Event) => {
      event.preventDefault()
      setRendererStatus("fallback")
    }
    const onContextRestored = () => {
      environmentTarget = createEnvironmentTarget()
      scene.environment = environmentTarget.texture
      renderer.shadowMap.needsUpdate = true
      setRendererStatus("ready")
      resize()
    }

    controls.addEventListener("change", onCameraChange)
    renderer.domElement.addEventListener("pointerdown", onPointerDown, true)
    renderer.domElement.addEventListener("pointerup", onPointerUp, true)
    renderer.domElement.addEventListener("pointermove", onPointerMove, true)
    renderer.domElement.addEventListener("pointercancel", onPointerCancel, true)
    renderer.domElement.addEventListener("pointerleave", onPointerLeave)
    renderer.domElement.addEventListener("webglcontextlost", onContextLost)
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored)
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    resize()
    applySelection(selectedIdRef.current)

    runtimeRef.current = {
      select: applySelection,
      reset: resetView,
      setInteractionDisabled: (isDisabled) => {
        controls.enabled = !isDisabled
        if (isDisabled) setHoveredId("")
      },
      dispose: () => {
        cameraPoseRef.current = {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [controls.target.x, controls.target.y, controls.target.z],
          boardWidth: layout.boardWidth,
          boardDepth: layout.boardDepth,
        }
        observer.disconnect()
        controls.removeEventListener("change", onCameraChange)
        controls.stopListenToKeyEvents()
        controls.dispose()
        renderer.domElement.removeEventListener("pointerdown", onPointerDown, true)
        renderer.domElement.removeEventListener("pointerup", onPointerUp, true)
        renderer.domElement.removeEventListener("pointermove", onPointerMove, true)
        renderer.domElement.removeEventListener("pointercancel", onPointerCancel, true)
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave)
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost)
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored)
        environmentTarget.dispose()
        disposeObject(scene)
        renderer.renderLists.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      },
    }

    return () => {
      runtimeRef.current?.dispose()
      runtimeRef.current = undefined
    }
  }, [graph, layout, comparisonMode, visibleConnections])

  useEffect(() => {
    runtimeRef.current?.select(selectedId)
  }, [selectedId])

  useEffect(() => {
    runtimeRef.current?.setInteractionDisabled(disabled)
  }, [disabled])

  const selectNode = (id: string) => {
    if (!disabled) onSelect(id)
  }

  return <section
    className={`scope-board ${rendererStatus === "fallback" ? "is-fallback" : ""}`}
    aria-label="Contract scope board"
    data-renderer-status={rendererStatus}
    data-selected-node-id={selectedId}
    data-comparison-mode={comparisonMode}
    data-node-count={graph.nodes.length}
  >
    <header className="scope-board-header">
      <div><h2>Contract scope</h2><p>Record cards are schemas; server stacks are services; matching connectors are interfaces; tags are types; pipelines are functions; warning signs are errors.</p></div>
      <div className="scope-board-tools">
        <div className="scope-board-modes" aria-label="Comparison mode">
          {(["comparison", "current", "proposed"] as const).map((mode) => <button key={mode} type="button" disabled={disabled} aria-pressed={comparisonMode === mode} onClick={() => setComparisonMode(mode)} data-comparison-mode={mode}>{mode === "comparison" ? "Compare" : mode[0].toUpperCase() + mode.slice(1)}</button>)}
        </div>
        <button className="scope-board-reset" type="button" disabled={disabled || rendererStatus !== "ready"} onClick={() => runtimeRef.current?.reset()}>Reset camera</button>
        <div className="scope-board-legend" aria-label="Change legend">
          {(Object.keys(changeNames) as ScopeChange[]).map((change) => <span key={change} data-change={change} style={{ "--change-color": changeColors[change] } as CSSProperties}><i aria-hidden="true" />{changeNames[change]}</span>)}
        </div>
      </div>
    </header>
    <p className="scope-board-description" id="scope-board-description">Connections describe source contracts, not runtime execution. Arrows point to referenced contracts. Drag to orbit, scroll or pinch to zoom, and use a secondary drag to pan. Unchanged source does not mean unaffected behavior.</p>
    <ul className="scope-board-relationship-key" aria-label="Relationship key">
      {(Object.keys(relationshipStyles) as ScopeConnection["kind"][]).map((kind) => <li key={kind} data-connection-kind={kind}><RelationshipSwatch kind={kind} /><span>{relationshipStyles[kind].label}</span></li>)}
    </ul>
    <div className="scope-board-stage" ref={stageRef} style={{ aspectRatio: layout.boardWidth / layout.boardDepth }} tabIndex={rendererStatus === "ready" ? 0 : -1} aria-label="Interactive contract circuit board" aria-describedby="scope-board-description" data-board-stage="circuit">
      <div className="scope-board-overlay" ref={overlayRef} hidden={rendererStatus !== "ready"}>
        {graph.nodes.map((node) => {
          const entity = entityStyles[versionFor(node, comparisonMode)?.category ?? node.category]
          return <button
          key={node.id}
          type="button"
          className={`scope-board-node-label is-${node.change}`}
          style={{ "--entity-color": entity.color } as CSSProperties}
          data-active={node.id === selectedId || node.id === hoveredId}
          data-category={versionFor(node, comparisonMode)?.category ?? node.category}
          title={`${labelFor(node, comparisonMode)} · ${entity.label} · ${nodeStatus(node, comparisonMode)}`}
          ref={(element) => { if (element) nodeLabelRefs.current.set(node.id, element); else nodeLabelRefs.current.delete(node.id) }}
          onClick={() => selectNode(node.id)}
          disabled={disabled}
          aria-pressed={selectedId === node.id}
          data-node-id={node.id}
          data-change={node.change}
        ><span>{labelFor(node, comparisonMode)}</span><small>{entity.label}{comparisonMode === "comparison" && node.change !== "unchanged" ? ` · ${node.change}` : !versionFor(node, comparisonMode) ? " · absent" : ""}</small></button>
        })}
        {layout.regions.map((region) => <span
          key={region.scope}
          className="scope-board-region-label"
          ref={(element) => { if (element) regionLabelRefs.current.set(region.scope, element); else regionLabelRefs.current.delete(region.scope) }}
          data-scope={region.scope}
        >{region.scope}</span>)}
      </div>
      {rendererStatus === "fallback" && <div className="scope-board-fallback" role="status">3D board is unavailable. Use the contract component list below to inspect and select every declared item.</div>}
    </div>
    <div className="scope-board-footer">
      <details className="scope-board-node-list" open={rendererStatus === "fallback" ? true : undefined}>
        <summary>All contracts ({graph.nodes.length})</summary>
        <nav aria-label="Contract components">{graph.nodes.map((node) => <button key={node.id} type="button" disabled={disabled} aria-current={selectedId === node.id ? "true" : undefined} onClick={() => selectNode(node.id)} data-node-id={node.id} data-change={node.change}><span>{labelFor(node, comparisonMode)}</span><small>{versionFor(node, comparisonMode)?.category ?? node.category} · {versionFor(node, comparisonMode)?.scope ?? node.scope} · {nodeStatus(node, comparisonMode)}</small></button>)}</nav>
      </details>
      <aside className="scope-board-connection-note"><h3>Connected to {selectedNode ? labelFor(selectedNode, comparisonMode) : "selection"}</h3>{selectedConnections.length > 0 ? <ul>{selectedConnections.map((connection) => {
        const otherId = connection.from === selectedId ? connection.to : connection.from
        const label = comparisonMode === "current" ? connection.currentLabel : comparisonMode === "proposed" ? connection.proposedLabel : connection.label
        const other = nodeById.get(otherId)
        return <li key={connection.id} data-connection-id={connection.id} data-connection-kind={connection.kind} data-change={connection.change}><button disabled={disabled} onClick={() => selectNode(otherId)}>{other ? labelFor(other, comparisonMode) : otherId}</button><span>{relationshipStyles[connection.kind].label}{connection.kind === "schema" ? ` · ${label}` : ""}{comparisonMode === "comparison" && connection.change !== "unchanged" ? ` · ${changeNames[connection.change]}` : ""}</span></li>
      })}</ul> : <span>No connections in this view.</span>}</aside>
    </div>
  </section>
}
