package prefer_context_service_class

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{Name: "prefer-context-service-class", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		if len(call.Arguments.Nodes) == 0 {
			return
		}
		callee := unwrap(call.Expression)
		isService := ast.IsPropertyAccessExpression(callee) && propertyName(callee) == "Service" && effectSymbol(ctx, callee.Name(), "Service")
		if ast.IsIdentifier(callee) {
			isService = effectSymbol(ctx, callee, "Service")
		}
		if !isService {
			return
		}
		ctx.ReportNode(callee, rule.RuleMessage{Id: "prefer-context-service-class", Description: "Prefer a class extending Context.Service for service definitions.", Help: "Pass the service interface as the Shape type parameter."})
	}}
}}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil && ast.IsParenthesizedExpression(node) {
		node = node.Expression()
	}
	return node
}
func propertyName(node *ast.Node) string {
	name := node.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func effectSymbol(ctx rule.RuleContext, node *ast.Node, name string) bool {
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil && strings.Contains(strings.ReplaceAll(file.FileName(), "\\", "/"), "/node_modules/effect/") {
			return true
		}
	}
	return false
}

var PreferContextServiceClassRule = Rule
