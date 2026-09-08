import { StrictMode, useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"
import { ContractDiff } from "../contract-diff"
import type { Bootstrap } from "../review-types"
import type { ScopeGraph } from "../scope-types"
import { SpatialConcept } from "./spatial-concept"
import { buildArchitecture } from "./world-architecture"
import { buildOrbits } from "./world-orbits"
import { buildAssembly } from "./world-assembly"
import { categoryLabel, ChangeBadge, relationships, type Revision } from "./shared"
import "../styles.css"
import "./concepts.css"

self.MonacoEnvironment = { getWorker(_: string, label: string) { return label === "typescript" || label === "javascript" ? new tsWorker() : new editorWorker() } }

const concepts = [
  { id: "architecture", title: "Architectural cutaway", purpose: "Inhabit the codebase", question: "Contracts as rooms. Modules as buildings.", tradeoff: "Open the storeys to inspect what is inside; follow references across the section.", build: buildArchitecture },
  { id: "orbits", title: "Orbital system", purpose: "Explore a contract orrery", question: "Contracts as bodies. Modules as orbital systems.", tradeoff: "Tilt and spread the orbits to separate the relationships in three-dimensional space.", build: buildOrbits },
  { id: "assembly", title: "Exploded assembly", purpose: "Disassemble the system", question: "Contracts as machined parts. Modules as assemblies.", tradeoff: "Pull the cartridges apart along their axes to expose individual contracts and connections.", build: buildAssembly },
] as const

type ConceptId = (typeof concepts)[number]["id"]

const ConceptStudy = () => {
  const [data, setData] = useState<Bootstrap>()
  const [error, setError] = useState("")
  const [conceptId, setConceptId] = useState<ConceptId>(() => {
    const candidate = new URLSearchParams(location.search).get("view")
    return concepts.find((concept) => concept.id === candidate)?.id ?? "architecture"
  })
  const [revision, setRevision] = useState<Revision>("comparison")
  const [selectedId, setSelectedId] = useState("code.task")
  const [inspectedId, setInspectedId] = useState("")
  const sourceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="review-session-token"]')?.content ?? ""
    void fetch("/api/review/bootstrap", { headers: { "x-review-token": token } })
      .then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value as Bootstrap })
      .then(setData).catch((reason) => setError(String(reason)))
  }, [])

  const graph = useMemo<ScopeGraph>(() => {
    if (!data) return { nodes: [], connections: [], issues: [] }
    const nodes = data.scopeGraph.nodes.filter((node) => revision === "comparison" || Boolean(node[revision]))
      .map((node) => { const version = revision === "comparison" ? node.proposed ?? node.current : node[revision]; return { ...node, label: version?.label ?? node.label, category: version?.category ?? node.category, scope: version?.scope ?? node.scope, current: revision === "proposed" ? undefined : node.current, proposed: revision === "current" ? undefined : node.proposed } })
    const ids = new Set(nodes.map((node) => node.id))
    const connections = data.scopeGraph.connections.filter((edge) => ids.has(edge.from) && ids.has(edge.to) && (revision === "current" ? edge.change !== "added" : revision === "proposed" ? edge.change !== "removed" : true))
    return { nodes, connections: revision === "comparison" ? connections : connections.map((edge) => ({ ...edge, label: (revision === "current" ? edge.currentLabel : edge.proposedLabel) ?? edge.label })), issues: data.scopeGraph.issues }
  }, [data, revision])
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0]
  const concept = concepts.find((item) => item.id === conceptId)!
  const inspected = data?.scopeGraph.nodes.find((node) => node.id === inspectedId)
  const inspect = (id: string) => { setSelectedId(id); setInspectedId(id) }
  useEffect(() => { if (inspectedId) sourceRef.current?.scrollIntoView({ behavior: "instant", block: "start" }) }, [inspectedId])

  if (!data) return <div className="loading" role="status">{error || "Loading the inspected contract graph…"}</div>
  return <div className="concept-study" data-concept={conceptId} data-revision={revision} data-selected-id={selected?.id}>
    <header className="concept-study-header">
      <div><h1>Three-dimensional metaphor studies</h1><p>{data.plan.title} <span>· Same contracts, different spatial worlds</span></p></div>
      <a href="/">Return to review</a>
    </header>
    <nav className="concept-tabs" aria-label="Visualization concepts">
      {concepts.map((item) => <button key={item.id} type="button" aria-current={conceptId === item.id ? "page" : undefined} onClick={() => { setConceptId(item.id); history.replaceState(null, "", `?view=${item.id}`) }}><strong>{item.title}</strong><span>{item.purpose}</span></button>)}
    </nav>
    <main className="concept-main">
      <div className="concept-intro"><div><h2>{concept.question}</h2><p>{concept.tradeoff}</p></div><span>{graph.nodes.length} contracts · {graph.connections.length} relationships</span></div>
      <div className="concept-toolbar">
        <div className="concept-revisions" aria-label="Contract revision">{(["comparison", "current", "proposed"] as const).map((mode) => <button type="button" key={mode} aria-pressed={revision === mode} onClick={() => setRevision(mode)}>{mode === "comparison" ? "Compare" : mode === "current" ? "Current" : "Proposed"}</button>)}</div>
        <label>Selected contract <select value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <button type="button" className="concept-inspect" disabled={!selected} onClick={() => selected && inspect(selected.id)}>Inspect source</button>
      </div>
      <div className="concept-key" aria-label="Relationship key">{Object.entries(relationships).map(([kind, style]) => <span key={kind}><b style={{ color: style.color }}>{style.short}</b>{style.label}</span>)}<span className="concept-key-note">References, not runtime execution</span></div>
      <section className="concept-surface" aria-label={concept.title}>{selected ? <SpatialConcept key={conceptId} build={concept.build} graph={graph} revision={revision} selectedId={selected.id} onSelect={setSelectedId} onInspect={inspect} /> : <p>No contracts in this revision.</p>}</section>
      {graph.issues.length > 0 && <aside className="scope-issues"><h2>Graph interpretation issues</h2><ul>{graph.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></aside>}
      {inspected && <div className="concept-source" ref={sourceRef}><div className="concept-source-heading"><h2>Exact source comparison</h2><button type="button" onClick={() => { setInspectedId(""); document.querySelector(".concept-toolbar")?.scrollIntoView({ block: "start" }) }}>Close source</button></div><ContractDiff key={inspected.id} node={inspected} disabled={false} header={<div><div className="contract-title"><h2>{inspected.label}</h2><ChangeBadge node={inspected} revision="comparison" /></div><p>{categoryLabel(inspected)} · {inspected.proposed?.relativePath ?? inspected.current?.relativePath}</p></div>} /></div>}
      <footer className="concept-study-footer"><p>Exploration only. Choosing a view does not approve the plan or modify its contracts.</p><p>Try <button disabled={!graph.nodes.some((node) => node.id === "code.task")} onClick={() => setSelectedId("code.task")}>Task</button> to compare schema references, then <button disabled={!graph.nodes.some((node) => node.id === "code.complete-task")} onClick={() => setSelectedId("code.complete-task")}>completeTask</button> to compare an Effect contract.</p></footer>
    </main>
  </div>
}

createRoot(document.querySelector("#root")!).render(<StrictMode><ConceptStudy /></StrictMode>)
