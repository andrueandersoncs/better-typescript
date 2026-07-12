import {
  Array,
  HashMap,
  HashSet,
  MutableList,
  Option,
  Order,
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
const jsDocPrefix = "/**"

const byPosition: Order.Order<SourceComment> = pipe(
  Order.number,
  Order.mapInput(Struct.get("pos"))
)

export const isSourceComment = (
  range: ts.CommentRange
): range is SourceComment => HashSet.has(commentSyntaxKinds, range.kind)

export const sourceComments = (
  sourceFile: ts.SourceFile
): ReadonlyArray<SourceComment> => {
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

      return [current, nextPending]
    })
  }
  const nodes = Array.unfold(pending, nextSyntaxNode)
  const text = sourceFile.getFullText()
  const commentRangesAt = (node: ts.Node): ReadonlyArray<ts.CommentRange> => {
    const leading = ts.getLeadingCommentRanges(text, node.pos) ?? []
    const trailing = ts.getTrailingCommentRanges(text, node.end) ?? []

    return Array.appendAll(leading, trailing)
  }
  const ranges = Array.flatMap(nodes, commentRangesAt)
  const emptyComments = HashMap.empty<number, SourceComment>()
  const commentsByPosition = Array.reduce(
    ranges,
    emptyComments,
    (comments, range) =>
      isSourceComment(range)
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

export const isJsDocComment =
  (text: string) =>
  (comment: SourceComment): boolean => {
    const startsWithJsDoc = text.startsWith(jsDocPrefix, comment.pos)
    const hasJsDocBody = text.charAt(comment.pos + jsDocPrefix.length) !== "/"

    return [startsWithJsDoc, hasJsDocBody].every(Boolean)
  }

export const commentText =
  (text: string) =>
  (comment: SourceComment): string =>
    text.slice(comment.pos, comment.end)
