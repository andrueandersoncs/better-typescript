import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { buildScopeGraph } from "../src/schema-scope"
import type { ScopeDeclaration } from "../src/scope-types"

const declaration = (symbol: string, source: string, path = "src/domain/model.ts"): ScopeDeclaration => ({
  definition: { id: `code.${symbol}`, label: symbol, category: "Schema", fileId: path, relativePath: path, symbol, scope: "Model" },
  source,
})

const leafSource = "export const Leaf = Schema.Struct({ value: Schema.String })"
const pairSource = "export const Pair = Schema.Struct({ left: Leaf, right: Leaf })"

describe("schema scope interpretation", () => {
  it("keeps shared references distinct from merely compatible types", async () => {
    const Leaf = Schema.Struct({ value: Schema.String })
    const Lookalike = Schema.Struct({ value: Schema.String })
    const Pair = Schema.Struct({ left: Leaf, right: Schema.optionalKey(Leaf) })
    const graph = await buildScopeGraph([], [
      declaration("Leaf", leafSource),
      declaration("Lookalike", leafSource.replaceAll("Leaf", "Lookalike")),
      declaration("Pair", "export const Pair = Schema.Struct({ left: Leaf, right: Schema.optionalKey(Leaf) })"),
    ], async () => ({ Leaf, Lookalike, Pair }))
    const pair = graph.nodes.find((node) => node.id === "code.Pair")!
    expect(pair.proposed?.schema?.fields.map((field) => field.referenceIds)).toEqual([["code.Leaf"], ["code.Leaf"]])
    expect(graph.connections.filter((edge) => edge.from === "code.Pair" && edge.kind === "schema").map((edge) => edge.to)).toEqual(["code.Leaf"])
  })

  it("represents recursive structure and both sides of a codec", async () => {
    interface Category { readonly name: string; readonly children: ReadonlyArray<Category> }
    const Category: Schema.Codec<Category> = Schema.Struct({ name: Schema.String, children: Schema.Array(Schema.suspend(() => Category)) })
    const Amount = Schema.NumberFromString
    const Invoice = Schema.Struct({ amount: Amount })
    const graph = await buildScopeGraph([], [
      declaration("Category", "export const Category = Schema.Struct({ name: Schema.String, children: Schema.Array(Schema.suspend(() => Category)) })"),
      declaration("Amount", "export const Amount = Schema.NumberFromString"),
      declaration("Invoice", "export const Invoice = Schema.Struct({ amount: Amount })"),
    ], async () => ({ Category, Amount, Invoice }))
    const category = graph.nodes.find((node) => node.id === "code.Category")!
    expect(category.proposed?.schema?.fields.find((field) => field.name === "children")?.referenceIds).toContain("code.Category")
    expect(graph.connections.some((edge) => edge.from === "code.Category" && edge.to === "code.Category" && edge.kind === "schema")).toBe(true)
    const amount = graph.nodes.find((node) => node.id === "code.Amount")!.proposed!.schema!
    expect(amount.kind).toBe("Number")
    expect(amount.encoded?.kind).toBe("String")
    const invoice = graph.nodes.find((node) => node.id === "code.Invoice")!.proposed!.schema!
    expect(invoice.encoded?.fields[0].type).toBe("string")
  })

  it("detects shared-schema changes even when the containing declaration is unchanged", async () => {
    const oldLeaf = Schema.Struct({ value: Schema.String })
    const Leaf = Schema.Struct({ value: Schema.optionalKey(Schema.String) })
    const before = [declaration("Leaf", leafSource, "src/current/model.ts"), declaration("Pair", pairSource, "src/current/model.ts"), declaration("Retired", "export const Retired = Schema.Boolean", "src/current/model.ts")]
    const after = [declaration("Leaf", "export const Leaf = Schema.Struct({ value: Schema.optionalKey(Schema.String) })"), declaration("Pair", pairSource), declaration("Added", "export const Added = Schema.Number")]
    const graph = await buildScopeGraph(before, after, async (path) => path.includes("/current/")
      ? { Leaf: oldLeaf, Pair: Schema.Struct({ left: oldLeaf, right: oldLeaf }), Retired: Schema.Boolean }
      : { Leaf, Pair: Schema.Struct({ left: Leaf, right: Leaf }), Added: Schema.Number })
    expect(graph.nodes.find((node) => node.id === "code.Pair")?.change).toBe("modified")
    expect(graph.nodes.find((node) => node.id === "code.Retired")?.change).toBe("removed")
    expect(graph.nodes.find((node) => node.id === "code.Added")?.change).toBe("added")
    const leaf = graph.nodes.find((node) => node.id === "code.Leaf")!
    expect(leaf.current?.schema?.fields[0].optional).toBe(false)
    expect(leaf.proposed?.schema?.fields[0].optional).toBe(true)
  })

  it("propagates mutability and nominal brand changes through shared schemas", async () => {
    const before = [declaration("Leaf", leafSource, "src/current/model.ts"), declaration("Pair", pairSource, "src/current/model.ts")]
    const after = [declaration("Leaf", leafSource), declaration("Pair", pairSource)]
    for (const [oldValue, newValue, expectedConstraint] of [
      [Schema.String, Schema.mutableKey(Schema.String), undefined],
      [Schema.String.pipe(Schema.brand("UserId")), Schema.String.pipe(Schema.brand("AccountId")), 'brand "AccountId"'],
    ] as const) {
      const graph = await buildScopeGraph(before, after, async (path) => {
        const Leaf = Schema.Struct({ value: path.includes("/current/") ? oldValue : newValue })
        return { Leaf, Pair: Schema.Struct({ left: Leaf, right: Leaf }) }
      })
      expect(graph.nodes.find((node) => node.id === "code.Pair")?.change).toBe("modified")
      const field = graph.nodes.find((node) => node.id === "code.Leaf")!.proposed!.schema!.fields[0]
      if (expectedConstraint) expect(field.constraints).toContain(expectedConstraint)
      else expect(field.mutable).toBe(true)
    }
  })
})
