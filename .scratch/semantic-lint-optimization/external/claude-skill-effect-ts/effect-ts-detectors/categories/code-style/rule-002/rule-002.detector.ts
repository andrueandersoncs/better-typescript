/**
 * rule-002: no-type-assertions
 *
 * Rule: Never use type assertions (as, angle brackets, double assertions); use Schema.decodeUnknown or type guards
 */

import * as ts from "typescript";
import {
	CodeStyleViolation,
	SNIPPET_MAX_LENGTH,
	type Violation,
} from "../../../src/types.js";

const meta = {
	id: "rule-002",
	category: "code-style",
	name: "no-type-assertions",
};

export const detect = (
	filePath: string,
	sourceFile: ts.SourceFile,
): Violation[] => {
	const violations: Violation[] = [];

	const visit = (node: ts.Node) => {
		// Detect angle bracket type assertions (<Type>value)
		if (ts.isTypeAssertionExpression(node)) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(),
			);
			violations.push(
				new CodeStyleViolation({
					category: "code-style",
					ruleId: meta.id,
					message:
						"Angle bracket type assertion; use Schema validation instead",
					filePath,
					line: line + 1,
					column: character + 1,
					snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
					certainty: "definite",
					suggestion:
						"Use Schema.decodeUnknown(MySchema)(value) for runtime validation instead of <Type>casting",
				}),
			);
		}

		// Detect 'as' expressions
		if (ts.isAsExpression(node)) {
			const typeText = node.type.getText(sourceFile);

			// Detect 'as any'
			if (typeText === "any") {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(),
				);
				violations.push(
					new CodeStyleViolation({
						category: "code-style",
						ruleId: meta.id,
						message:
							"'as any' bypasses type safety; fix the type or use Schema",
						filePath,
						line: line + 1,
						column: character + 1,
						snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
						certainty: "definite",
						suggestion:
							"Define a Schema for the data shape and use Schema.decodeUnknown for validation",
					}),
				);
			}

			// Detect 'as unknown'
			if (typeText === "unknown") {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(),
				);
				violations.push(
					new CodeStyleViolation({
						category: "code-style",
						ruleId: meta.id,
						message:
							"'as unknown' assertion should be replaced with Schema validation",
						filePath,
						line: line + 1,
						column: character + 1,
						snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
						certainty: "definite",
						suggestion: "Use Schema.decodeUnknown() for type-safe validation",
					}),
				);
			}

			// Detect 'as unknown as T' pattern (double assertion)
			if (ts.isAsExpression(node.expression)) {
				const innerType = node.expression.type.getText(sourceFile);
				if (innerType === "unknown") {
					const { line, character } = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(),
					);
					violations.push(
						new CodeStyleViolation({
							category: "code-style",
							ruleId: meta.id,
							message:
								"'as unknown as T' double assertion; use Schema validation",
							filePath,
							line: line + 1,
							column: character + 1,
							snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
							certainty: "definite",
							suggestion:
								"Use Schema.decodeUnknown(TargetSchema)(value) for proper type validation",
						}),
					);
				}
			}

			// Detect type casting on API responses
			if (typeText !== "unknown" && typeText !== "any") {
				let parent = node.parent;
				let isApiContext = false;

				while (parent) {
					const parentText = parent.getText(sourceFile).toLowerCase();
					if (
						parentText.includes("fetch") ||
						parentText.includes(".json()") ||
						parentText.includes("response") ||
						parentText.includes("axios") ||
						parentText.includes("api")
					) {
						isApiContext = true;
						break;
					}
					parent = parent.parent;
				}

				if (isApiContext) {
					const { line, character } = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(),
					);
					violations.push(
						new CodeStyleViolation({
							category: "code-style",
							ruleId: meta.id,
							message: `Type casting API response as ${typeText}; use Schema.decodeUnknown`,
							filePath,
							line: line + 1,
							column: character + 1,
							snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
							certainty: "potential",
							suggestion:
								"Use Schema.decodeUnknown(ResponseSchema)(data) for runtime validation of API responses",
						}),
					);
				}
			}
		}

		// Detect response.json() without Schema validation
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === "json"
		) {
			let parent = node.parent;
			let hasValidation = false;

			while (parent) {
				const parentText = parent.getText(sourceFile);
				if (
					parentText.includes("Schema.decode") ||
					parentText.includes("decodeUnknown") ||
					parentText.includes("Schema.parse")
				) {
					hasValidation = true;
					break;
				}
				parent = parent.parent;
			}

			if (!hasValidation) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(),
				);
				violations.push(
					new CodeStyleViolation({
						category: "code-style",
						ruleId: meta.id,
						message:
							".json() response without Schema validation; validate external data",
						filePath,
						line: line + 1,
						column: character + 1,
						snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
						certainty: "potential",
						suggestion:
							"Pipe .json() result through Schema.decodeUnknown(ResponseSchema) for type-safe validation",
					}),
				);
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return violations;
};
