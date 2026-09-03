const makeLayer = (filename: string) => filename
export class SqliteBunRuntime {
  private constructor() {}
  static sqlClient(filename: string) {
    return makeLayer(filename)
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

const Named = class Root {}
const Anonymous = class {}

declare const Schema: any
declare const AgentPolicyFields: any
export class AgentPolicy extends Schema.Class<AgentPolicy>("AgentPolicy")(AgentPolicyFields) {
  static resolve(): AgentPolicy {
    return AgentPolicy.make({})
  }

  static override make(input: unknown): AgentPolicy {
    return super.make(input)
  }
}

export class StatefulAgentPolicy extends Schema.Class<StatefulAgentPolicy>("StatefulAgentPolicy")(AgentPolicyFields) {
  resolve(): StatefulAgentPolicy {
    return this
  }
}

export class ErrorWithOverride extends Error {
  override toString(): string {
    return super.toString()
  }
}
