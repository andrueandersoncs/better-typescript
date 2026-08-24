package no_async_functions

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "noAsyncFunctions",
	Description: "Avoid declaring functions as async.",
	Help:        "Model asynchronous work with Effect instead of async/await. To integrate with a third-party library: wrap incoming promises with Effect.tryPromise; satisfy an outgoing Promise-returning callback contract with a non-async function that returns Effect.runPromise(effect).",
}

var NoAsyncFunctionsRule = rule.Rule{
	Name: "no-async-functions",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindAsyncKeyword: func(node *ast.Node) {
				parent := node.Parent
				if parent != nil && (ast.IsFunctionDeclaration(parent) || ast.IsFunctionExpression(parent) || ast.IsArrowFunction(parent) || ast.IsMethodDeclaration(parent)) {
					ctx.ReportNode(node, message)
				}
			},
		}
	},
}
