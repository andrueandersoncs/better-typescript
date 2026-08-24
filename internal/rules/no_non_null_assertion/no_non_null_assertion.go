package no_non_null_assertion

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{Id: "no-non-null-assertion", Description: "Avoid non-null assertions.", Help: "The ! operator silences the type checker instead of handling the absent case, trading a compile-time proof for a runtime crash. Convert the nullable value with Option.fromNullishOr and handle both branches (Option.match, Option.getOrElse), or narrow it with a type guard the checker verifies."}
var Rule = rule.Rule{Name: "no-non-null-assertion", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindNonNullExpression: func(node *ast.Node) { ctx.ReportNode(node, message) }}
}}
