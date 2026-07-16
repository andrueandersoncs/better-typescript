export {}

function requiresBoth(isReady: boolean, hasAccess: boolean): string {
  if (isReady && hasAccess) { // ~detect 7
    return "allowed"
  }

  return "blocked"
}

function allowsEither(isReady: boolean, hasOverride: boolean): string {
  if (isReady || hasOverride) { // ~detect 7
    return "allowed"
  }

  return "blocked"
}

function unwrapsParenthesized(isReady: boolean, hasAccess: boolean): string {
  if (isReady && hasAccess) { // ~detect 7
    return "allowed"
  }

  return "blocked"
}
