import { Stream } from "effect"

declare const bytes: ReadableStream<Uint8Array>
declare const framedMessages: ReadableStream<Uint8Array>
declare const options: TextDecodeOptions
const decoder = new TextDecoder()
declare const ambientDecoder: TextDecoder

export async function streaming() {
  const response = await fetch("/bytes")
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk, { stream: true })))
}
export async function ambientDecoderBoundary() {
  const response = await fetch("/bytes")
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => ambientDecoder.decode(chunk)))
}


export const unknownReadable = Stream.fromReadableStream({ evaluate: () => bytes, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk)))
export const framedReadable = Stream.fromReadableStream({ evaluate: () => framedMessages, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk, { stream: false })))
const framedResponse = new Response(framedMessages)
export const framedResponseBody = Stream.fromReadableStream({ evaluate: () => framedResponse.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk)))

export async function dynamicOptions() {
  const response = await fetch("/bytes")
  const stream = false
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk, { stream })))
}

export async function laterSpread() {
  const response = await fetch("/bytes")
  const options: TextDecodeOptions = { stream: true }
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk, { stream: true, ...options })))
}
export async function overriddenEvaluate() {
  const response = await fetch("/bytes")
  const override: { evaluate?: () => ReadableStream<Uint8Array> } = { evaluate: () => framedMessages }
  return Stream.fromReadableStream({ evaluate: () => response.body!, onError: (cause) => new Error(String(cause)), ...override }).pipe(Stream.map((chunk: Uint8Array) => decoder.decode(chunk)))
}


export const completeBuffer = new TextDecoder().decode(await new Response(bytes).arrayBuffer())
const frames = [new Uint8Array([0xE2])]
export const completeFrames = frames.map((frame) => decoder.decode(frame))
class FramedDecoder {
  decode(chunk: Uint8Array): string {
    return String(chunk.byteLength)
  }
}
const framed = new FramedDecoder()
export const customDecoder = Stream.fromReadableStream({ evaluate: () => bytes, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => framed.decode(chunk)))
export const shadowedDecoder = (TextDecoder: new () => { decode(chunk: Uint8Array): string }) =>
  Stream.fromReadableStream({ evaluate: () => bytes, onError: (cause) => new Error(String(cause)) }).pipe(Stream.map((chunk: Uint8Array) => new TextDecoder().decode(chunk)))
