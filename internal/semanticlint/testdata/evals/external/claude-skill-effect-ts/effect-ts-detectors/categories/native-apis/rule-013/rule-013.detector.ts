/**
 * rule-013: safe-property-access
 *
 * Rule: Never use record[key]; use Record.get (returns Option)
 */

import * as ts from "typescript";
import {
	NativeApisViolation,
	SNIPPET_MAX_LENGTH,
	type Violation,
} from "../../../src/types.js";

const meta = {
	id: "rule-013",
	category: "native-apis",
	name: "safe-property-access",
};

export const detect = (
	filePath: string,
	sourceFile: ts.SourceFile,
): Violation[] => {
	const violations: Violation[] = [];

	const visit = (node: ts.Node) => {
		// Detect dynamic property access record[key]
		if (ts.isElementAccessExpression(node)) {
			const arg = node.argumentExpression;

			// Check if it's a dynamic key (identifier, not string literal)
			if (arg && ts.isIdentifier(arg)) {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(),
				);
				violations.push(
					new NativeApisViolation({
						category: "native-apis",
						ruleId: meta.id,
						message:
							"Dynamic property access record[key]; use Record.get for safe Option",
						filePath,
						line: line + 1,
						column: character + 1,
						snippet: node.getText(sourceFile).slice(0, SNIPPET_MAX_LENGTH),
						certainty: "potential",
						suggestion:
							"Use Record.get(record, key) which returns Option<V> instead of V | undefined",
					}),
				);
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return violations;
};
