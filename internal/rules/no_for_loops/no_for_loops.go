package no_for_loops

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{
	Id:          "noForLoops",
	Description: "Avoid imperative logic in iterator-based for loops.",
	Help:        "Use Effect's Array module, such as Array.map(), Array.reduce(), Array.filter(), or Array.flatMap(), instead.",
}

var NoForLoopsRule = rule.Rule{
	Name: "no-for-loops",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindForStatement: func(node *ast.Node) {
			statement := node.AsForStatement()
			if statement.Condition != nil && (statement.Initializer != nil || statement.Incrementor != nil) {
				ctx.ReportNode(node, message)
			}
		}}
	},
}
