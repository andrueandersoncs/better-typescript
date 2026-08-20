export {}

function ignoresExtractedCondition(
  isReady: boolean,
  hasAccess: boolean
): string {
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
