import * as path from "node:path"
import * as ts from "typescript"

export const syntheticSourceFile = (
  context: { readonly projectRoot: string },
  relativePath: string
) =>
  ts.createSourceFile(
    path.join(context.projectRoot, relativePath),
    "",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
