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
  let output = ""
  if (template !== undefined) {
    if (template.segments.length > 0) {
      for (const segment of template.segments) {
        if (segment.kind === "text") {
          output += segment.value
        } else {
          const replacement = template.values.get(segment.value)
          if (replacement !== undefined) {
            output += replacement
          }
        }
      }
      if (output.length > 0) {
        output = collapseSpaces(output)
      }
    }
  }
  return output
}
