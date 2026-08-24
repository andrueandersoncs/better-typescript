package retry_without_jitter

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var Rule = rule.Rule{Name: "retry-without-jitter", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		callee := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), call.Expression, false))
		if callee != "Effect.retry" && callee != "retry" {
			return
		}
		text := scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), node, false)
		backoff := strings.Contains(text, "Schedule.exponential") || strings.Contains(text, "Schedule.fibonacci")
		if backoff && !strings.Contains(text, "Schedule.jittered") && !strings.Contains(text, ".jittered") {
			ctx.ReportNode(call.Expression, rule.RuleMessage{Id: "retry-without-jitter", Description: "Jitter exponential retry.", Help: "Add Schedule.jittered to the bounded backoff schedule."})
		}
	}}
}}
