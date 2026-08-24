package no_for_of_loops

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var synchronousMessage = rule.RuleMessage{
	Id:          "noForOfLoops",
	Description: "Avoid imperative logic in for..of loops.",
	Help:        "Use Effect's Array module, such as Array.map(), Array.reduce(), Array.filter(), or Array.flatMap(), instead.",
}

var asynchronousMessage = rule.RuleMessage{
	Id:          "noForOfLoops",
	Description: "Avoid imperative logic in for..of loops.",
	Help:        "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values.",
}

var NoForOfLoopsRule = rule.Rule{
	Name: "no-for-of-loops",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindForOfStatement: func(node *ast.Node) {
			message := synchronousMessage
			if node.AsForInOrOfStatement().AwaitModifier != nil {
				message = asynchronousMessage
			}
			ctx.ReportNode(node, message)
		}}
	},
}
