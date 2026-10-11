import { describe, expect, test } from "bun:test";

import { weiDecimalFromBigInt } from "@herd-labs/schemas";
import type { DecodedTrace } from "@herd-labs/services/external";

import { transactionEnvelopeTarget } from "./envelope.ts";

const syntheticTempoTrace = {
  calls: [],
  callerFunctionDetails: null,
  from: "0x0000000000000000000000000000000000000001",
  gas: "0x1",
  gasUsed: "0x1",
  input: "0x",
  to: "0x0000000000000000000000000000000000000000",
  type: "CALL",
  value: weiDecimalFromBigInt(0n),
} satisfies DecodedTrace;

describe("transactionEnvelopeTarget", () => {
  test("does not expose the synthetic Tempo batch root as a zero-address call", () => {
    expect(transactionEnvelopeTarget({ decodedTrace: syntheticTempoTrace, transactionType: "0x76" })).toEqual({
      functionSignature: null,
      toAddress: null,
    });
  });

  test("uses the root call for standard EVM transactions", () => {
    expect(
      transactionEnvelopeTarget({
        decodedTrace: {
          ...syntheticTempoTrace,
          input: "0x12345678abcdef",
          to: "0x0000000000000000000000000000000000000002",
        },
        transactionType: "0x2",
      })
    ).toEqual({
      functionSignature: "0x12345678",
      toAddress: "0x0000000000000000000000000000000000000002",
    });
  });
});
