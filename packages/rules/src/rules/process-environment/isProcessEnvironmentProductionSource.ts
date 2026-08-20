import { Array, Function, Option, pipe } from "effect"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { isRootRole } from "./isRootRole.js"
import { isTestRole } from "./isTestRole.js"
import type { ArchitectureRole } from "../../internal/support/architectureRoleType.js"
import { conventionalArchitectureRoleOf } from "../../internal/support/conventionalArchitectureRoleOf.js"
import { toRelativeFileName } from "../../internal/support/paths.js"

const roleIsProduction = (candidate: ArchitectureRole) => {
  const root = isRootRole(candidate)
  const test = isTestRole(candidate)
  const rootOrTestChecks = Array.make(root, test)
  const isRootOrTest = Array.some(rootOrTestChecks, Boolean)

  return !isRootOrTest
}

export const isProcessEnvironmentProductionSource = (context: MatchContext) => {
  const relativePath = toRelativeFileName(context.projectRoot)(context.sourceFile.fileName)
  const role = conventionalArchitectureRoleOf(relativePath)

  return pipe(role, Option.match({ onNone: Function.constTrue, onSome: roleIsProduction }))
}
