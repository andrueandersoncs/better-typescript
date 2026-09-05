import * as monaco from "monaco-editor"
import { useEffect, useRef, type ReactNode } from "react"
import type { SchemaFieldView, ScopeNode } from "./scope-types"

const describeField = (field: SchemaFieldView | undefined) => field
  ? `${field.type}${field.optional ? " · optional" : " · required"}${field.mutable ? " · mutable" : " · readonly"}${field.constraints.length ? ` · ${field.constraints.join(", ")}` : ""}`
  : "Not present"

export const ContractDiff = ({ node, header, onEdit, disabled }: {
  readonly node: ScopeNode
  readonly header: ReactNode
  readonly onEdit?: () => void
  readonly disabled: boolean
}) => {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current) return
    const original = monaco.editor.createModel(node.current?.source ?? "", "typescript", monaco.Uri.parse(`inmemory://scope/${encodeURIComponent(node.id)}/current.ts`))
    const modified = monaco.editor.createModel(node.proposed?.source ?? "", "typescript", monaco.Uri.parse(`inmemory://scope/${encodeURIComponent(node.id)}/proposed.ts`))
    const editor = monaco.editor.createDiffEditor(host.current, {
      readOnly: true,
      originalEditable: false,
      automaticLayout: true,
      renderSideBySide: host.current.clientWidth >= 680,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      theme: "vs",
      wordWrap: "on",
      accessibilitySupport: "on",
    })
    editor.setModel({ original, modified })
    const resize = new ResizeObserver(([entry]) => editor.updateOptions({ renderSideBySide: entry.contentRect.width >= 680 }))
    resize.observe(host.current)
    return () => { resize.disconnect(); editor.dispose(); original.dispose(); modified.dispose() }
  }, [node.id, node.current?.source, node.proposed?.source])

  const current = node.current?.schema
  const proposed = node.proposed?.schema
  const fields = [...new Set([...(current?.fields.map((field) => field.name) ?? []), ...(proposed?.fields.map((field) => field.name) ?? [])])]
  return <section className="code-pane contract-diff" aria-label={`Contract changes for ${node.label}`}>
    <header>{header}{onEdit && <button className="primary-action" disabled={disabled} onClick={onEdit}>Edit proposed code</button>}</header>
    <div className="diff-labels"><span>Current{node.current ? "" : " · not present"}</span><span>Proposed{node.proposed ? "" : " · removed"}</span></div>
    <div className="editor contract-diff-editor" ref={host} />
    {(current || proposed) && <details className="schema-details">
      <summary>Schema structure and constraints</summary>
      <dl className="schema-shapes"><div><dt>Current decoded shape</dt><dd>{current?.summary ?? "No runtime schema"}</dd>{current?.constraints.length ? <dd>{current.constraints.join(" · ")}</dd> : null}</div><div><dt>Proposed decoded shape</dt><dd>{proposed?.summary ?? "No runtime schema"}</dd>{proposed?.constraints.length ? <dd>{proposed.constraints.join(" · ")}</dd> : null}</div></dl>
      {(current?.encoded || proposed?.encoded) && <dl className="schema-shapes"><div><dt>Current encoded shape</dt><dd>{current?.encoded?.summary ?? current?.summary ?? "Not present"}</dd></div><div><dt>Proposed encoded shape</dt><dd>{proposed?.encoded?.summary ?? proposed?.summary ?? "Not present"}</dd></div></dl>}
      {fields.length > 0 && <div className="field-comparison"><table><thead><tr><th>Field</th><th>Current</th><th>Proposed</th></tr></thead><tbody>{fields.map((name) => {
        const before = describeField(current?.fields.find((field) => field.name === name))
        const after = describeField(proposed?.fields.find((field) => field.name === name))
        return <tr key={name} data-changed={before !== after}><th scope="row">{name}</th><td>{before}</td><td>{after}</td></tr>
      })}</tbody></table></div>}
    </details>}
  </section>
}
