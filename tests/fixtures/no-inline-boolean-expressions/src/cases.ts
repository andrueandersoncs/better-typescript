export {}

function requiresBoth(isReady: boolean, hasAccess: boolean): string {
  if (isReady && hasAccess) {
    return "allowed"
  }

  return "blocked"
}

function allowsEither(isReady: boolean, hasOverride: boolean): string {
  if (isReady || hasOverride) {
    return "allowed"
  }

  return "blocked"
}

function unwrapsParenthesized(isReady: boolean, hasAccess: boolean): string {
  if ((isReady && hasAccess)) {
    return "allowed"
  }

  return "blocked"
}

function ignoresExtractedCondition(isReady: boolean, hasAccess: boolean): string {
  const shouldAllow = isReady && hasAccess

  if (shouldAllow) {
    return "allowed"
  }

  return "blocked"
}

function ignoresSingleCondition(isReady: boolean): string {
  if (isReady) {
    return "ready"
  }

  return "waiting"
}

function ignoresComparison(count: number): string {
  if (count > 0) {
    return "positive"
  }

  return "empty"
}
