package no_for_in_loops

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{
	Id:          "noForInLoops",
	Description: "Avoid imperative logic in for..in loops.",
	Help:        "Use Effect's Record module, such as Record.map(), Record.reduce(), or Record.toEntries(), instead.",
}

var NoForInLoopsRule = rule.Rule{
	Name: "no-for-in-loops",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindForInStatement: func(node *ast.Node) { ctx.ReportNode(node, message) }}
	},
}
