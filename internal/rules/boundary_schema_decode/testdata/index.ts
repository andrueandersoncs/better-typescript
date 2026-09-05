import { decodeUnknownEffect as decode, type Schema } from "effect/Schema"

interface Person {
  readonly name: string
}

declare const input: string
declare function decodeUnknownEffect(value: unknown): Person
declare const PersonSchema: Schema<Person>

const parsed: Person = JSON.parse(input) as Person

async function readRequest(request: Request) {
  const person: Person = (await request.json()) as Person
  return person
}

async function aliasedRequest(request: Request) {
  const body = request
  const person: Person = (await body.json()) as Person
  return person
}


function decodedSameValue() {
  const raw: unknown = JSON.parse(input)
  return decode(PersonSchema)(raw)
}
function unrelatedDecoder() {
  const raw = JSON.parse(input)
  const ignored = decodeUnknownEffect(JSON.parse(input))
  return raw as Person
}

function shadowed() {
  const JSON = { parse: (_value: string): unknown => ({ name: "Ada" }) }
  return JSON.parse(input) as Person
}

function unrelated() {
  const request = { json: (): unknown => ({ name: "Ada" }) }
  return request.json() as Person
}

async function responseBoundary(response: Response) {
  return (await response.json()) as Person
}

function rawAdapter(): unknown {
  return JSON.parse(input)
}

function typedReturn(): Person {
  return JSON.parse(input)
}
