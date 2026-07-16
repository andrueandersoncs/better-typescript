export const decideOrder = (available: number, amount: number): "accept" | "reject" => {
  if (available <= 0 || amount > 100) {
    return "reject"
  }

  return "accept"
}
