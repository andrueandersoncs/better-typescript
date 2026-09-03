function makeEmpty() { return {} }
function makeBundle(table: string, execute: () => void) { return { table, execute } }

interface Definition {
  readonly name: string
  readonly identifier: string
  readonly write: () => void
}

function makeDefinition(name: string, source: { readonly name: string }, write: () => void): Definition {
  return { name, identifier: source.name, write }
}
