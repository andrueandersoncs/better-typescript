package no_nested_if_statements

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
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

// containingIf returns the nearest enclosing if statement, skipping links of an
// else-if chain (an if that is directly another if's else statement).
func containingIf(node *ast.Node) *ast.Node {
	child := node
	for parent := node.Parent; parent != nil; parent = parent.Parent {
		if parent.Kind == ast.KindIfStatement {
			if child.Kind == ast.KindIfStatement && parent.AsIfStatement().ElseStatement == child {
				child = parent
				continue
			}
			return parent
		}
		child = parent
	}
	return nil
}
