/**
 * rule-002: code-organization
 *
 * Rule: Never add section marker comments; use file organization and clear naming instead
 */

import * as ts from "typescript";
import {
	CommentsViolation,
	SNIPPET_MAX_LENGTH,
	type Violation,
} from "../../../src/types.js";

const meta = {
	id: "rule-002",
	category: "comments",
	name: "code-organization",
};

export const detect = (
	filePath: string,
	sourceFile: ts.SourceFile,
): Violation[] => {
	const violations: Violation[] = [];
	const fullText = sourceFile.getFullText();

	// Check for section marker comments (like "// ============ Types ============")
	const sectionMarkerPatterns = [
		/\/\/\s*[=\-#*]{3,}.*[=\-#*]{3,}\s*$/, // // ==== Types ==== or // ---- Types ----
		/\/\/\s*[=\-#*]{5,}\s*$/, // Just divider lines like // ============
		/\/\*\s*[=\-#*]{3,}.*[=\-#*]{3,}\s*\*\//, // /* ==== Types ==== */
	];

	const scanComments = (pos: number) => {
		const comments = [
			...(ts.getLeadingCommentRanges(fullText, pos) || []),
			...(ts.getTrailingCommentRanges(fullText, pos) || []),
		];

		for (const comment of comments) {
			const commentText = fullText.slice(comment.pos, comment.end);
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				comment.pos,
			);

			for (const pattern of sectionMarkerPatterns) {
				if (pattern.test(commentText)) {
					violations.push(
						new CommentsViolation({
							category: "comments",
							ruleId: meta.id,
							message:
								"Section marker comments should be avoided; use file organization and clear naming instead",
							filePath,
							line: line + 1,
							column: character + 1,
							snippet: commentText.slice(0, SNIPPET_MAX_LENGTH),
							certainty: "potential",
							suggestion:
								"Remove section markers; organize code into separate files or use clear naming conventions",
						}),
					);
					break;
				}
			}
		}
	};

	const visit = (node: ts.Node) => {
		scanComments(node.getFullStart());
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);

	// Also scan trailing comments at end of file
	const lastToken = sourceFile.endOfFileToken;
	scanComments(lastToken.getFullStart());

	return violations;
};
