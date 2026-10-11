import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { module as object } from "../object.ts";

describe("object", () => {
  describe("get", () => {
    it.effect("should return the value of a key in an object", () =>
      Effect.gen(function* () {
        const result = yield* object.get({ a: 1 }, "a");
        expect(result).toEqual(1);
      })
    );
    it.effect(
      "should fail with NotAnObjectError when obj is not an object",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(object.get("not an object", "key"));
          expect(error._tag).toBe("NotAnObjectError");
          if (error._tag === "NotAnObjectError") {
            expect(error.actual).toBe("not an object");
          }
        })
    );
    it.effect("should return undefined for missing keys", () =>
      Effect.gen(function* () {
        const result = yield* object.get({ a: 1 }, "b");
        expect(result).toBeUndefined();
      })
    );
  });

  describe("get-path", () => {
    it.effect("should get nested value using dot notation", () =>
      Effect.gen(function* () {
        const obj = { a: { b: { c: 42 } } };
        const result = yield* object["get-path"](obj, "a.b.c");
        expect(result).toEqual(42);
      })
    );
    it.effect("should get value at first level", () =>
      Effect.gen(function* () {
        const obj = { a: 1 };
        const result = yield* object["get-path"](obj, "a");
        expect(result).toEqual(1);
      })
    );
    it.effect(
      "should fail with NotAnObjectError when obj is not an object",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            object["get-path"]("not an object", "path")
          );
          expect(error._tag).toBe("NotAnObjectError");
          if (error._tag === "NotAnObjectError") {
            expect(error.actual).toBe("not an object");
          }
        })
    );
    it.effect(
      "should fail with PathTraversalError when intermediate value is not an object",
      () =>
        Effect.gen(function* () {
          const obj = { a: "not an object" };
          const error = yield* Effect.flip(object["get-path"](obj, "a.b"));
          expect(error._tag).toBe("PathTraversalError");
          if (error._tag === "PathTraversalError") {
            expect(error.path).toBe("a.b");
            expect(error.key).toBe("b");
            expect(error.current).toBe("not an object");
          }
        })
    );
    it.effect("should fail with KeyNotFoundError when key does not exist", () =>
      Effect.gen(function* () {
        const obj = { a: {} };
        const error = yield* Effect.flip(object["get-path"](obj, "a.b"));
        expect(error._tag).toBe("KeyNotFoundError");
        if (error._tag === "KeyNotFoundError") {
          expect(error.key).toBe("b");
        }
      })
    );
    it.effect("should access array elements using numeric keys", () =>
      Effect.gen(function* () {
        const obj = { items: ["a", "b", "c"] };
        const result = yield* object["get-path"](obj, "items.0");
        expect(result).toBe("a");
      })
    );
    it.effect("should access nested properties within array elements", () =>
      Effect.gen(function* () {
        const obj = { users: [{ name: "Alice" }, { name: "Bob" }] };
        const result = yield* object["get-path"](obj, "users.1.name");
        expect(result).toBe("Bob");
      })
    );
    it.effect(
      "should fail with IndexOutOfBoundsError for out of bounds array index",
      () =>
        Effect.gen(function* () {
          const obj = { items: ["a", "b"] };
          const error = yield* Effect.flip(object["get-path"](obj, "items.5"));
          expect(error._tag).toBe("IndexOutOfBoundsError");
          if (error._tag === "IndexOutOfBoundsError") {
            expect(error.index).toBe(5);
            expect(error.length).toBe(2);
          }
        })
    );
    it.effect(
      "should handle negative array indices as object keys (not array access)",
      () =>
        Effect.gen(function* () {
          const obj = { items: { "-1": "negative" } };
          const result = yield* object["get-path"](obj, "items.-1");
          expect(result).toBe("negative");
        })
    );
    it.effect("should access deep array nesting", () =>
      Effect.gen(function* () {
        const obj = {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        };
        const result = yield* object["get-path"](obj, "matrix.1.0");
        expect(result).toBe(3);
      })
    );
  });

  describe("json-stringify", () => {
    it.effect("should stringify an object", () =>
      Effect.gen(function* () {
        const obj = { a: 1, b: 2 };
        const result = yield* object["json-stringify"](obj, null, 2);
        expect(result).toBe(JSON.stringify(obj, null, 2));
      })
    );
  });

  describe("keys", () => {
    it.effect("should return the keys of an object", () =>
      Effect.gen(function* () {
        const result = yield* object.keys({ a: 1, b: 2 });
        expect(result).toEqual(["a", "b"]);
      })
    );
    it.effect("should return empty array for empty object", () =>
      Effect.gen(function* () {
        const result = yield* object.keys({});
        expect(result).toEqual([]);
      })
    );
  });

  describe("values", () => {
    it.effect("should return the values of an object", () =>
      Effect.gen(function* () {
        const result = yield* object.values({ a: 1, b: 2 });
        expect(result).toEqual([1, 2]);
      })
    );
    it.effect("should return empty array for empty object", () =>
      Effect.gen(function* () {
        const result = yield* object.values({});
        expect(result).toEqual([]);
      })
    );
  });

  describe("new", () => {
    it.effect("should create a new instance of a class", () =>
      Effect.gen(function* () {
        const Person = class {
          constructor(name: string) {
            this.name = name;
          }
          name: string;
        };
        const result = yield* object.new(Person, "John");
        expect(result).toEqual({ name: "John" });
        expect(result).toBeInstanceOf(Person);
      })
    );
    it.effect(
      "should fail with NotAConstructorError when classRef is not a function",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(object.new("not a function", "arg"));
          expect(error._tag).toBe("NotAConstructorError");
          if (error._tag === "NotAConstructorError") {
            expect(error.actual).toBe("not a function");
          }
        })
    );
    it.effect("should create instance with multiple constructor args", () =>
      Effect.gen(function* () {
        const Point = class {
          constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
          }
          x: number;
          y: number;
        };
        const result = yield* object.new(Point, 10, 20);
        expect(result).toEqual({ x: 10, y: 20 });
      })
    );
  });

  describe("get-method", () => {
    it.effect("should get a method from an object", () =>
      Effect.gen(function* () {
        const obj = {
          method: () => "hello",
        };
        const method = yield* object["get-method"](obj, "method");
        const result = method();
        expect(result).toEqual("hello");
      })
    );
    it.effect(
      "should fail with NotAnObjectError when obj is not an object",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            object["get-method"]("not an object", "method")
          );
          expect(error._tag).toBe("NotAnObjectError");
        })
    );
    it.effect(
      "should fail with NotAFunctionError when method is not a function",
      () =>
        Effect.gen(function* () {
          const obj = { notAMethod: "just a string" };
          const error = yield* Effect.flip(
            object["get-method"](obj, "notAMethod")
          );
          expect(error._tag).toBe("NotAFunctionError");
          if (error._tag === "NotAFunctionError") {
            expect(error.key).toBe("notAMethod");
            expect(error.actual).toBe("just a string");
          }
        })
    );
    it.effect("should bind this correctly when calling method", () =>
      Effect.gen(function* () {
        const obj = {
          value: 42,
          method() {
            return this.value;
          },
        };
        const boundMethod = yield* object["get-method"](obj, "method");
        expect(boundMethod()).toBe(42);
      })
    );
  });

  describe("call-method", () => {
    it.effect("should call a method on an object", () =>
      Effect.gen(function* () {
        const propertyValue = "some value";
        const obj = {
          property: propertyValue,
          method() {
            return this.property;
          },
        };
        const result = yield* object["call-method"](obj, "method");
        expect(result).toEqual(propertyValue);
      })
    );
    it.effect("should call method with arguments", () =>
      Effect.gen(function* () {
        const obj = {
          add(a: number, b: number) {
            return a + b;
          },
        };
        const result = yield* object["call-method"](obj, "add", 5, 10);
        expect(result).toBe(15);
      })
    );
    it.effect(
      "should fail with NotAFunctionError when target is not a function",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            object["call-method"]("not an object", "method")
          );
          expect(error._tag).toBe("NotAFunctionError");
        })
    );
    it.effect(
      "should fail with NotAFunctionError when method is not a function",
      () =>
        Effect.gen(function* () {
          const obj = { notAMethod: 123 };
          const error = yield* Effect.flip(
            object["call-method"](obj, "notAMethod")
          );
          expect(error._tag).toBe("NotAFunctionError");
        })
    );
  });

  describe("get-method-path", () => {
    it.effect("should get method using dot notation path", () =>
      Effect.gen(function* () {
        const obj = {
          nested: {
            method: () => "hello from nested",
          },
        };
        const method = yield* object["get-method-path"](obj, "nested.method");
        expect(method()).toBe("hello from nested");
      })
    );
    it.effect(
      "should fail with NotAnObjectError when obj is not an object",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            object["get-method-path"]("not an object", "path")
          );
          expect(error._tag).toBe("NotAnObjectError");
        })
    );
    it.effect(
      "should fail with PathTraversalError when intermediate value is not an object",
      () =>
        Effect.gen(function* () {
          const obj = { a: "not an object" };
          const error = yield* Effect.flip(
            object["get-method-path"](obj, "a.method")
          );
          expect(error._tag).toBe("PathTraversalError");
        })
    );
    it.effect(
      "should fail with PathTraversalError when intermediate key does not exist",
      () =>
        Effect.gen(function* () {
          const obj = { a: {} };
          const error = yield* Effect.flip(
            object["get-method-path"](obj, "a.b.method")
          );
          expect(error._tag).toBe("PathTraversalError");
          if (error._tag === "PathTraversalError") {
            expect(error.key).toBe("b");
          }
        })
    );
    it.effect("should fail with EmptyPathError when path is empty", () =>
      Effect.gen(function* () {
        const obj = {};
        const error = yield* Effect.flip(object["get-method-path"](obj, ""));
        expect(error._tag).toBe("EmptyPathError");
        if (error._tag === "EmptyPathError") {
          expect(error.path).toBe("");
        }
      })
    );
    it.effect(
      "should fail with MethodNotFoundError when final key is not a function",
      () =>
        Effect.gen(function* () {
          const obj = { nested: { notAMethod: "value" } };
          const error = yield* Effect.flip(
            object["get-method-path"](obj, "nested.notAMethod")
          );
          expect(error._tag).toBe("MethodNotFoundError");
          if (error._tag === "MethodNotFoundError") {
            expect(error.path).toBe("nested.notAMethod");
            expect(error.methodKey).toBe("notAMethod");
            expect(error.actual).toBe("value");
          }
        })
    );
    it.effect("should bind this correctly to the parent object", () =>
      Effect.gen(function* () {
        const obj = {
          nested: {
            value: 100,
            method() {
              return this.value;
            },
          },
        };
        const boundMethod = yield* object["get-method-path"](
          obj,
          "nested.method"
        );
        expect(boundMethod()).toBe(100);
      })
    );
  });

  describe("call-method-path", () => {
    it.effect("should call method using dot notation path", () =>
      Effect.gen(function* () {
        const obj = {
          nested: {
            greet(name: string) {
              return `Hello, ${name}!`;
            },
          },
        };
        const result = yield* object["call-method-path"](
          obj,
          "nested.greet",
          "World"
        );
        expect(result).toBe("Hello, World!");
      })
    );
    it.effect("should call method with multiple arguments", () =>
      Effect.gen(function* () {
        const obj = {
          nested: {
            add(a: number, b: number, c: number) {
              return a + b + c;
            },
          },
        };
        const result = yield* object["call-method-path"](
          obj,
          "nested.add",
          1,
          2,
          3
        );
        expect(result).toBe(6);
      })
    );
    it.effect(
      "should fail with NotAnObjectError when obj is not an object",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            object["call-method-path"]("not an object", "path")
          );
          expect(error._tag).toBe("NotAnObjectError");
        })
    );
    it.effect(
      "should fail with PathTraversalError when intermediate value is not an object",
      () =>
        Effect.gen(function* () {
          const obj = { a: "not an object" };
          const error = yield* Effect.flip(
            object["call-method-path"](obj, "a.method")
          );
          expect(error._tag).toBe("PathTraversalError");
        })
    );
    it.effect(
      "should fail with PathTraversalError when intermediate key does not exist",
      () =>
        Effect.gen(function* () {
          const obj = { a: {} };
          const error = yield* Effect.flip(
            object["call-method-path"](obj, "a.b.method")
          );
          expect(error._tag).toBe("PathTraversalError");
        })
    );
    it.effect("should fail with EmptyPathError when path is empty", () =>
      Effect.gen(function* () {
        const obj = {};
        const error = yield* Effect.flip(object["call-method-path"](obj, ""));
        expect(error._tag).toBe("EmptyPathError");
      })
    );
    it.effect(
      "should fail with MethodNotFoundError when final key is not a function",
      () =>
        Effect.gen(function* () {
          const obj = { nested: { notAMethod: 42 } };
          const error = yield* Effect.flip(
            object["call-method-path"](obj, "nested.notAMethod")
          );
          expect(error._tag).toBe("MethodNotFoundError");
        })
    );
    it.effect("should maintain correct this context through the path", () =>
      Effect.gen(function* () {
        const obj = {
          nested: {
            value: 50,
            getValue() {
              return this.value;
            },
          },
        };
        const result = yield* object["call-method-path"](
          obj,
          "nested.getValue"
        );
        expect(result).toBe(50);
      })
    );
  });
});
