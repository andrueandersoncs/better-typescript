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
