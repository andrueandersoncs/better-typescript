export interface Provider {
  readonly generate: (prompt: string) => Promise<string>
}

export const readText = async (
  provider: Provider,
  prompt: string,
): Promise<string> => provider.generate(prompt)
