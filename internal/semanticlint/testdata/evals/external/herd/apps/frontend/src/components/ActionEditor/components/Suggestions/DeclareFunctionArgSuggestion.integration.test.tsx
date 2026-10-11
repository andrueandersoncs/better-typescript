import { describe, expect, it, beforeEach } from "bun:test";

import { extractFunctionDefinitions, extractImportedFunctions } from "@herd-labs/hal";
import type { Expression, HalFunctionArg, HalType } from "@herd-labs/hal";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, userEvent, createTestQueryClient } from "app/test/test-utils";
import { useState } from "react";

import type { HalSuggestionIndex } from "./hal-type-suggestions";
import { SmartSuggestionsInput } from "./SmartSuggestionsInput";
import type { SmartSuggestionItem } from "./SmartSuggestionsInput";
import { DEFAULT_VALUE_SUGGESTION_SOURCES, composeSuggestions, toSmartSuggestionItems } from "./suggestion-system";
import type { SuggestionContext } from "./suggestion-system";

// =============================================================================
// Test Setup
// =============================================================================

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const createMockSuggestionIndex = (overrides: Partial<HalSuggestionIndex> = {}): HalSuggestionIndex => ({
  variables: [],
  functions: [],
  ...overrides,
});

// =============================================================================
// Test Component - Simulates editing a function with argument suggestions
// =============================================================================

interface TestFunctionArgInputProps {
  targetFunctionName: string;
  expectedType: HalType;
  rootExpression?: Expression;
  initialValue?: string;
}

const DEFAULT_ROOT_EXPRESSION: Expression = [
  "do",
  ["export", ["define", { name: "main", parameters: [], body: [] }]],
  ["define", { name: "helper", parameters: [], body: [] }],
];

const TestFunctionArgInput = ({
  targetFunctionName,
  expectedType,
  rootExpression = DEFAULT_ROOT_EXPRESSION,
  initialValue = "",
}: TestFunctionArgInputProps) => {
  const [value, setValue] = useState(initialValue);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartSuggestionItem | null>(null);

  const suggestionIndex = createMockSuggestionIndex();

  // Build suggestion context with the target function name
  const suggestionContext: SuggestionContext = {
    query: value,
    expectedType,
    rootExpression,
    currentValue: value,
    suggestionIndex,
    currentStepBodyIndex: null,
    currentArgIndex: null,
    allFunctionSignatures: new Map<string, HalFunctionArg[]>(),
    canModifyExpression: true,
    targetFunctionName,
    inputName: null,
    isMainFunctionBodyEditor: false,
    currentBatchIndex: null,
    importedFunctionBodies: null,
    contractsData: { base: {}, ethereum: {}, monad: {}, robinhood: {} },
    functionDefinitions: extractFunctionDefinitions({
      expression: rootExpression,
    }),
    importedFunctions: extractImportedFunctions({ expression: rootExpression }),
  };

  // Compose suggestions using the suggestion system
  const smartSuggestions = composeSuggestions({
    sources: DEFAULT_VALUE_SUGGESTION_SOURCES,
    ctx: suggestionContext,
  });

  const suggestions = toSmartSuggestionItems(smartSuggestions);

  return (
    <div>
      <SmartSuggestionsInput
        value={value}
        onValueChange={setValue}
        placeholder="Enter value..."
        suggestions={suggestions}
        onSelectSuggestion={(item) => {
          setSelectedSuggestion(item);
        }}
      />
      {/* Display for test assertions */}
      <div data-testid="suggestion-count">{suggestions.length}</div>
      <div data-testid="suggestions-list">
        {suggestions.map((s) => (
          <div key={s.id} data-testid={`suggestion-${s.id}`}>
            {s.label} | {s.meta}
          </div>
        ))}
      </div>
      {selectedSuggestion && <div data-testid="selected-suggestion">{selectedSuggestion.label}</div>}
    </div>
  );
};

// =============================================================================
// Integration Tests for "add <functionName> arg" Suggestion
// =============================================================================

describe("Declare Function Arg Suggestion - Integration Tests", () => {
  beforeEach(() => {
    // Clear any previous state
  });

  describe("when editing the main function", () => {
    it("shows 'add user parameter' when typing a valid identifier", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TestFunctionArgInput targetFunctionName="main" expectedType="address" />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText("Enter value...");
      await user.click(input);
      await user.type(input, "userAddress");

      // Wait for suggestions to be computed
      await waitFor(() => {
        const suggestionsListElement = screen.getByTestId("suggestions-list");
        expect(suggestionsListElement.textContent).toContain("add user parameter");
      });
    });
  });

  describe("when editing a helper function (non-main)", () => {
    it("shows 'add user parameter' when typing a valid identifier", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TestFunctionArgInput targetFunctionName="helper" expectedType="string" />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText("Enter value...");
      await user.click(input);
      await user.type(input, "inputValue");

      // Wait for suggestions to be computed
      await waitFor(() => {
        const suggestionsListElement = screen.getByTestId("suggestions-list");
        expect(suggestionsListElement.textContent).toContain("add user parameter");
      });
    });

    it("shows 'add user parameter' for custom function names", async () => {
      const user = userEvent.setup();

      const rootExpression: Expression = [
        "do",
        ["export", ["define", { name: "main", parameters: [], body: [] }]],
        ["define", { name: "customFn", parameters: [], body: [] }],
      ];

      render(
        <TestWrapper>
          <TestFunctionArgInput targetFunctionName="customFn" expectedType="uint256" rootExpression={rootExpression} />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText("Enter value...");
      await user.click(input);
      await user.type(input, "amount");

      await waitFor(() => {
        const suggestionsListElement = screen.getByTestId("suggestions-list");
        expect(suggestionsListElement.textContent).toContain("add user parameter");
      });
    });
  });

  describe("when targetFunctionName is null", () => {
    it("does NOT show 'add arg' suggestion", async () => {
      const user = userEvent.setup();

      // Note: We need to simulate null targetFunctionName - this simulates
      // a context where we don't know which function is being edited
      const TestNullTarget = () => {
        const [value, setValue] = useState("");

        const rootExpression: Expression = ["do", ["export", ["define", { name: "main", parameters: [], body: [] }]]];
        const suggestionContext: SuggestionContext = {
          query: value,
          expectedType: "address",
          rootExpression,
          currentValue: value,
          suggestionIndex: createMockSuggestionIndex(),
          currentStepBodyIndex: null,
          currentArgIndex: null,
          allFunctionSignatures: new Map<string, HalFunctionArg[]>(),
          canModifyExpression: true,
          targetFunctionName: null, // No target function
          inputName: null,
          isMainFunctionBodyEditor: false,
          currentBatchIndex: null,
          importedFunctionBodies: null,
          contractsData: { base: {}, ethereum: {}, monad: {}, robinhood: {} },
          functionDefinitions: extractFunctionDefinitions({
            expression: rootExpression,
          }),
          importedFunctions: extractImportedFunctions({
            expression: rootExpression,
          }),
        };

        const smartSuggestions = composeSuggestions({
          sources: DEFAULT_VALUE_SUGGESTION_SOURCES,
          ctx: suggestionContext,
        });

        const suggestions = toSmartSuggestionItems(smartSuggestions);

        return (
          <div>
            <SmartSuggestionsInput
              value={value}
              onValueChange={setValue}
              placeholder="Enter value..."
              suggestions={suggestions}
              onSelectSuggestion={() => {
                /* noop */
              }}
            />
            <div data-testid="suggestions-list">
              {suggestions.map((s) => (
                <div key={s.id}>
                  {s.label} | {s.meta}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestNullTarget />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText("Enter value...");
      await user.click(input);
      await user.type(input, "userAddress");

      await waitFor(() => {
        const suggestionsListElement = screen.getByTestId("suggestions-list");
        // Should NOT show any "add user parameter" suggestion when targetFunctionName is null
        expect(suggestionsListElement.textContent).not.toContain("add user parameter");
      });
    });
  });

  describe("edge cases", () => {
    it("does not suggest arg that already exists on target function", async () => {
      const user = userEvent.setup();

      // Expression where helper already has an "existingArg" argument
      const rootExpression: Expression = [
        "do",
        ["export", ["define", { name: "main", parameters: [], body: [] }]],
        [
          "define",
          {
            name: "helper",
            parameters: [{ name: "existingArg", type: "address" }],
            body: ["call", "existingArg"],
          },
        ],
      ];

      render(
        <TestWrapper>
          <TestFunctionArgInput targetFunctionName="helper" expectedType="address" rootExpression={rootExpression} />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText("Enter value...");
      await user.click(input);
      await user.type(input, "existingArg");

      await waitFor(() => {
        const suggestionsListElement = screen.getByTestId("suggestions-list");
        // Should NOT suggest "existingArg" because it already exists
        expect(suggestionsListElement.textContent).not.toContain("add user parameter");
      });
    });

    it("shows 'add user parameter' in the suggestion meta", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TestFunctionArgInput targetFunctionName="main" expectedType="bytes32" />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText("Enter value...");
      await user.click(input);
      await user.type(input, "hashValue");

      await waitFor(() => {
        const suggestionsListElement = screen.getByTestId("suggestions-list");
        expect(suggestionsListElement.textContent).toContain("add user parameter");
      });
    });
  });
});
