import { describe, it } from "vitest"
import * as fc from "fast-check"
import { saveDraft, loadDraft } from "../src/drafts"

describe("draft storage", () => {
  it("loads a saved draft for every identifier", () => {
    const property = fc.asyncProperty(fc.uuid(), async (id) => {
      await saveDraft({ id, body: "quarterly update" })
      return (await loadDraft(id)).id === id
    })

    fc.assert(property)
  })
})
