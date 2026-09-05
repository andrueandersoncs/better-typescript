export declare const ScopeTypeId: unique symbol

export interface Scope {
  readonly [ScopeTypeId]: typeof ScopeTypeId
}
