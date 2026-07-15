import {
  Array,
  Effect,
  Function,
  HashSet,
  Iterable,
  Match,
  Option,
  Ref,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { astNodesIn } from "@better-typescript/core/engine/sources"
import { LatestCacheEntry, SourceComment } from "./commentsData.js"

const memoizeLatest = <Key extends object, Value>(load: (key: Key) => Value) => {
  const emptyCache = Option.none<LatestCacheEntry<Key, Value>>()
  const cache = Ref.unsafeMake(emptyCache)

  const memoized = (key: Key): Value => {
    const readOrLoad = (
      cached: Option.Option<LatestCacheEntry<Key, Value>>
    ): readonly [Value, Option.Option<LatestCacheEntry<Key, Value>>] => {
      const current = pipe(
        cached,
        Option.filter((entry) => entry.key === key)
      )

      if (Option.isSome(current)) {
        const value = current.value.value

        return Tuple.make(value, cached)
      }

      const value = load(key)
      const entry = new LatestCacheEntry({ key, value })
      const updated = Option.some(entry)

      return Tuple.make(value, updated)
    }

    const cachedValue = Ref.modify(cache, readOrLoad)

    return Effect.runSync(cachedValue)
  }

  return memoized
}

const commentSyntaxKinds = HashSet.make(
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia
)

const isCommentToken = (scanner: ts.Scanner): boolean => {
  const kind = scanner.getToken()

  return HashSet.has(commentSyntaxKinds, kind)
}

const sourceCommentFrom = (scanner: ts.Scanner): SourceComment => {
  const kind = scanner.getToken()
  const pos = scanner.getTokenStart()
  const end = scanner.getTokenEnd()

  return new SourceComment({ kind, pos, end })
}

const scanSourceComments = (sourceFile: ts.SourceFile): ReadonlyArray<SourceComment> => {
  const sourceText = sourceFile.getFullText()

  const scanner = ts.createScanner(
    sourceFile.languageVersion,
    false,
    sourceFile.languageVariant,
    sourceText
  )

  const tokens = Iterable.unfold<ts.Scanner, ts.Scanner>(scanner, (current) => {
    const kind = current.scan()

    if (kind === ts.SyntaxKind.EndOfFileToken) {
      return Option.none()
    }

    const entry = Tuple.make(current, current)

    return Option.some(entry)
  })

  return pipe(
    tokens,
    Iterable.filter(isCommentToken),
    Iterable.map(sourceCommentFrom),
    Array.fromIterable
  )
}

export const sourceComments: (sourceFile: ts.SourceFile) => ReadonlyArray<SourceComment> =
  memoizeLatest(scanSourceComments)

const emptyString = Function.constant("")

const commentFragmentsText: (comment: ts.NodeArray<ts.JSDocComment>) => string = flow(
  ts.getTextOfJSDocComment,
  Option.fromNullable,
  Option.getOrElse(emptyString)
)

const stringDescription = (comment: string): string => comment

const commentDescription: (comment: NonNullable<ts.JSDoc["comment"]>) => string = pipe(
  Match.type<NonNullable<ts.JSDoc["comment"]>>(),
  Match.withReturnType<string>(),
  Match.when(Match.string, stringDescription),
  Match.orElse(commentFragmentsText)
)

const hasNonBlankText = (text: string): boolean => text.trim().length > 0

const hasJsDocTags = (tags: ts.NodeArray<ts.JSDocTag>): boolean => tags.length > 0

const isStructuredJsDoc = (jsDoc: ts.JSDoc): boolean => {
  const hasDescription = pipe(
    Option.fromNullable(jsDoc.comment),
    Option.map(commentDescription),
    Option.exists(hasNonBlankText)
  )

  const hasTags = pipe(Option.fromNullable(jsDoc.tags), Option.exists(hasJsDocTags))

  return hasDescription && hasTags
}

const emptyModifiers: ReadonlyArray<ts.Modifier> = Array.empty()
const fallbackModifiers = Function.constant(emptyModifiers)
const optionalModifiers = flow(ts.getModifiers, Option.fromNullable)

const modifiersOf = (node: ts.Node): ReadonlyArray<ts.Modifier> =>
  pipe(
    node,
    Option.liftPredicate(ts.canHaveModifiers),
    Option.flatMap(optionalModifiers),
    Option.getOrElse(fallbackModifiers)
  )

const isExportModifier = (modifier: ts.Modifier): boolean => {
  const isExportKeyword = modifier.kind === ts.SyntaxKind.ExportKeyword
  const isDefaultKeyword = modifier.kind === ts.SyntaxKind.DefaultKeyword

  return isExportKeyword || isDefaultKeyword
}

const hasExportModifier = flow(modifiersOf, Array.some(isExportModifier))

const currentKindsThatFollowParent = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.VariableDeclarationList
)

const parentKindsThatFollowParent = HashSet.make(
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment,
  ts.SyntaxKind.SpreadAssignment
)

const parentFollowsExportPath = (node: ts.Node): boolean =>
  HashSet.has(parentKindsThatFollowParent, node.kind)

const exportNodeStep = (current: ts.Node) => {
  const parent = Option.fromNullable(current.parent)

  const currentFollowsParent = HashSet.has(currentKindsThatFollowParent, current.kind)

  const parentFollowsParent = Option.exists(parent, parentFollowsExportPath)
  const followsParent = currentFollowsParent || parentFollowsParent
  const directParent = followsParent ? parent : Option.none<ts.Node>()

  const objectParent = pipe(
    parent,
    Option.filter(ts.isObjectLiteralExpression),
    Option.map(Struct.get("parent")),
    Option.flatMap(Option.fromNullable)
  )

  const useObjectParent = Function.constant(objectParent)
  const next = pipe(directParent, Option.orElse(useObjectParent))

  return Tuple.make(current, next)
}

const isExportedApiNode = (node: ts.Node): boolean => {
  const initial = Option.some(node)

  const candidates = Iterable.unfold<Option.Option<ts.Node>, ts.Node>(
    initial,
    Option.map(exportNodeStep)
  )

  return Iterable.some(candidates, hasExportModifier)
}

const collectStructuredJsDocPositions = (sourceFile: ts.SourceFile): HashSet.HashSet<number> => {
  const nodes = astNodesIn(sourceFile)
  const initial = HashSet.empty<number>()

  return Iterable.reduce(nodes, initial, (current, node) => {
    const commentsAndTags = ts.getJSDocCommentsAndTags(node)
    const jsDocs = Array.filter(commentsAndTags, ts.isJSDoc)

    if (jsDocs.length === 0) {
      return current
    }

    const candidate = Option.some(node)
    const exported = pipe(candidate, Option.filter(isExportedApiNode))

    if (Option.isNone(exported)) {
      return current
    }

    const structured = Array.filter(jsDocs, isStructuredJsDoc)

    return Array.reduce(structured, current, (set, doc) => HashSet.add(set, doc.pos))
  })
}

const structuredJsDocPositions: (sourceFile: ts.SourceFile) => HashSet.HashSet<number> =
  memoizeLatest(collectStructuredJsDocPositions)

const commentAtPosition =
  (positions: HashSet.HashSet<number>) =>
  (comment: SourceComment): boolean =>
    HashSet.has(positions, comment.pos)

export const isJsDocComment = flow(structuredJsDocPositions, commentAtPosition)

export const commentText =
  (text: string) =>
  (comment: SourceComment): string =>
    text.slice(comment.pos, comment.end)
