import {
  Array,
  Equivalence,
  Function,
  HashMap,
  HashSet,
  Option,
  Order,
  String as EffectString,
  pipe
} from "effect"

const strictEqualNumber = Equivalence.strictEqual<number>()
const emptyUnlinked = Array.empty<string>()
const emptyString = Function.constant("")
const whitespacePattern = /\s+/gu
const escapePattern = /[.*+?^${}()|[\]\\]/gu
const stripEsPattern = /es$/u
const stripSPattern = /s$/u
const anyWhitespace = "\\s+"
const pluralSuffix = "(?:e?s)?"
const protectedAlternation = "(`+)[\\s\\S]*?\\1|\\[[^\\]]*\\]\\([^)]*\\)"
const wordBoundary = "\\b"
const ascendingNumber = Order.Number
const descendingNumber = Order.flip(ascendingNumber)
const descendingLength = Order.mapInput(descendingNumber, EffectString.length)
const termOrder = Order.combine(descendingLength, Order.String)

const escapeRegExp = (value: string) => value.replace(escapePattern, "\\$&")

const termPattern = (term: string) => {
  const trimmed = term.trim()
  const escaped = escapeRegExp(trimmed)
  const pieces = escaped.split(whitespacePattern)

  return Array.join(pieces, anyWhitespace)
}

const sortedTerms = (terms: ReadonlyArray<string>) => Array.sort(terms, termOrder)

const termAlternation = (terms: ReadonlyArray<string>) => {
  const ordered = sortedTerms(terms)
  const patterns = Array.map(ordered, termPattern)

  return Array.join(patterns, "|")
}

const linkingPattern = (terms: ReadonlyArray<string>) => {
  const alternation = termAlternation(terms)
  const termGroup = `${wordBoundary}(?:${alternation})${pluralSuffix}${wordBoundary}`
  const source = `${protectedAlternation}|${termGroup}`

  return new RegExp(source, "giu")
}

const normalizeFound = (found: string) => {
  const collapsed = found.replace(whitespacePattern, " ")

  return collapsed.toLowerCase()
}

const stripEs = (value: string) => value.replace(stripEsPattern, "")

const stripS = (value: string) => value.replace(stripSPattern, "")

const anchorFor = (anchors: HashMap.HashMap<string, string>, found: string) => {
  const normalized = normalizeFound(found)
  const withoutEs = stripEs(normalized)
  const withoutS = stripS(normalized)
  const direct = HashMap.get(anchors, normalized)
  const esMatch = HashMap.get(anchors, withoutEs)
  const sMatch = HashMap.get(anchors, withoutS)
  const fallbackEs = Function.constant(esMatch)
  const withEs = pipe(direct, Option.orElse(fallbackEs))
  const fallbackS = Function.constant(sMatch)

  return pipe(withEs, Option.orElse(fallbackS))
}

const isSelfTerm = (selfTerm: Option.Option<string>) => (term: string) => {
  const folded = pipe(
    selfTerm,
    Option.map((value) => value.toLowerCase())
  )

  return Option.contains(folded, term)
}

const isForeignTerm = (selfTerm: Option.Option<string>) => (term: string) => {
  const matchesSelf = isSelfTerm(selfTerm)(term)

  return !matchesSelf
}

const linkingTerms = (
  anchors: HashMap.HashMap<string, string>,
  selfTerm: Option.Option<string>
) => {
  const keys = HashMap.keys(anchors)
  const terms = Array.fromIterable(keys)
  const keep = isForeignTerm(selfTerm)

  return Array.filter(terms, keep)
}

const makeLink = (found: string) => (anchor: string) => `[${found}](#${anchor})`

const linkedText = (anchors: HashMap.HashMap<string, string>, found: string) => {
  const maybeAnchor = anchorFor(anchors, found)
  const link = makeLink(found)
  const linked = pipe(maybeAnchor, Option.map(link))
  const keepFound = Function.constant(found)

  return pipe(linked, Option.getOrElse(keepFound))
}

const replaceMatch = (anchors: HashMap.HashMap<string, string>) => (found: string) =>
  linkedText(anchors, found)

// linkTerms inserts glossary anchors because agents write plain prose.
export const linkTerms =
  (anchors: HashMap.HashMap<string, string>, selfTerm: Option.Option<string>) =>
  (prose: string) => {
    const terms = linkingTerms(anchors, selfTerm)
    const hasNoTerms = strictEqualNumber(terms.length, 0)

    if (hasNoTerms) {
      return prose
    }

    const pattern = linkingPattern(terms)
    const replace = replaceMatch(anchors)

    return prose.replace(pattern, replace)
  }

const matchText = (match: RegExpExecArray) =>
  pipe(Array.get(match, 0), Option.getOrElse(emptyString))

const unlinkedNormalized = (anchors: HashMap.HashMap<string, string>) => (found: string) => {
  const maybeAnchor = anchorFor(anchors, found)
  const normalized = normalizeFound(found)

  return pipe(maybeAnchor, Option.as(normalized))
}

// unlinkedTerms lists bare glossary terms because the audit turns linking gaps into findings.
export const unlinkedTerms =
  (anchors: HashMap.HashMap<string, string>, selfTerm: Option.Option<string>) =>
  (prose: string) => {
    const terms = linkingTerms(anchors, selfTerm)
    const hasNoTerms = strictEqualNumber(terms.length, 0)

    if (hasNoTerms) {
      return emptyUnlinked
    }

    const pattern = linkingPattern(terms)
    const matches = prose.matchAll(pattern)
    const captured = Array.fromIterable(matches)
    const texts = Array.map(captured, matchText)
    const normalize = unlinkedNormalized(anchors)
    const options = Array.map(texts, normalize)
    const linked = Array.getSomes(options)
    const unique = HashSet.fromIterable(linked)
    const list = Array.fromIterable(unique)

    return Array.sort(list, Order.String)
  }
