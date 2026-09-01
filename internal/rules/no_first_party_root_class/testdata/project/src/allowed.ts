export class IntegratedRuntime extends Error {
  constructor() {
    super()
  }
  value = 1
}

export class StaticUtility {
  private constructor() {}
  static run() {}
  public static stop() {}
}

export class OverloadedUtility {
  private constructor() {}
  static format(value: string): string
  static format(value: number): string
  static format(value: string | number) {
    return String(value)
  }
}

export const ClassExpression = class {
  value = 1
}
