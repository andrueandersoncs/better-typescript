import { chooseRoute, chooseWarehouse } from "../domain/routing.js"

export const routeOrder = (priority: number, stock: number): string =>
  `${chooseRoute(priority)}:${chooseWarehouse(stock)}`
