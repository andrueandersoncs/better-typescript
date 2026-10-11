/**
 * Supplemental contract safety-net for an upcoming refactor of @open-workflows/core.
 *
 * The existing dsl.test.ts / serial.test.ts (+ the two graph suites) already pin the bulk of the
 * observable contract: pure constructors, gen threading, the full encode/decode round-trip, prompt
 * + use-input templates, declarative steps, schema reconstruction, and boundary validation.
 *
 * This file adds the parts those suites DON'T isolate, all of which a careless rewrite could break
 * while keeping the others green:
 *
 *   1. SECURITY: decode()/jsonSchemaToSchema() consume untrusted JSON, so their kind/type dispatch
 *      must be immune to attacker-controlled keys (NOT a plain-object lookup that exposes a
 *      prototype-pollution surface). This is the explicit rejection reason for one prior rewrite.
 *   2. ENCODE BYTE-GUARDS: the optional-field guards in encode are intentionally MIXED — model /
 *      retry / idempotencyKey are TRUTHY-guarded (so "" / falsy drop) while maxTokens is
 *      `!== undefined`-guarded (so 0 survives). encode() output is byte-asserted by the contract.
 *   3. path.ts / cycle.ts: direct unit coverage of id allocation + the cycle guard, including the
 *      diamond-is-legal rule, which the graph suite only reaches end-to-end through graphOf.
 *   4. eraseWorkflow: identity-typed cast.
 *
 * Every assertion here is observable input→output behavior, not internal shape.
 */
import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  agent,
  enterScope,
  enterUse,
  eraseWorkflow,
  rootScope,
  rootUsePath,
  step,
  succeed,
  withIdempotencyKey,
  WorkflowCycleError,
  workflow,
} from "./index.js";
import { allocId } from "./path.js";
import { decode, encode, jsonSchemaToSchema, SerialError, type SerialWorkflow } from "./serial.js";

/* ====================================================================== */
/* 1. SECURITY: decode / jsonSchemaToSchema vs attacker-controlled keys    */
/* ====================================================================== */

describe("security — decode() kind dispatch is key-injection-proof (untrusted JSON)", () => {
  // The contract: dispatch on `s.kind` must be a switch (or otherwise immune), NEVER a plain-object
  // lookup table — `{__proto__: ..., constructor: ...}` access on a lookup map would resolve to
  // inherited Object members and silently decode an attacker payload instead of rejecting it.
  // Behaviorally: every one of these prototype-chain names must be rejected as an unknown kind.
  const pollutionKinds = [
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",
    "__defineGetter__",
  ];

  for (const kind of pollutionKinds) {
    it(`rejects body kind="${kind}" as an unknown node (does NOT resolve a prototype member)`, () => {
      const bad = { name: "x", body: { kind } } as unknown as SerialWorkflow;
      expect(() => decode(bad)).toThrow(SerialError);
    });

    it(`rejects kind="${kind}" nested deep in a forEach body too`, () => {
      const bad = {
        name: "x",
        body: { kind: "forEach", items: [1], body: { kind } },
      } as unknown as SerialWorkflow;
      expect(() => decode(bad)).toThrow(SerialError);
    });
  }

  it("decoding attacker payloads does not pollute Object.prototype", () => {
    // Run a batch of hostile shapes; none may leak onto the global prototype.
    const before = JSON.stringify(Object.getOwnPropertyNames(Object.prototype).sort());
    for (const kind of pollutionKinds) {
      try {
        decode({ name: "x", body: { kind } } as unknown as SerialWorkflow);
      } catch {
        /* expected */
      }
    }
    // a hand-crafted nested object carrying a __proto__ key as data must stay inert
    try {
      decode({
        name: "x",
        body: { kind: "pure", value: { __proto__: { polluted: true }, a: 1 } },
      } as unknown as SerialWorkflow).body(undefined);
    } catch {
      /* ignore */
    }
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // the prototype's own property set is unchanged
    expect(JSON.stringify(Object.getOwnPropertyNames(Object.prototype).sort())).toBe(before);
  });
});

describe("security — jsonSchemaToSchema type dispatch is key-injection-proof", () => {
  // `j.type` is attacker-controlled; the dispatch must be a switch whose default is Schema.Unknown.
  // A plain-object lookup keyed by j.type would resolve "constructor"/"toString" to inherited
  // members. Behaviorally: any prototype-name type degrades to "accept anything", never crashes,
  // never returns a function/garbage schema.
  const pollutionTypes = ["__proto__", "constructor", "prototype", "toString", "hasOwnProperty"];

  for (const type of pollutionTypes) {
    it(`type="${type}" degrades to Schema.Unknown (accepts anything, never throws)`, () => {
      const rebuilt = jsonSchemaToSchema({ type });
      // Schema.Unknown accepts every value; assert the accept-never-throw contract.
      expect(Schema.decodeUnknownSync(rebuilt)("anything")).toBe("anything");
      expect(Schema.decodeUnknownSync(rebuilt)(42)).toBe(42);
      expect(Schema.decodeUnknownSync(rebuilt)({ a: 1 })).toEqual({ a: 1 });
    });
  }

  it("an object schema with a __proto__ / constructor PROPERTY KEY does not pollute the prototype", () => {
    const rebuilt = jsonSchemaToSchema({
      type: "object",
      properties: {
        __proto__: { type: "string" },
        constructor: { type: "string" },
        polluted: { type: "string" },
      },
      required: ["polluted"],
    });
    // building it must not have written onto Object.prototype
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    // and the reconstructed schema is still a usable Schema (decoding a valid object works)
    expect(() => Schema.decodeUnknownSync(rebuilt)({ polluted: "ok" })).not.toThrow();
  });

  it("an enum carrying prototype-name members stays a literal union (no special-casing)", () => {
    const rebuilt = jsonSchemaToSchema({ enum: ["__proto__", "constructor", "x"] });
    expect(Schema.decodeUnknownSync(rebuilt)("__proto__")).toBe("__proto__");
    expect(Schema.decodeUnknownSync(rebuilt)("constructor")).toBe("constructor");
    expect(() => Schema.decodeUnknownSync(rebuilt)("not-a-member")).toThrow();
  });
});

/* ====================================================================== */
/* 2. ENCODE BYTE-GUARDS: mixed truthy vs !==undefined optional fields     */
/* ====================================================================== */

describe("encode — optional-field guards are MIXED by contract (byte-level)", () => {
  const encodeAgent = (opts: Parameters<typeof agent>[1]) =>
    encode(
      workflow("w", { payload: Schema.Unknown, success: Schema.Unknown }, () => agent("a", opts))
    ).body as Record<string, unknown>;

  it('drops model when "" (falsy → truthy-guarded)', () => {
    const b = encodeAgent({ prompt: "p", model: "" });
    expect("model" in b).toBe(false);
  });

  it("keeps model when a real string", () => {
    const b = encodeAgent({ prompt: "p", model: "fast" });
    expect(b.model).toBe("fast");
  });

  it("KEEPS maxTokens when 0 (the !==undefined guard — must NOT be normalized to truthy)", () => {
    const b = encodeAgent({ prompt: "p", maxTokens: 0 });
    expect("maxTokens" in b).toBe(true);
    expect(b.maxTokens).toBe(0);
  });

  it("keeps maxTokens when a positive number", () => {
    const b = encodeAgent({ prompt: "p", maxTokens: 512 });
    expect(b.maxTokens).toBe(512);
  });

  it("drops maxTokens when undefined (absent)", () => {
    const b = encodeAgent({ prompt: "p" });
    expect("maxTokens" in b).toBe(false);
  });

  it('drops idempotencyKey when "" on a step (truthy-guarded)', () => {
    const b = encode(
      workflow("w", { payload: Schema.Unknown, success: Schema.Unknown }, () =>
        step("s", { fake: 1 }).pipe(withIdempotencyKey(""))
      )
    ).body as Record<string, unknown>;
    expect("idempotencyKey" in b).toBe(false);
  });

  it("a fully-static agent prompt carries NO template field (byte-identical to template-free)", () => {
    const b = encodeAgent({ prompt: "totally static" });
    expect("template" in b).toBe(false);
    expect(b.prompt).toBe("totally static");
  });

  it("the encoded workflow is JSON.stringify-able (no functions survive)", () => {
    const wf = workflow("w", { payload: Schema.Unknown, success: Schema.Unknown }, () =>
      agent("a", { prompt: "p", maxTokens: 0, model: "" })
    );
    const s = encode(wf);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

/* ====================================================================== */
/* 3. path.ts — id allocation (dedup within scope, fresh per scope)        */
/* ====================================================================== */

describe("path.ts — allocId / enterScope (path-qualified ids)", () => {
  it("first occurrence is bare; repeats get #2, #3 within one scope", () => {
    const s = rootScope("wf");
    expect(allocId(s, "n")).toBe("wf/n");
    expect(allocId(s, "n")).toBe("wf/n#2");
    expect(allocId(s, "n")).toBe("wf/n#3");
  });

  it("distinct names in the same scope don't collide", () => {
    const s = rootScope("wf");
    expect(allocId(s, "a")).toBe("wf/a");
    expect(allocId(s, "b")).toBe("wf/b");
  });

  it("a nested scope prefixes the segment and restarts dedup counting", () => {
    const root = rootScope("wf");
    allocId(root, "n"); // wf/n
    const child = enterScope(root, "seg");
    // child gets its own counter — `n` is bare again under the new prefix
    expect(allocId(child, "n")).toBe("wf/seg/n");
    expect(allocId(child, "m")).toBe("wf/seg/m");
    expect(allocId(child, "m")).toBe("wf/seg/m#2");
  });

  it("sibling scopes are independent (no cross-scope dedup leakage)", () => {
    const root = rootScope("wf");
    const a = enterScope(root, "A");
    const b = enterScope(root, "B");
    expect(allocId(a, "x")).toBe("wf/A/x");
    expect(allocId(b, "x")).toBe("wf/B/x"); // bare again, not #2
  });
});

/* ====================================================================== */
/* 4. cycle.ts — use-composition cycle guard + diamond legality            */
/* ====================================================================== */

describe("cycle.ts — enterUse / WorkflowCycleError", () => {
  const walk = (names: ReadonlyArray<string>) => {
    let p = rootUsePath(names[0]!);
    for (const n of names.slice(1)) p = enterUse(p, n);
    return p;
  };

  it("a chain of distinct names is allowed (A → B → C)", () => {
    expect(() => walk(["A", "B", "C"])).not.toThrow();
    expect(walk(["A", "B", "C"]).names).toEqual(["A", "B", "C"]);
  });

  it("self-recursion (A → A) throws WorkflowCycleError with the offending chain", () => {
    expect(() => walk(["A", "A"])).toThrow(WorkflowCycleError);
    try {
      walk(["A", "A"]);
    } catch (e) {
      expect((e as WorkflowCycleError).chain).toEqual(["A", "A"]);
    }
  });

  it("mutual recursion (A → B → A) throws with the full loop chain", () => {
    try {
      walk(["A", "B", "A"]);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(WorkflowCycleError);
      expect((e as WorkflowCycleError).chain).toEqual(["A", "B", "A"]);
    }
  });

  it("a name re-appearing several levels up is still a cycle (A → B → C → A)", () => {
    expect(() => walk(["A", "B", "C", "A"])).toThrow(WorkflowCycleError);
  });

  it("siblings on the SAME path don't collide — a diamond is legal (immutability of UsePath)", () => {
    // enterUse returns a NEW path, so two `use(B)` under the same parent never see each other.
    const root = rootUsePath("A");
    const left = enterUse(root, "B");
    const right = enterUse(root, "B"); // must NOT throw — different branch, same level
    expect(left.names).toEqual(["A", "B"]);
    expect(right.names).toEqual(["A", "B"]);
    // and the parent path is unmutated
    expect(root.names).toEqual(["A"]);
  });
});

/* ====================================================================== */
/* 5. eraseWorkflow — identity-typed cast                                  */
/* ====================================================================== */

describe("eraseWorkflow — identity at runtime", () => {
  it("returns the SAME object reference (a typed cast, not a copy)", () => {
    const def = workflow(
      "w",
      { payload: Schema.Struct({ dir: Schema.String }), success: Schema.String },
      ({ dir }) => succeed(dir)
    );
    expect(eraseWorkflow(def)).toBe(def);
    // all observable fields are preserved (same reference ⇒ trivially, but assert the contract)
    expect(eraseWorkflow(def).name).toBe("w");
    expect(typeof eraseWorkflow(def).body).toBe("function");
  });
});
