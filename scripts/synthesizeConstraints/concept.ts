import * as fs from "node:fs"
import * as path from "node:path"
import { Effect, Equivalence, Function, Option, pipe } from "effect"
import { Concept, ConceptArgumentError, DocumentReadError } from "./data.ts"

const stringEqual = Equivalence.strictEqual<string>()

const emptyString = ""

const atPrefix = "@"

const kebabSlug = (value: string) => {
  const normalized = value.normalize("NFKD")
  const dashed = normalized.replace(/[^\p{L}\p{N}]+/gu, "-")
  const stripped = dashed.replace(/^-+|-+$/gu, "")

  return stripped.toLowerCase()
}

const headingFromMatch = (match: RegExpMatchArray) => Option.fromNullishOr(match[1])

const firstHeading = (markdown: string) => {
  const matched = markdown.match(/^#[ \t]+(.+?)[ \t]*$/mu)
  const groups = Option.fromNullishOr(matched)

  return pipe(groups, Option.flatMap(headingFromMatch))
}

const makeConcept = Effect.fn("Concept.makeConcept")(function* (
  outputDirectory: string,
  name: string,
  request: string
) {
  const slug = kebabSlug(name)
  const unusableSlug = stringEqual(slug, emptyString)

  if (unusableSlug) {
    const quotedName = JSON.stringify(name)
    const message = `Concept ${quotedName} yields no usable slug.`

    return yield* new ConceptArgumentError({ message })
  }

  const title = `${name} constraints`
  const fileName = `${slug}-constraints.md`
  const outputPath = path.join(outputDirectory, fileName)

  return Concept.make({
    name,
    title,
    slug,
    request,
    outputPath
  })
})

const readDocumentBody = (documentPath: string) =>
  Effect.try({
    try: () => fs.readFileSync(documentPath, "utf8"),
    catch: () =>
      new DocumentReadError({
        documentPath,
        message: `Unable to read document: ${documentPath}`
      })
  })

const resolveDocumentArgument = Effect.fn("Concept.resolveDocumentArgument")(function* (
  outputDirectory: string,
  documentPath: string
) {
  const body = yield* readDocumentBody(documentPath)
  const heading = firstHeading(body)
  const extension = path.extname(documentPath)
  const basename = path.basename(documentPath, extension)
  const fallbackName = Function.constant(basename)
  const name = Option.getOrElse(heading, fallbackName)
  const request = `${name}\n\n${body}`

  return yield* makeConcept(outputDirectory, name, request)
})

export const resolveConcept = (outputDirectory: string) =>
  Effect.fn("Concept.resolveConcept")(function* (argument: string) {
    const trimmed = argument.trim()
    const missingArgument = stringEqual(trimmed, emptyString)

    if (missingArgument) {
      return yield* new ConceptArgumentError({
        message: "A concept, goal, or @document argument is required."
      })
    }

    const documentArgument = trimmed.startsWith(atPrefix)

    if (documentArgument) {
      const documentPath = trimmed.slice(1)

      return yield* resolveDocumentArgument(outputDirectory, documentPath)
    }

    return yield* makeConcept(outputDirectory, trimmed, trimmed)
  })
