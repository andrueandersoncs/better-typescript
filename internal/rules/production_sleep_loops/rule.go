package production_sleep_loops

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var Rule = rule.Rule{Name: "production-sleep-loops", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		callee := scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), call.Expression, false)
		if callee != "Effect.sleep" && callee != "sleep" {
			return
		}
		for parent := node.Parent; parent != nil; parent = parent.Parent {
			if ast.IsWhileStatement(parent) && strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), parent.AsWhileStatement().Expression, false)) == "true" {
				ctx.ReportNode(node, message())
				return
			}
			if ast.IsForStatement(parent) && parent.AsForStatement().Condition == nil {
				ctx.ReportNode(node, message())
				return
			}
			if ast.IsFunctionLike(parent) {
				return
			}
		}
	}}
}}

func message() rule.RuleMessage {
	return rule.RuleMessage{Id: "production-sleep-loops", Description: "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat.", Help: "Express repetition, pacing, and backoff as an Effect Schedule."}
}
