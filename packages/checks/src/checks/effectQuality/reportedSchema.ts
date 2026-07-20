import { Array } from "effect"
import { collectFindings } from "../support/collectFindings.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type * as ts from "typescript"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import {
  unsafeCastFindings,
  typescriptNamespaceFindings,
  configSecretRedactionFindings
} from "./reportedSchemaSafety.js"
import { schemaClassModelFindings } from "./reportedSchemaClassModel.js"
import {
  schemaRecordInterfaceFindings,
  schemaOptionalKeyFindings
} from "./reportedSchemaRecordOptional.js"
import { schemaErrorClassFindings } from "./reportedSchemaErrorClass.js"
import { serviceMethodEffectFnFindings } from "./reportedSchemaServiceMethod.js"
import { effectFnNameFindings } from "./reportedSchemaFnName.js"

const collectors: ReadonlyArray<
  (
    context: CheckContext,
    index: EffectQualityIndex,
    node: ts.Node
  ) => ReadonlyArray<EffectQualityRuleFinding>
> = Array.make(
  unsafeCastFindings,
  schemaClassModelFindings,
  typescriptNamespaceFindings,
  serviceMethodEffectFnFindings,
  effectFnNameFindings,
  schemaRecordInterfaceFindings,
  schemaOptionalKeyFindings,
  schemaErrorClassFindings,
  configSecretRedactionFindings
)

export const schemaRuleFindings = collectFindings(collectors)
