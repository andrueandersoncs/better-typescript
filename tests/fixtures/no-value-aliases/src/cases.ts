import { Function, Order } from "effect"

const source = () => true
const localAlias = source
const propertyAlias = Order.String
export const exportedAlias = Function.identity

const typedAlias: Order.Order<string> = Order.String

const nested = () => {
  const nestedAlias = source
  return nestedAlias()
}

void localAlias
void propertyAlias
void typedAlias
void nested
