import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SchemaAST from "effect/SchemaAST"
import type { CodeDefinition } from "./review-types"
import type {
  SchemaFieldView,
  SchemaView,
  ScopeConnection,
  ScopeDeclaration,
  ScopeGraph,
  ScopeModuleLoader,
  ScopeNode,
  ScopeVersion
} from "./scope-types"

type Version = "current" | "proposed"
type Ast = SchemaAST.AST

// Effect beta.107 exports this identity hook but omits its internal declaration.
const contextOwner = (SchemaAST as typeof SchemaAST & { getContextOwner(ast: Ast): Ast }).getContextOwner
const brandsOf = SchemaAST.resolveAt<ReadonlyArray<string>>("brands")

type SchemaEntry = {
  readonly declaration: ScopeDeclaration
  readonly schema?: SchemaView
  readonly fingerprint?: string
}

type CompiledVersion = {
  readonly schemas: ReadonlyMap<string, SchemaEntry>
  readonly connections: ReadonlyMap<string, ScopeConnection>
}

const primitives: Readonly<Record<string, string>> = {
  Null: "null",
  Undefined: "undefined",
  Void: "void",
  Never: "never",
  Unknown: "unknown",
  Any: "any",
  String: "string",
  Number: "number",
  Boolean: "boolean",
  BigInt: "bigint",
  Symbol: "symbol",
  ObjectKeyword: "object"
}

const literal = (value: unknown): string => {
  if (typeof value === "bigint") return `${value}n`
  if (typeof value === "symbol") return value.toString()
  if (value === undefined) return "undefined"
  return JSON.stringify(value) ?? String(value)
}

const errorMessage = (error: unknown): string => Predicate.isError(error) ? error.message : String(error)

const checkConstraints = (check: SchemaAST.Check<any>): ReadonlyArray<string> => {
  if (check._tag === "FilterGroup") return check.checks.flatMap(checkConstraints)
  const representation = check.annotations?.representation
  if (representation === undefined) return [typeof check.annotations?.expected === "string" ? check.annotations.expected : "Custom check (opaque)"]
  const name = representation.id.split("/").at(-1)?.replace(/^is/, "") ?? representation.id
  return representation.payload === null ? [name] : [`${name}(${JSON.stringify(representation.payload)})`]
}

const constraints = (ast: Ast): ReadonlyArray<string> => [
  ...(brandsOf(ast)?.map((brand) => `brand ${literal(brand)}`) ?? []),
  ...(ast.checks?.flatMap(checkConstraints) ?? []),
  ...(ast.encoding?.map((link) => `codec: ${link.transformation._tag}`) ?? [])
]

class SchemaInspector {
  readonly #owners = new WeakMap<object, ReadonlySet<string>>()
  readonly #suspends = new WeakMap<object, Ast | undefined>()
  readonly #declarations: ReadonlyMap<string, ScopeDeclaration>
  readonly #version: Version
  readonly #issues: Set<string>

  constructor(
    roots: ReadonlyMap<string, Ast>,
    declarations: ReadonlyMap<string, ScopeDeclaration>,
    version: Version,
    issues: Set<string>
  ) {
    this.#declarations = declarations
    this.#version = version
    this.#issues = issues
    for (const [id, root] of roots) {
      const owner = contextOwner(root)
      this.#owners.set(owner, new Set([...(this.#owners.get(owner) ?? []), id]))
    }
  }

  view(root: Ast): SchemaView {
    return this.#view(root)
  }

  fingerprint(root: Ast): string {
    const seen = new WeakMap<object, number>()
    let next = 0
    const check = (value: SchemaAST.Check<any>): string => value._tag === "FilterGroup"
      ? `group(${value.checks.map(check).join(",")})`
      : `filter(${value.annotations?.representation?.id ?? value.annotations?.expected ?? "opaque"},${literal(value.annotations?.representation?.payload)},${(value.annotations?.representation?.schemas ?? []).map(visit).join(",")})`
    const visit = (ast: Ast): string => {
      const prior = seen.get(ast)
      if (prior !== undefined) return `@${prior}`
      seen.set(ast, next++)
      const base = `${ast._tag}[mutable:${ast.context?.isMutable ?? false}][brands:${brandsOf(ast)?.map(literal).join(",") ?? ""}][${(ast.checks ?? []).map(check).join(",")}][${(ast.encoding ?? []).map((link) => `${link.transformation._tag}:${visit(link.to)}`).join(",")}]`
      if (SchemaAST.isDeclaration(ast)) return `${base}(${ast.typeParameters.map(visit).join(",")})`
      if (SchemaAST.isLiteral(ast)) return `${base}(${literal(ast.literal)})`
      if (SchemaAST.isUniqueSymbol(ast)) return `${base}(${ast.symbol.toString()})`
      if (SchemaAST.isEnum(ast)) return `${base}(${ast.enums.map(([name, value]) => `${name}:${literal(value)}`).join(",")})`
      if (SchemaAST.isTemplateLiteral(ast)) return `${base}(${ast.parts.map(visit).join(",")})`
      if (SchemaAST.isArrays(ast)) return `${base}(${ast.isMutable};${ast.elements.map((element) => `${SchemaAST.isOptional(element)}:${visit(element)}`).join(",")};${ast.rest.map(visit).join(",")})`
      if (SchemaAST.isObjects(ast)) return `${base}(${ast.propertySignatures.map((property) => `${String(property.name)}:${SchemaAST.isOptional(property.type)}:${visit(property.type)}`).join(",")};${ast.indexSignatures.map((index) => `${visit(index.parameter)}:${visit(index.type)}`).join(",")})`
      if (SchemaAST.isUnion(ast)) return `${base}(${ast.mode};${ast.types.map(visit).join(",")})`
      if (SchemaAST.isSuspend(ast)) {
        const resolved = this.#suspend(ast)
        return `${base}(${resolved === undefined ? "unresolved" : visit(resolved)})`
      }
      return base
    }
    return visit(root)
  }

  references(root: Ast): ReadonlyMap<string, ReadonlySet<string>> {
    const found = new Map<string, Set<string>>()
    const seen = new Set<object>()
    const visit = (ast: Ast, label: string): void => {
      const owners = this.#ownerIds(ast)
      if (owners.size > 0) {
        for (const id of owners) {
          const labels = found.get(id) ?? new Set<string>()
          labels.add(label)
          found.set(id, labels)
        }
        return
      }
      if (seen.has(ast)) return
      seen.add(ast)
      this.#children(ast, visit)
    }
    this.#children(root, visit)
    return found
  }

  #view(ast: Ast, includeEncoded = true): SchemaView {
    const encoded = includeEncoded ? this.#encoded(ast) : undefined
    return {
      kind: ast._tag,
      summary: this.#summary(ast, new Set(), false),
      fields: this.#fields(ast),
      constraints: constraints(ast),
      ...(encoded === undefined ? undefined : { encoded })
    }
  }

  #encoded(ast: Ast): SchemaView | undefined {
    let hasEncoding = false
    const seen = new Set<Ast>()
    const visit = (node: Ast): void => {
      if (hasEncoding || seen.has(node)) return
      seen.add(node)
      if (node.encoding) hasEncoding = true
      else this.#children(node, visit)
    }
    visit(ast)
    return hasEncoding ? this.#view(SchemaAST.toEncoded(ast), false) : undefined
  }

  #fields(ast: Ast): ReadonlyArray<SchemaFieldView> {
    if (SchemaAST.isObjects(ast)) {
      return [
        ...ast.propertySignatures.map((property) => this.#field(String(property.name), property.type)),
        ...ast.indexSignatures.map((index) => this.#field(`[key: ${this.#summary(index.parameter, new Set())}]`, index.type))
      ]
    }
    if (SchemaAST.isArrays(ast)) {
      return [
        ...ast.elements.map((element, index) => this.#field(`[${index}]`, element)),
        ...ast.rest.map((element, index) => this.#field(ast.elements.length === 0 && index === 0 ? "item" : index === 0 ? "...items" : `[tail ${index}]`, element))
      ]
    }
    if (SchemaAST.isUnion(ast)) return ast.types.map((type, index) => this.#field(`alternative ${index + 1}`, type))
    if (SchemaAST.isDeclaration(ast)) return ast.typeParameters.map((type, index) => this.#field(`type parameter ${index + 1}`, type))
    if (SchemaAST.isTemplateLiteral(ast)) return ast.parts.map((part, index) => this.#field(`part ${index + 1}`, part))
    if (SchemaAST.isSuspend(ast)) {
      const resolved = this.#suspend(ast)
      return resolved === undefined ? [] : [this.#field("lazy value", resolved)]
    }
    return []
  }

  #field(name: string, type: Ast): SchemaFieldView {
    return {
      name,
      type: this.#summary(type, new Set()),
      optional: SchemaAST.isOptional(type),
      mutable: type.context?.isMutable ?? false,
      constraints: constraints(type),
      referenceIds: [...this.#referenceIds(type)].sort()
    }
  }

  #referenceIds(root: Ast): ReadonlySet<string> {
    const found = new Set<string>()
    const seen = new Set<object>()
    const visit = (ast: Ast): void => {
      const owners = this.#ownerIds(ast)
      if (owners.size > 0) {
        for (const id of owners) found.add(id)
        return
      }
      if (seen.has(ast)) return
      seen.add(ast)
      this.#children(ast, (child) => visit(child))
    }
    visit(root)
    return found
  }

  #children(ast: Ast, visit: (ast: Ast, label: string) => void): void {
    const checks = (check: SchemaAST.Check<any>): void => {
      if (check._tag === "FilterGroup") {
        for (const child of check.checks) checks(child)
      } else {
        for (const schema of check.annotations?.representation?.schemas ?? []) visit(schema, "constraint")
      }
    }
    for (const check of ast.checks ?? []) checks(check)
    for (const link of ast.encoding ?? []) visit(link.to, "encoded")
    if (SchemaAST.isDeclaration(ast)) {
      for (const parameter of ast.typeParameters) visit(parameter, "type parameter")
    } else if (SchemaAST.isTemplateLiteral(ast)) {
      for (const part of ast.parts) visit(part, "template part")
    } else if (SchemaAST.isArrays(ast)) {
      for (const element of [...ast.elements, ...ast.rest]) visit(element, "item")
    } else if (SchemaAST.isObjects(ast)) {
      for (const property of ast.propertySignatures) visit(property.type, String(property.name))
      for (const index of ast.indexSignatures) {
        visit(index.parameter, "index key")
        visit(index.type, "index value")
      }
    } else if (SchemaAST.isUnion(ast)) {
      for (const type of ast.types) visit(type, "alternative")
    } else if (SchemaAST.isSuspend(ast)) {
      const resolved = this.#suspend(ast)
      if (resolved !== undefined) visit(resolved, "lazy")
    }
  }

  #summary(ast: Ast, seen: ReadonlySet<object>, resolveOwner: boolean = true): string {
    const owners = resolveOwner ? this.#ownerIds(ast) : new Set<string>()
    if (owners.size > 0) return [...owners].map((id) => this.#declarations.get(id)?.definition.label ?? id).sort().join(" | ")
    if (seen.has(ast)) return "recursive"
    const next = new Set([...seen, ast])
    if (ast._tag in primitives) return primitives[ast._tag]
    if (SchemaAST.isLiteral(ast)) return literal(ast.literal)
    if (SchemaAST.isUniqueSymbol(ast)) return ast.symbol.toString()
    if (SchemaAST.isEnum(ast)) return ast.enums.map(([, value]) => literal(value)).join(" | ") || "enum"
    if (SchemaAST.isDeclaration(ast)) return typeof ast.annotations?.expected === "string" ? ast.annotations.expected : "declaration"
    if (SchemaAST.isTemplateLiteral(ast)) return `\`${ast.parts.map((part) => this.#summary(part, next)).join("")}\``
    if (SchemaAST.isArrays(ast)) {
      const elements = ast.elements.map((element) => `${this.#summary(element, next)}${SchemaAST.isOptional(element) ? "?" : ""}`)
      const rest = ast.rest.map((element, index) => index === 0 ? `...${this.#summary(element, next)}[]` : this.#summary(element, next))
      return elements.length === 0 && rest.length === 1
        ? `${ast.isMutable ? "" : "readonly "}Array<${this.#summary(ast.rest[0], next)}>`
        : `${ast.isMutable ? "" : "readonly "}[${[...elements, ...rest].join(", ")}]`
    }
    if (SchemaAST.isObjects(ast)) {
      const fields = ast.propertySignatures.map((property) => `${String(property.name)}${SchemaAST.isOptional(property.type) ? "?" : ""}: ${this.#summary(property.type, next)}`)
      return fields.length === 0 ? "object" : `{ ${fields.join("; ")} }`
    }
    if (SchemaAST.isUnion(ast)) return ast.types.map((type) => this.#summary(type, next)).join(" | ") || "never"
    if (SchemaAST.isSuspend(ast)) {
      const resolved = this.#suspend(ast)
      return resolved === undefined ? "lazy schema" : `lazy ${this.#summary(resolved, next)}`
    }
    return ast._tag
  }

  #ownerIds(ast: Ast): ReadonlySet<string> {
    const direct = this.#owners.get(contextOwner(ast))
    if (direct !== undefined) return direct
    if (!SchemaAST.isSuspend(ast)) return new Set()
    const resolved = this.#suspend(ast)
    return resolved === undefined ? new Set() : this.#owners.get(contextOwner(resolved)) ?? new Set()
  }

  #suspend(ast: SchemaAST.Suspend): Ast | undefined {
    const cached = this.#suspends.get(ast)
    if (cached !== undefined || this.#suspends.has(ast)) return cached
    try {
      const resolved = ast.thunk()
      this.#suspends.set(ast, resolved)
      return resolved
    } catch (error) {
      this.#issues.add(`${this.#version} schema inspection: could not resolve a lazy schema: ${errorMessage(error)}`)
      this.#suspends.set(ast, undefined)
      return undefined
    }
  }
}

const isSchemaDefinition = (declaration: ScopeDeclaration): boolean =>
  declaration.definition.category === "Schema" || declaration.definition.category === "Error"

const metadata = ({ id: _id, fileId: _fileId, relativePath: _relativePath, rationale: _rationale, ...definition }: CodeDefinition): string => JSON.stringify(definition)

const versionOf = (entry: SchemaEntry | undefined): ScopeVersion | undefined => entry === undefined
  ? undefined
  : {
    label: entry.declaration.definition.label,
    category: entry.declaration.definition.category,
    scope: entry.declaration.definition.scope ?? "Context",
    relativePath: entry.declaration.definition.relativePath,
    source: entry.declaration.source,
    ...(entry.schema === undefined ? undefined : { schema: entry.schema })
  }

const nodeChange = (current: SchemaEntry | undefined, proposed: SchemaEntry | undefined): ScopeNode["change"] => {
  if (current === undefined) return "added"
  if (proposed === undefined) return "removed"
  return current.declaration.source === proposed.declaration.source &&
      metadata(current.declaration.definition) === metadata(proposed.declaration.definition) &&
      current.fingerprint === proposed.fingerprint
    ? "unchanged"
    : "modified"
}

const edge = (from: string, to: string, kind: ScopeConnection["kind"], label: string): ScopeConnection =>
  ({ id: `${kind}:${from}:${to}`, from, to, kind, label, change: "unchanged" })

const edgeChange = (current: ScopeConnection | undefined, proposed: ScopeConnection | undefined): ScopeConnection["change"] => {
  if (current === undefined) return "added"
  if (proposed === undefined) return "removed"
  return current.label === proposed.label ? "unchanged" : "modified"
}

const compile = async (
  version: Version,
  declarations: ReadonlyArray<ScopeDeclaration>,
  load: (path: string) => Promise<Record<string, unknown>>,
  issues: Set<string>
): Promise<CompiledVersion> => {
  const indexed = new Map<string, ScopeDeclaration>()
  for (const declaration of declarations) {
    if (indexed.has(declaration.definition.id)) {
      issues.add(`${version} inventory declares '${declaration.definition.id}' more than once`)
    } else {
      indexed.set(declaration.definition.id, declaration)
    }
  }

  const roots = new Map<string, Ast>()
  for (const [id, declaration] of indexed) {
    if (!isSchemaDefinition(declaration)) continue
    const definition = declaration.definition
    try {
      const module = await load(definition.relativePath)
      const exported = module[definition.symbol]
      if (!Schema.isSchema(exported) || !SchemaAST.isAST(exported.ast)) {
        issues.add(`${version} ${id}: '${definition.symbol}' does not export an interpretable Effect Schema AST`)
      } else {
        roots.set(id, exported.ast)
      }
    } catch (error) {
      issues.add(`${version} ${id}: could not load '${definition.relativePath}': ${errorMessage(error)}`)
    }
  }

  const inspector = new SchemaInspector(roots, indexed, version, issues)
  const schemas = new Map<string, SchemaEntry>()
  for (const [id, declaration] of indexed) {
    const ast = roots.get(id)
    schemas.set(id, {
      declaration,
      ...(ast === undefined ? undefined : { schema: inspector.view(ast), fingerprint: inspector.fingerprint(ast) })
    })
  }

  const connections = new Map<string, ScopeConnection>()
  const add = (candidate: ScopeConnection): void => {
    const prior = connections.get(candidate.id)
    connections.set(candidate.id, prior === undefined || prior.label === candidate.label
      ? candidate
      : { ...candidate, label: [prior.label, candidate.label].sort().join(", ") })
  }
  for (const [id, declaration] of indexed) {
    const definition = declaration.definition
    for (const dependency of new Set(definition.dependencyIds ?? [])) {
      if (!indexed.has(dependency)) issues.add(`${version} ${id}: dependency '${dependency}' is not in this inventory`)
      else add(edge(id, dependency, "dependency", "depends on"))
    }
    if (definition.category === "EffectfulFunction") {
      const contracts: ReadonlyArray<readonly [ScopeConnection["kind"], ReadonlyArray<string>, string]> = [
        ["input", definition.contract.inputSchemaIds, "input"],
        ["success", [definition.contract.successSchemaId], "success"],
        ["error", definition.contract.errorIds, "error"],
        ["service", definition.contract.serviceIds, "service"]
      ]
      for (const [kind, targets, label] of contracts) {
        for (const target of targets) {
          if (!indexed.has(target)) issues.add(`${version} ${id}: ${label} '${target}' is not in this inventory`)
          else add(edge(id, target, kind, label))
        }
      }
    }
    const root = roots.get(id)
    if (root !== undefined) {
      for (const [target, labels] of inspector.references(root)) {
        add(edge(id, target, "schema", [...labels].sort().join(", ")))
      }
    }
  }
  for (const connection of connections.values()) {
    if (connection.kind !== "dependency") connections.delete(`dependency:${connection.from}:${connection.to}`)
  }
  return { schemas, connections }
}

/** Builds a diffable scope graph from declared contracts and Effect Schema ASTs. */
export const buildScopeGraph = async (
  current: ReadonlyArray<ScopeDeclaration>,
  proposed: ReadonlyArray<ScopeDeclaration>,
  loadModule: ScopeModuleLoader
): Promise<ScopeGraph> => {
  const issues = new Set<string>()
  const modules = new Map<string, Promise<Record<string, unknown>>>()
  const load = (relativePath: string): Promise<Record<string, unknown>> => {
    let module = modules.get(relativePath)
    if (module === undefined) {
      module = Promise.resolve().then(() => loadModule(relativePath))
      modules.set(relativePath, module)
    }
    return module
  }
  const [currentGraph, proposedGraph] = await Promise.all([
    compile("current", current, load, issues),
    compile("proposed", proposed, load, issues)
  ])

  const ids = new Set([...currentGraph.schemas.keys(), ...proposedGraph.schemas.keys()])
  const nodes = [...ids].sort().map((id): ScopeNode => {
    const currentEntry = currentGraph.schemas.get(id)
    const proposedEntry = proposedGraph.schemas.get(id)
    const definition = proposedEntry?.declaration.definition ?? currentEntry!.declaration.definition
    return {
      id,
      label: definition.label,
      category: definition.category,
      scope: definition.scope ?? "Context",
      change: nodeChange(currentEntry, proposedEntry),
      ...(definition.rationale === undefined ? undefined : { rationale: definition.rationale }),
      ...(currentEntry === undefined ? undefined : { current: versionOf(currentEntry) }),
      ...(proposedEntry === undefined ? undefined : { proposed: versionOf(proposedEntry) })
    }
  })

  const edgeIds = new Set([...currentGraph.connections.keys(), ...proposedGraph.connections.keys()])
  const connections = [...edgeIds].sort().map((id): ScopeConnection => {
    const currentEdge = currentGraph.connections.get(id)
    const proposedEdge = proposedGraph.connections.get(id)
    return { ...(proposedEdge ?? currentEdge!), change: edgeChange(currentEdge, proposedEdge), currentLabel: currentEdge?.label, proposedLabel: proposedEdge?.label }
  })

  return { nodes, connections, issues: [...issues].sort() }
}
