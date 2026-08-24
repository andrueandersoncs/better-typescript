package no_nested_if_statements

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "no-nested-if-statements", Description: "Avoid nesting if statements.", Help: "Combine related conditions with boolean operators, or use an early return so this condition can remain a single-level if statement."}
var Rule = rule.Rule{Name: "no-nested-if-statements", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindIfStatement: func(node *ast.Node) {
		if containingIf(node) != nil {
			ctx.ReportNode(node, message)
		}
	}}
}
func containingIf(node *ast.Node) *ast.Node {
	child := node
	for parent := node.Parent; parent != nil; parent = parent.Parent {
		switch parent.Kind {
		case ast.KindArrowFunction, ast.KindConstructor, ast.KindFunctionDeclaration, ast.KindFunctionExpression, ast.KindGetAccessor, ast.KindMethodDeclaration, ast.KindSetAccessor:
			return nil
		}
		if parent.Kind == ast.KindIfStatement {
			if parent.AsIfStatement().ElseStatement == child {
				child = parent
				continue
			}
			return parent
		}
		child = parent
	}
	return nil
}
