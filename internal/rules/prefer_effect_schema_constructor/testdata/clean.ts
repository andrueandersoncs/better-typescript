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

interface AgentConfig {
  readonly name: string
  readonly attempts: number
}

function fixtureValues(value: number): readonly AgentConfig[] {
  const valid: AgentConfig = { name: "fixture", attempts: 2 }
  const malformed = { name: 42, probability: -1 }
  const candidate = { score: value + 1, selected: value > 0 }
  void [malformed, candidate]
  return [valid]
}
