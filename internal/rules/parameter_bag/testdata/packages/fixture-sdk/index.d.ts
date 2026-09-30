export interface ParseOptions {
  readonly onExcessProperty: "error"
}

export interface SystemRequest {
  readonly model: string
}

export interface RequestOptions {
  readonly signal: AbortSignal
}

export declare function decodeUnknownEffect(
  input: unknown,
  options: ParseOptions,
): unknown

export declare class Client {
  systemOne(
    request: SystemRequest,
    options: RequestOptions,
  ): Promise<unknown>
}
