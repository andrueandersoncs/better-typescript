import { useMemo, useState } from "react"
import type { Draft } from "./types"

interface EditorState {
  readonly draft: Draft
  readonly isDirty: boolean
  readonly isSaving: boolean
}

export function useDraftEditor(initial: Draft) {
  const [state, setState] = useState<EditorState>({ draft: initial, isDirty: false, isSaving: false })

  const canSubmit = useMemo(
    () => state.isDirty && !state.isSaving && state.draft.title.trim().length > 0,
    [state],
  )

  const update = (patch: Partial<Draft>) =>
    setState((prev) => ({ ...prev, draft: { ...prev.draft, ...patch }, isDirty: true }))

  const markSaving = () => setState((prev) => ({ ...prev, isSaving: true }))

  const markSaved = (draft: Draft) => setState({ draft, isDirty: false, isSaving: false })

  return { state, canSubmit, update, markSaving, markSaved }
}
