import { Function, Order } from "effect"

const source = () => true
const localAlias = source // ~detect 7
const propertyAlias = Order.String // ~detect 7
export const exportedAlias = Function.identity // ~detect 14

const typedAlias: Order.Order<string> = Order.String // ~detect 7

const nested = () => {
  const nestedAlias = source // ~detect 9
  return nestedAlias()
}

void localAlias
void propertyAlias
void typedAlias
void nested
