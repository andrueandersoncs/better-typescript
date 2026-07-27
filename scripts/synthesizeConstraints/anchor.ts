import { Array, Equivalence, Function, HashMap, Option, Tuple, pipe } from "effect"

const strictEqualNumber = Equivalence.strictEqual<number>()
const emptyString = Function.constant("")
const emptySeenCounts = HashMap.empty<string, number>()
const strippable = /[^\p{L}\p{N}\p{Mn} _-]/gu
const whitespaceRuns = /\s+/gu
const linkTargetPattern = /\]\(#([^)]+)\)/gu
const headingTextPattern = /^#{1,6}[ \t]+(.+?)[ \t]*$/gmu

const countAt = (counts: HashMap.HashMap<string, number>, key: string) =>
  pipe(HashMap.get(counts, key), Option.getOrElse(Function.constant(0)))

// slugify matches GitHub because every cross-reference must target a decidable heading anchor.
export const slugify = (heading: string) => {
  const folded = heading.trim().toLowerCase()
  const stripped = folded.replace(strippable, "")

  return stripped.replace(whitespaceRuns, "-")
}

const disambiguatedAnchor = (base: string, priorCount: number) =>
  strictEqualNumber(priorCount, 0) ? base : `${base}-${priorCount}`

const assignNextAnchor = (seen: HashMap.HashMap<string, number>, heading: string) => {
  const base = slugify(heading)
  const priorCount = countAt(seen, base)
  const nextCount = priorCount + 1
  const nextSeen = HashMap.set(seen, base, nextCount)
  const anchor = disambiguatedAnchor(base, priorCount)

  return Tuple.make(nextSeen, anchor)
}

// assignAnchors walks document order because GitHub suffixes repeats by first-seen position.
export const assignAnchors = (headings: ReadonlyArray<string>) => {
  const accumulated = Array.mapAccum(headings, emptySeenCounts, assignNextAnchor)

  return Tuple.get(accumulated, 1)
}

const termAnchorEntry = (term: string, anchors: ReadonlyArray<string>, index: number) => {
  const key = term.toLowerCase()
  const maybeAnchor = Array.get(anchors, index)
  const fallback = slugify(term)
  const anchor = pipe(maybeAnchor, Option.getOrElse(Function.constant(fallback)))

  return Tuple.make(key, anchor)
}

const termAnchorEntries = (terms: ReadonlyArray<string>, anchors: ReadonlyArray<string>) =>
  Array.map(terms, (term, index) => termAnchorEntry(term, anchors, index))

// termAnchors keys by case-fold because the rest of the pipeline matches terms case-insensitively.
export const termAnchors = (terms: ReadonlyArray<string>) => {
  const anchors = assignAnchors(terms)
  const entries = termAnchorEntries(terms, anchors)

  return HashMap.fromIterable(entries)
}

const matchCapture = (match: RegExpExecArray) =>
  pipe(Array.get(match, 1), Option.getOrElse(emptyString))

// linkTargets keeps document order because audits compare rendered links positionally.
export const linkTargets = (markdown: string) => {
  const matches = markdown.matchAll(linkTargetPattern)
  const captured = Array.fromIterable(matches)

  return Array.map(captured, matchCapture)
}

// headingTexts keeps document order because anchor assignment follows heading appearance.
export const headingTexts = (markdown: string) => {
  const matches = markdown.matchAll(headingTextPattern)
  const captured = Array.fromIterable(matches)

  return Array.map(captured, matchCapture)
}
