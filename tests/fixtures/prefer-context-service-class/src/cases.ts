import { Context, Context as EffectContext } from "effect"
import { Service as ContextService } from "effect/Context"

interface DatabaseShape {
  readonly query: (sql: string) => string
}

export const Database = Context.Service<DatabaseShape>("app/Database") // ~detect
export const AliasedContext = EffectContext.Service<DatabaseShape>("app/AliasedContext") // ~detect
export const NamedImport = ContextService<DatabaseShape>("app/NamedImport") // ~detect

interface TwoStageIdentifier {}

export const TwoStage = Context.Service<TwoStageIdentifier, DatabaseShape>()("app/TwoStage")

void Database
void AliasedContext
void NamedImport
void TwoStage
