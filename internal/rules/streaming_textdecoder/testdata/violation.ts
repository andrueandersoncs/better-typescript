import { Stream, Stream as S } from "effect"

const decoder = new TextDecoder()

export async function missing() {
  const response = await fetch("/bytes")
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk)))
}

export async function falseOption() {
  const response = await fetch("/bytes")
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk, { stream: false })))
}

export async function fresh() {
  const response = await fetch("/bytes")
  return S.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(S.map((chunk: Uint8Array) => new TextDecoder().decode(chunk, { stream: true })))
}
