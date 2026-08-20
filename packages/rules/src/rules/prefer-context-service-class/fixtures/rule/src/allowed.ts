import { Context, Context as EffectContext } from "effect"
import { Reference as ContextReference } from "effect/Context"

interface DatabaseShape {
  readonly query: (sql: string) => string
}

export class Database extends Context.Service<Database, DatabaseShape>()("app/Database") {}

export const FeatureFlag = Context.Reference<boolean>("app/FeatureFlag", {
  defaultValue: () => false
})

export const AliasedFeatureFlag = EffectContext.Reference<boolean>("app/AliasedFeatureFlag", {
  defaultValue: () => false
})

export const NamedFeatureFlag = ContextReference<boolean>("app/NamedFeatureFlag", {
  defaultValue: () => false
})

declare const unrelated: {
  readonly Service: <Shape>(key: string) => { readonly Service: Shape }
}

export const Lookalike = unrelated.Service<DatabaseShape>("app/Lookalike")

void Database
void FeatureFlag
void AliasedFeatureFlag
void NamedFeatureFlag
void Lookalike
