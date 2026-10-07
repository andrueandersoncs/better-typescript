type Review = {
  id: string
  hasAuthor: boolean
  hasBody: boolean
  hasModeratorApproval: boolean
  hasFlaggedWords: boolean
}

export function reviewState(review: Review): string {
  if (!review.hasAuthor || !review.hasBody) {
    return "incomplete"
  }

  if (review.hasFlaggedWords) {
    return "blocked"
  }

  if (review.hasModeratorApproval) {
    return "visible"
  }

  return "pending"
}

export function canDisplay(review: Review): boolean {
  return review.hasAuthor && review.hasBody && review.hasModeratorApproval && !review.hasFlaggedWords
}
