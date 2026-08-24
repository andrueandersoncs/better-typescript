package raw_fetch_outside_adapter

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var Rule = rule.Rule{Name: "raw-fetch-outside-adapter", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if !isFetch(node, ctx.SourceFile.Text()) || isAdapter(ctx.SourceFile.FileName()) || insideTryPromise(node, ctx.SourceFile.Text()) {
			return
		}
		ctx.ReportNode(node.AsCallExpression().Expression, rule.RuleMessage{Id: "raw-fetch-outside-adapter", Description: "Keep raw fetch in an adapter.", Help: "Move raw fetch behind a named adapter boundary or use Effect HttpClient."})
	}}
}}

func isFetch(node *ast.Node, text string) bool {
	c := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(text, node.AsCallExpression().Expression, false))
	return c == "fetch" || c == "globalThis.fetch" || c == "window.fetch" || c == "self.fetch"
}
func isAdapter(name string) bool {
	for _, part := range strings.Split(filepath.ToSlash(name), "/") {
		if part == "adapter" || part == "adapters" {
			return true
		}
	}
	return false
}
func insideTryPromise(node *ast.Node, text string) bool {
	for p := node.Parent; p != nil; p = p.Parent {
		if ast.IsCallExpression(p) {
			c := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(text, p.AsCallExpression().Expression, false))
			if c == "Effect.tryPromise" || c == "tryPromise" {
				return true
			}
		}
		if ast.IsFunctionLike(p) && p != node.Parent {
			break
		}
	}
	return false
}
