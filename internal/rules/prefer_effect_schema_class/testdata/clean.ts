interface Coordinate { readonly x: number; readonly y: number }

interface RuntimeDefinition {
  readonly name: string
  readonly write: () => void
}
const write = () => {}
const definition: RuntimeDefinition = { name: "runtime", write }
void definition

declare const Schema: any
declare const ModelFields: any
export class Model extends Schema.Class<Model>("Model")(ModelFields) {
  static resolve(): Model {
    return Model.make({})
  }
}
