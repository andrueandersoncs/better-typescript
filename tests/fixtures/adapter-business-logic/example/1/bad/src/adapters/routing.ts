export const chooseRoute = (priority: number): string => {
  if (priority > 10) {
    return "express"
  }

  if (priority > 5) {
    return "priority"
  }

  return "standard"
}

export const chooseWarehouse = (stock: number): string => {
  if (stock <= 0) {
    return "backup"
  }

  return "primary"
}
