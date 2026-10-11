/**
 * rule-011: timeout-fail
 *
 * Rule: Never use setTimeout for timeouts; use Effect.timeout
 */

import * as ts from "typescript";
import {
	ErrorsViolation,
	SNIPPET_MAX_LENGTH,
	type Violation,
} from "../../../src/types.js";

const meta = {
	id: "rule-011",
	category: "errors",
	name: "timeout-fail",
};

export const detect = (
	filePath: string,
	sourceFile: ts.SourceFile,
): Violation[] => {
	const violations: Violation[] = [];

	const visit = (node: ts.Node) => {
		// Detect setTimeout used for timeout patterns
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === "setTimeout"
		) {
			// Check if it looks like a timeout pattern (callback throws/rejects)
			const callback = node.arguments[0];
			let looksLikeTimeout = false;

			if (
				callback &&
				(ts.isFunctionExpression(callback) || ts.isArrowFunction(callback))
			) {
				const text = callback.getText(sourceFile).toLowerCase();
				if (
					text.includes("throw") ||
					text.includes("reject") ||
					text.includes("timeout") ||
					text.includes("error")
				) {
					looksLikeTimeout = true;
				}
			}

			if (looksLikeTimeout) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(),
				);
				violations.push(
					new ErrorsViolation({
						category: "errors",
						ruleId: meta.id,
						message:
							"setTimeout for timeout handling should use Effect.timeout",
						filePath,
						line: line + 1,
						column: character + 1,
						snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
						certainty: "potential",
						suggestion: "Use Effect.timeout() or Effect.timeoutFail()",
					}),
				);
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return violations;
};
