type Segment = {
  readonly kind: "text" | "token"
  readonly value: string
}

type Template = {
  readonly segments: ReadonlyArray<Segment>
  readonly values: ReadonlyMap<string, string>
}

const collapseSpaces = (value: string): string => value.replace(/\s+/g, " ").trim()

export const renderTemplate = (template: Template | undefined): string => {
  if (template === undefined || template.segments.length === 0) {
    return ""
  }
  let output = ""
  for (const segment of template.segments) {
    if (segment.kind === "text") {
      output += segment.value
      continue
    }
    const replacement = template.values.get(segment.value)
    if (replacement !== undefined) {
      output += replacement
    }
  }
  return output.length === 0 ? "" : collapseSpaces(output)
}
