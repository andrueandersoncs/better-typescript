package prefer_pipe_function

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"strings"
)

var message = rule.RuleMessage{Id: "prefer-pipe-function", Description: "Avoid calling .pipe() as a method.", Help: "Import pipe from \"effect\" and call it as a standalone function: pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."}

func fromEffect(ctx rule.RuleContext, n *ast.Node) bool {
	s := ctx.TypeChecker.GetSymbolAtLocation(n)
	if s == nil {
		return false
	}
	if s.Flags&ast.SymbolFlagsAlias != 0 {
		s = ctx.TypeChecker.GetAliasedSymbol(s)
	}
	for _, d := range s.Declarations {
		f := strings.ReplaceAll(ast.GetSourceFileOfNode(d).FileName(), "\\", "/")
		if strings.Contains(f, "/node_modules/effect/") || strings.Contains(f, "/effect/src/") || strings.Contains(f, "/effect/dist/") {
			return true
		}
	}
	return false
}

var PreferPipeFunctionRule = rule.Rule{Name: "prefer-pipe-function", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		c := node.AsCallExpression()
		if !ast.IsPropertyAccessExpression(c.Expression) {
			return
		}
		a := c.Expression.AsPropertyAccessExpression()
		if a.Name().Text() == "pipe" && fromEffect(ctx, a.Name()) {
			ctx.ReportNode(a.Name(), message)
		}
	}}
}}

var Rule = PreferPipeFunctionRule
