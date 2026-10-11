import { expect, test } from "bun:test";
import { ToolLoopAgent } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { Effect } from "effect";
import { createSandbox } from "../../src";
import { createSandboxToolApproval, createSandboxTools, toAISandboxSession } from "../../src/ai";
import { local } from "../../src/providers/local";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

test("AI SDK ToolLoopAgent executes tools through a sandbox session", async () => {
  const model = new MockLanguageModelV3({
    doGenerate: [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "agent-command",
            toolName: "bash",
            input: JSON.stringify({ command: "printf agent-ok > agent.txt" }),
          },
        ],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text", text: "The sandbox command completed." }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      },
    ],
  });
  const agent = new ToolLoopAgent({
    model,
    tools: createSandboxTools(),
    toolApproval: createSandboxToolApproval("never"),
  });
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const sandbox = yield* createSandbox({ provider: local() });
        const result = yield* Effect.promise(() =>
          agent.generate({
            prompt: "Create agent.txt in the sandbox.",
            experimental_sandbox: toAISandboxSession(sandbox),
          }),
        );

        expect(result.text).toBe("The sandbox command completed.");
        expect(yield* sandbox.files.text("agent.txt")).toBe("agent-ok");
        expect(model.doGenerateCalls).toHaveLength(2);
      }),
    ),
  );
});
