package no_try_catch

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{
	Name: "no-try-catch",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindTryStatement: func(node *ast.Node) {
			ctx.ReportNode(node, rule.RuleMessage{Id: "no-try-catch", Description: "Avoid try/catch for error handling.", Help: "Model effectful code that can fail as an Effect and declare its failures as explicit Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()(\"FetchError\", {}) {}. Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."})
		}}
	},
}
