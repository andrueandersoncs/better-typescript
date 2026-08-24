package inflight_dedupe_map

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "inflightDedupeMap",
	Description: "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits.",
	Help:        "Cache.get shares an in-flight lookup for the same missing key.",
}

func isNewMap(node *ast.Node) bool {
	return node != nil && ast.IsNewExpression(node) && ast.IsIdentifier(node.AsNewExpression().Expression) && node.AsNewExpression().Expression.Text() == "Map"
}

func typeMentionsPending(ctx rule.RuleContext, valueType *checker.Type) bool {
	if valueType == nil {
		return false
	}
	rendered := ctx.TypeChecker.TypeToString(valueType)
	return strings.Contains(rendered, "Promise<") || strings.Contains(rendered, "Effect<")
}

func newMapLooksPending(ctx rule.RuleContext, node *ast.Node) bool {
	if !isNewMap(node) {
		return false
	}
	if typeMentionsPending(ctx, ctx.TypeChecker.GetTypeAtLocation(node)) {
		return true
	}
	text := ctx.SourceFile.Text()[node.Pos():node.End()]
	return strings.Contains(text, "Promise<") || strings.Contains(text, "Effect<")
}

func variableMapLooksPending(ctx rule.RuleContext, node *ast.Node) bool {
	declaration := node.AsVariableDeclaration()
	if declaration.Type != nil && typeMentionsPending(ctx, ctx.TypeChecker.GetTypeFromTypeNode(declaration.Type)) {
		return true
	}
	return newMapLooksPending(ctx, declaration.Initializer)
}

var InflightDedupeMapRule = rule.Rule{
	Name: "inflight-dedupe-map",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindNewExpression: func(node *ast.Node) {
				if newMapLooksPending(ctx, node) {
					ctx.ReportNode(node, message)
				}
			},
			ast.KindVariableDeclaration: func(node *ast.Node) {
				if isNewMap(node.Initializer()) && variableMapLooksPending(ctx, node) {
					ctx.ReportNode(node, message)
				}
			},
		}
	},
}
