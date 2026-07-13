import {
  Tuple,
  Array,
  Function,
  HashMap,
  HashSet,
  MutableList,
  Option,
  Order,
  Predicate,
  Schema,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"

type CommentSyntaxKind =
  ts.SyntaxKind.SingleLineCommentTrivia | ts.SyntaxKind.MultiLineCommentTrivia

export type SourceComment = ts.CommentRange & {
  readonly kind: CommentSyntaxKind
}

const commentSyntaxKinds = HashSet.make(
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia
)

const byPosition: Order.Order<SourceComment> = pipe(
  Order.number,
  Order.mapInput(Struct.get("pos"))
)


const syntaxNodes = (sourceFile: ts.SourceFile): ReadonlyArray<ts.Node> => {
  const pending = MutableList.make<ts.Node>(sourceFile)

  const nextSyntaxNode = (): Option.Option<
    readonly [ts.Node, MutableList.MutableList<ts.Node>]
  > => {
    const shiftedNode = MutableList.shift(pending)
    const node = Option.fromNullable(shiftedNode)

    return Option.map(node, (current) => {
      const children = current.getChildren(sourceFile)

      const nextPending = Array.reduce(
        children,
        pending,
        (
          nodes: MutableList.MutableList<ts.Node>,
          child: ts.Node
        ): MutableList.MutableList<ts.Node> => MutableList.append(nodes, child)
      )

      return Tuple.make(current, nextPending)
    })
  }

  return Array.unfold(pending, nextSyntaxNode)
}

export const sourceComments = (
  sourceFile: ts.SourceFile
): ReadonlyArray<SourceComment> => {
  const nodes = syntaxNodes(sourceFile)
  const text = sourceFile.getFullText()

  const commentRangesAt = (node: ts.Node): ReadonlyArray<ts.CommentRange> => {
    const leading = ts.getLeadingCommentRanges(text, node.pos) ?? Array.empty()

    const trailing =
      ts.getTrailingCommentRanges(text, node.end) ?? Array.empty()

    return Array.appendAll(leading, trailing)
  }

  const ranges = Array.flatMap(nodes, commentRangesAt)
  const emptyComments = HashMap.empty<number, SourceComment>()

  const commentsByPosition = Array.reduce(
    ranges,
    emptyComments,
    (comments, range) =>
      HashSet.has(commentSyntaxKinds, range.kind)
        ? HashMap.set(comments, range.pos, range)
        : comments
  )

  return pipe(
    commentsByPosition,
    HashMap.values,
    Array.fromIterable,
    Array.sortBy(byPosition)
  )
}

const emptyString = Function.constant("")

const emptyModifiers: ReadonlyArray<ts.Modifier> = Array.empty()

const fallbackModifiers: Function.LazyArg<ReadonlyArray<ts.Modifier>> =
  Function.constant(emptyModifiers)

const emptyJsDocs: ReadonlyArray<ts.JSDoc> = Array.empty()

const fallbackJsDocs: Function.LazyArg<ReadonlyArray<ts.JSDoc>> =
  Function.constant(emptyJsDocs)

const isTsJsDoc = (input: unknown): input is ts.JSDoc =>
  Predicate.hasProperty(input, "kind")

const TsJsDoc = Schema.declare(isTsJsDoc).annotations({
  identifier: "ts.JSDoc"
})

const TsJsDocArray = Schema.Array(TsJsDoc)

const optionalJsDocs = Schema.optionalWith(TsJsDocArray, { as: "Option" })

const NodeJsDocsSchema = Schema.Struct({
  jsDoc: optionalJsDocs
})

const isStructuredJsDoc = (jsDoc: ts.JSDoc): boolean => {
  const description = pipe(
    Option.fromNullable(jsDoc.comment),
    Option.map((comment) => {
      const isString = typeof comment === "string"

      if (isString) {
        return comment
      }

      const rawText = ts.getTextOfJSDocComment(comment)

      return pipe(Option.fromNullable(rawText), Option.getOrElse(emptyString))
    }),
    Option.map((text) => text.trim()),
    Option.filter((text) => text.length > 0)
  )

  const hasDescription = Option.isSome(description)

  const tags = Option.fromNullable(jsDoc.tags)
  const hasTags = Option.exists(tags, (tagList) => tagList.length > 0)
  const conditions = Array.make(hasDescription, hasTags)

  return Array.every(conditions, Boolean)
}

const isExportModifier = (modifier: ts.Modifier): boolean => {
  const isExportKeyword = modifier.kind === ts.SyntaxKind.ExportKeyword
  const isDefaultKeyword = modifier.kind === ts.SyntaxKind.DefaultKeyword
  const conditions = Array.make(isExportKeyword, isDefaultKeyword)

  return Array.some(conditions, Boolean)
}

const isExportedApiNode = (node: ts.Node): boolean => {
  const modifiers = pipe(
    Option.gen(function* () {
      const nodeWithModifiers = yield* Option.liftPredicate(ts.canHaveModifiers)(
        node
      )

      const fromTs = ts.getModifiers(nodeWithModifiers)

      return yield* Option.fromNullable(fromTs)
    }),
    Option.getOrElse(fallbackModifiers)
  )

  const hasExportModifier = Array.some(modifiers, isExportModifier)

  const isVariableDeclaration = ts.isVariableDeclaration(node)
  const isVariableDeclarationList = ts.isVariableDeclarationList(node)
  const isVariableLike = isVariableDeclaration || isVariableDeclarationList

  const parentOption = Option.fromNullable(node.parent)

  const isClassLike = Option.exists(parentOption, ts.isClassLike)

  const isInterfaceDeclaration = Option.exists(
    parentOption,
    ts.isInterfaceDeclaration
  )

  const isEnumDeclaration = Option.exists(parentOption, ts.isEnumDeclaration)

  const isModuleDeclaration = Option.exists(
    parentOption,
    ts.isModuleDeclaration
  )

  const containerConditions = Array.make(
    isClassLike,
    isInterfaceDeclaration,
    isEnumDeclaration,
    isModuleDeclaration
  )

  const isContainer = Array.some(containerConditions, Boolean)

  const isObjectLiteral = Option.exists(
    parentOption,
    ts.isObjectLiteralExpression
  )

  const isPropertyAssignment = Option.exists(
    parentOption,
    ts.isPropertyAssignment
  )

  const isShorthandPropertyAssignment = Option.exists(
    parentOption,
    ts.isShorthandPropertyAssignment
  )

  const isSpreadAssignment = Option.exists(parentOption, ts.isSpreadAssignment)

  const memberConditions = Array.make(
    isPropertyAssignment,
    isShorthandPropertyAssignment,
    isSpreadAssignment
  )

  const isObjectLiteralMember = Array.some(memberConditions, Boolean)

  const viaVariable =
    isVariableLike && Option.exists(parentOption, isExportedApiNode)

  const viaContainer =
    isContainer && Option.exists(parentOption, isExportedApiNode)

  const viaObjectLiteral =
    isObjectLiteral &&
    pipe(
      parentOption,
      Option.flatMap((parent) => Option.fromNullable(parent.parent)),
      Option.exists(isExportedApiNode)
    )

  const viaMember =
    isObjectLiteralMember && Option.exists(parentOption, isExportedApiNode)

  const exportPaths = Array.make(
    hasExportModifier,
    viaVariable,
    viaContainer,
    viaObjectLiteral,
    viaMember
  )

  return Array.some(exportPaths, Boolean)
}

export const isJsDocComment = (sourceFile: ts.SourceFile) => {
  const nodes = syntaxNodes(sourceFile)
  const emptyPositions = HashSet.empty<number>()

  const positions = Array.reduce(nodes, emptyPositions, (current, node) => {
    const jsDocs = pipe(
      Schema.decodeUnknownOption(NodeJsDocsSchema)(node),
      Option.flatMap(Struct.get("jsDoc")),
      Option.getOrElse(fallbackJsDocs)
    )

    const hasJsDocs = jsDocs.length > 0
    const isDocumentingExport = hasJsDocs && isExportedApiNode(node)

    if (!isDocumentingExport) {
      return current
    }

    const structuredDocs = Array.filter(jsDocs, isStructuredJsDoc)

    return Array.reduce(structuredDocs, current, (set, doc) =>
      HashSet.add(set, doc.pos)
    )
  })

  const commentIsDocumentingJsDoc = (comment: SourceComment): boolean =>
    HashSet.has(positions, comment.pos)

  return commentIsDocumentingJsDoc
}

export const commentText =
  (text: string) =>
  (comment: SourceComment): string =>
    text.slice(comment.pos, comment.end)
