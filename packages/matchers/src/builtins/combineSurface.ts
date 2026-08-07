import { InterfaceBurdenData } from "./interfaceBurdenData.js"

export const combineSurface = (left: InterfaceBurdenData, right: InterfaceBurdenData) =>
  InterfaceBurdenData.make({
    operationCount: left.operationCount + right.operationCount,
    requiredParameterCount: left.requiredParameterCount + right.requiredParameterCount
  })
