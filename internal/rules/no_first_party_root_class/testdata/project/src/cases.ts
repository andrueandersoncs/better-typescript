const makeLayer = (filename: string) => filename
export class SqliteBunRuntime {
  constructor(readonly filename: string) {}
  get layer() {
    return makeLayer(this.filename)
  }
}
interface Runtime {}
export class ImplementsOnly implements Runtime {}
export class Empty {}
export class MissingPrivateConstructor {
  static run() {}
}
export class PrivateConstructorOnly {
  private constructor() {}
}
export class PublicConstructor {
  constructor() {}
  static run() {}
}
export class ProtectedConstructor {
  protected constructor() {}
  static run() {}
}
export class StaticField {
  private constructor() {}
  static value = 1
  static run() {}
}
export class InstanceMethod {
  private constructor() {}
  static run() {}
  execute() {}
}
export class PrivateStaticMethod {
  private constructor() {}
  private static run() {}
}
export class HashPrivateStaticMethod {
  private constructor() {}
  static #run() {}
}
export class InheritedPrivateMethod extends Error {
  private run() {}
}
export class InheritedHashPrivateMethod extends Error {
  #run() {}
}
export class ParameterProperty {
  private constructor(private readonly value: string) {
    void value
  }
  static create(value: string) {
    return new ParameterProperty(value)
  }
}
