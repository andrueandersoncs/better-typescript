import * as ts from "typescript"

// SeenTypes tracks recursion because TypeScript types can revisit compiler objects.
export type SeenTypes = ReadonlyArray<ts.Type>
