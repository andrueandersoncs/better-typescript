import { Array, Function, Option, pipe } from "effect"
import type { MatchContext } from "../scanner/matchContext.js"
import { isRootRole } from "../builtins/effectQuality/isRootRole.js"
import { isTestRole } from "../builtins/effectQuality/isTestRole.js"
import type { ArchitectureRole } from "./architectureRoleType.js"
import { conventionalArchitectureRoleOf } from "./conventionalArchitectureRoleOf.js"
import { toRelativeFileName } from "./paths.js"

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
