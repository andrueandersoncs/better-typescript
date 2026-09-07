import { Effect } from "effect";
import { unsafe as unsafeStatement, type Constructor } from "effect/unstable/sql/Statement";

export const bad = Effect.unsafeRunSync();
export const clean = Effect.runSync();
declare const sql: Constructor;
export const rawStatement = sql.unsafe("SELECT 1");
const rawStatementConstructor = sql.unsafe;
export const aliasedRawStatement = rawStatementConstructor("SELECT 1");
export const rejectedStatementUnsafe = unsafeStatement("SELECT 1");
