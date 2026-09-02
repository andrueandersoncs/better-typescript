export class IntegratedRuntime extends Error {
  constructor() {
    super()
  }
  value = 1
}

export class DerivedUtility extends Error {
  static run() {}
}

export const DerivedExpression = class extends Error {
  value = 1
}

const sqlClient = (filename: string) => filename

export const SqliteBunRuntime = {
  sqlClient,
}
