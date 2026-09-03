interface Coordinate { readonly x: number; readonly y: number }

interface RuntimeDefinition {
  readonly name: string
  readonly write: () => void
}
const write = () => {}
const definition: RuntimeDefinition = { name: "runtime", write }
void definition
