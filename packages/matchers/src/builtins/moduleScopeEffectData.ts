import { Array, Schema } from "effect"

const moduleScopeEffectKinds = Array.make<["effect-run", "module-scope-io"]>(
  "effect-run",
  "module-scope-io"
)

const moduleScopeEffectKind = Schema.Literals(moduleScopeEffectKinds)

// ModuleScopeEffectData classifies one effectful call because remediation differs by kind.
export const ModuleScopeEffectData = Schema.Struct({
  calleeText: Schema.String,
  kind: moduleScopeEffectKind
})

export interface ModuleScopeEffectData extends Schema.Schema.Type<typeof ModuleScopeEffectData> {}
