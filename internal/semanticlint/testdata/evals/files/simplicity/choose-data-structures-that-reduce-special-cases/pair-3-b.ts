type Review = {
  id: string
  status: "incomplete" | "pending" | "blocked" | "visible"
}

const labels = {
  incomplete: "incomplete",
  pending: "pending",
  blocked: "blocked",
  visible: "visible",
} as const

export function reviewState(review: Review): string {
  return labels[review.status]
}

export function canDisplay(review: Review): boolean {
  return review.status === "visible"
}

export function block(review: Review): Review {
  return { ...review, status: "blocked" }
}
