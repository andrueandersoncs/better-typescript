package no_explicit_any_return

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "noExplicitAnyReturn",
	Description: "Avoid function return types that include any.",
	Help:        "Declare a precise return type instead of any. If the value is unknown at a boundary, use unknown and narrow before use.",
}

func containsAnyKeyword(node *ast.Node) bool {
	if node.Kind == ast.KindAnyKeyword {
		return true
	}
	for child := range node.IterChildren() {
		if containsAnyKeyword(child) {
			return true
		}
	}
	return false
}

func checkReturnType(ctx rule.RuleContext, node *ast.Node) {
	typeNode := node.Type()
	if typeNode != nil && containsAnyKeyword(typeNode) {
		ctx.ReportNode(node, message)
	}
}

var NoExplicitAnyReturnRule = rule.Rule{
	Name: "no-explicit-any-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindFunctionDeclaration: checkReturnTypeListener(ctx),
			ast.KindFunctionExpression:  checkReturnTypeListener(ctx),
			ast.KindArrowFunction:       checkReturnTypeListener(ctx),
			ast.KindMethodDeclaration:   checkReturnTypeListener(ctx),
			ast.KindMethodSignature:     checkReturnTypeListener(ctx),
			ast.KindCallSignature:       checkReturnTypeListener(ctx),
			ast.KindFunctionType:        checkReturnTypeListener(ctx),
			ast.KindGetAccessor:         checkReturnTypeListener(ctx),
		}
	},
}

func checkReturnTypeListener(ctx rule.RuleContext) func(*ast.Node) {
	return func(node *ast.Node) { checkReturnType(ctx, node) }
}
