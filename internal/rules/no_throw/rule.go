package no_throw

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{
	Name: "no-throw",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindThrowStatement: func(node *ast.Node) {
			ctx.ReportNode(node, rule.RuleMessage{Id: "no-throw", Description: "Avoid throwing errors with throw.", Help: "Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: class CustomError extends Schema.TaggedErrorClass<CustomError>()(\"CustomError\", {}) {}; yield* new CustomError()."})
		}}
	},
}
