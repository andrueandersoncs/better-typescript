import { Option, pipe } from "effect"
import * as ts from "typescript"
import { alwaysExitsScope } from "../support/alwaysExitsScope.js"

// Treat branchless exiting ifs as guards because successive guards form a flat dispatch ladder.
export const isDispatchGuard = (statement: ts.Statement): statement is ts.IfStatement =>
  pipe(
    Option.liftPredicate(ts.isIfStatement)(statement),
    Option.exists((ifStatement) => {
      const elseBranch = Option.fromNullishOr(ifStatement.elseStatement)
      const isBranchless = Option.isNone(elseBranch)

      return isBranchless && alwaysExitsScope(ifStatement.thenStatement)
    })
  )
