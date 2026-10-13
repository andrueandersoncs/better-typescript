package require_safety_comment_for_type_assertion

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var safetyMarker = regexp.MustCompile(`(^|[^[:alnum:]_])SAFETY[[:space:]]*:[[:space:]]*\S`)
var message = rule.RuleMessage{
	Id:          "require-safety-comment-for-type-assertion",
	Description: "This type assertion has no `SAFETY:` justification.",
	Help:        "State the checked invariant immediately before the assertion or its containing statement, and explain it using `because`.",
}

var factory = ast.NewNodeFactory(ast.NodeFactoryHooks{})

func commentText(source string, comment ast.CommentRange) string {
	text := source[comment.Pos():comment.End()]
	if comment.Kind == ast.KindSingleLineCommentTrivia {
		return strings.TrimPrefix(text, "//")
	}
	return strings.TrimSuffix(strings.TrimPrefix(text, "/*"), "*/")
}

func constAssertion(node *ast.Node) bool {
	typeNode := node.Type()
	return typeNode != nil && ast.IsTypeReferenceNode(typeNode) && ast.IsIdentifier(typeNode.AsTypeReferenceNode().TypeName) && typeNode.AsTypeReferenceNode().TypeName.Text() == "const"
}

func leadingSafety(ctx rule.RuleContext, current *ast.Node) bool {
	start := scanner.GetTokenPosOfNode(current, ctx.SourceFile, false)
	trivia := ctx.SourceFile.Text()[current.Pos():start]
	for comment := range scanner.GetLeadingCommentRanges(factory, trivia, 0) {
		if safetyMarker.MatchString(commentText(trivia, comment)) && strings.TrimSpace(trivia[comment.End():]) == "" {
			return true
		}
	}
	return false
}

func justified(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if leadingSafety(ctx, current) {
			return true
		}
		switch current.Kind {
		case ast.KindExpressionStatement, ast.KindPropertyDeclaration, ast.KindReturnStatement, ast.KindThrowStatement, ast.KindVariableStatement:
			return false
		}
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		if !constAssertion(node) && !justified(ctx, node) {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{
		ast.KindAsExpression:            check,
		ast.KindTypeAssertionExpression: check,
	}
}

var Rule = rule.Rule{Name: "require-safety-comment-for-type-assertion", Run: run}
