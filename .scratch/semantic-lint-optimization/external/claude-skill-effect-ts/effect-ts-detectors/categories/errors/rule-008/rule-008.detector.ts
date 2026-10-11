/**
 * rule-008: or-else-fallback
 *
 * Rule: Never use catchAll for fallbacks; use Effect.orElse
 */

import * as ts from "typescript";
import {
	ErrorsViolation,
	SNIPPET_MAX_LENGTH,
	type Violation,
} from "../../../src/types.js";

const meta = {
	id: "rule-008",
	category: "errors",
	name: "or-else-fallback",
};

export const detect = (
	filePath: string,
	sourceFile: ts.SourceFile,
): Violation[] => {
	const violations: Violation[] = [];

	const visit = (node: ts.Node) => {
		// Detect catchAll that returns Effect.succeed (fallback pattern)
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const method = node.expression.name.text;

			if (method === "catchAll") {
				if (node.arguments.length > 0) {
					const handlerText = node.arguments[0].getText(sourceFile);

					// Check if it just returns a success (fallback)
					if (
						handlerText.includes("Effect.succeed") &&
						!handlerText.includes("Effect.fail") &&
						!handlerText.includes("yield*")
					) {
						const { line, character } =
							sourceFile.getLineAndCharacterOfPosition(node.getStart());
						violations.push(
							new ErrorsViolation({
								category: "errors",
								ruleId: meta.id,
								message:
									"catchAll returning succeed; use Effect.orElse for fallbacks",
								filePath,
								line: line + 1,
								column: character + 1,
								snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
								certainty: "potential",
								suggestion:
									"Use Effect.orElse(() => fallbackEffect) or Effect.orElseSucceed(() => defaultValue)",
							}),
						);
					}

					// Check if catchAll ignores the error and just calls another Effect (fallback pattern)
					// Pattern: () => someEffect() or (_) => someEffect()
					if (
						!handlerText.includes("Effect.fail") &&
						!handlerText.includes("yield*") &&
						!handlerText.includes("Effect.succeed")
					) {
						// Check if handler is an arrow function that ignores error parameter
						const arg = node.arguments[0];
						if (
							ts.isArrowFunction(arg) &&
							arg.parameters.length <= 1 &&
							(arg.parameters.length === 0 ||
								(arg.parameters[0].name &&
									ts.isIdentifier(arg.parameters[0].name) &&
									arg.parameters[0].name.text === "_"))
						) {
							const { line, character } =
								sourceFile.getLineAndCharacterOfPosition(node.getStart());
							violations.push(
								new ErrorsViolation({
									category: "errors",
									ruleId: meta.id,
									message:
										"catchAll ignoring error for fallback; use Effect.orElse",
									filePath,
									line: line + 1,
									column: character + 1,
									snippet: node
										.getText(sourceFile)
										.slice(0, SNIPPET_MAX_LENGTH),
									certainty: "potential",
									suggestion:
										"Use Effect.orElse(() => fallbackEffect) when ignoring error for fallback",
								}),
							);
						}
					}
				}
			}
		}

		// Detect try/catch with return fallback value
		if (ts.isTryStatement(node) && node.catchClause) {
			const catchBlock = node.catchClause.block;
			const statements = catchBlock.statements;

			if (statements.length === 1) {
				const stmt = statements[0];
				if (ts.isReturnStatement(stmt) && stmt.expression) {
					// Simple return of fallback value
					const returnText = stmt.expression.getText(sourceFile);
					if (!returnText.includes("throw") && !returnText.includes("Error")) {
						const { line, character } =
							sourceFile.getLineAndCharacterOfPosition(node.getStart());
						violations.push(
							new ErrorsViolation({
								category: "errors",
								ruleId: meta.id,
								message: "try/catch with fallback return; use Effect.orElse",
								filePath,
								line: line + 1,
								column: character + 1,
								snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
								certainty: "potential",
								suggestion:
									"Use effect.pipe(Effect.orElseSucceed(() => fallbackValue)) for fallback handling",
							}),
						);
					}
				}
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return violations;
};
