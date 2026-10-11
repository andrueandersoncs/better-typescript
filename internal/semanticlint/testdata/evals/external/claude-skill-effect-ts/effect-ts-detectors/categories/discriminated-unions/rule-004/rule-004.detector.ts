/**
 * rule-004: schema-is-vs-match-tag
 *
 * Rule: Never use Match.tag when you need class methods; use Schema.is()
 */

import * as ts from "typescript";
import {
	DiscriminatedUnionsViolation,
	SNIPPET_MAX_LENGTH,
	type Violation,
} from "../../../src/types.js";

const meta = {
	id: "rule-004",
	category: "discriminated-unions",
	name: "schema-is-vs-match-tag",
};

export const detect = (
	filePath: string,
	sourceFile: ts.SourceFile,
): Violation[] => {
	const violations: Violation[] = [];

	const visit = (node: ts.Node) => {
		// Detect Match.tag usage
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const obj = node.expression.expression;
			const method = node.expression.name.text;

			if (ts.isIdentifier(obj) && obj.text === "Match" && method === "tag") {
				// Check if the handler accesses methods on the matched value
				if (node.arguments.length >= 2) {
					const handler = node.arguments[1];
					if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
						const bodyText = handler.getText(sourceFile);

						// Check for method/property access on the matched value
						// This is a heuristic - if the handler accesses class members, Schema.is might be better
						// Match pattern like .methodName() or .propertyName (not console.log() or Effect.)
						const memberAccessPattern = /\.\s*[a-z][a-zA-Z0-9]*/;
						if (
							memberAccessPattern.test(bodyText) &&
							!bodyText.includes("console.") &&
							!bodyText.includes("Effect.") &&
							!bodyText.includes("_tag")
						) {
							const { line, character } =
								sourceFile.getLineAndCharacterOfPosition(node.getStart());
							violations.push(
								new DiscriminatedUnionsViolation({
									category: "discriminated-unions",
									ruleId: meta.id,
									message:
										"Match.tag with method calls; consider Schema.is() for class instances",
									filePath,
									line: line + 1,
									column: character + 1,
									snippet: node
										.getText(sourceFile)
										.slice(0, SNIPPET_MAX_LENGTH),
									certainty: "potential",
									suggestion:
										"Use Match.when(Schema.is(MyClass), (instance) => instance.method()) for Schema.Class instances",
								}),
							);
						}
					}
				}
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return violations;
};
