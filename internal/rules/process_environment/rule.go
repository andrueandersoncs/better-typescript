package process_environment

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"path/filepath"
	"strings"
)

var message = rule.RuleMessage{Id: "process-environment", Description: "Read runtime configuration through Effect Config, not process.env.", Help: "Read the key in a Config-backed layer and provide deterministic config in tests."}

func unwrap(n *ast.Node) *ast.Node {
	for n != nil {
		switch n.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression:
			n = n.Expression()
		default:
			return n
		}
	}
	return n
}
func accessReceiver(n *ast.Node) *ast.Node {
	if ast.IsPropertyAccessExpression(n) {
		return n.AsPropertyAccessExpression().Expression
	}
	if ast.IsElementAccessExpression(n) {
		return n.AsElementAccessExpression().Expression
	}
	return nil
}
func accessName(n *ast.Node) string {
	if ast.IsPropertyAccessExpression(n) {
		return n.AsPropertyAccessExpression().Name().Text()
	}
	if ast.IsElementAccessExpression(n) {
		a := n.AsElementAccessExpression().ArgumentExpression
		if ast.IsStringLiteral(a) {
			return a.AsStringLiteral().Text
		}
	}
	return ""
}
func isProcessEnv(ctx rule.RuleContext, processSymbol *ast.Symbol, n *ast.Node) bool {
	n = unwrap(n)
	if !ast.IsAccessExpression(n) {
		return false
	}
	recv := unwrap(accessReceiver(n))
	if accessName(n) == "env" && ast.IsIdentifier(recv) && recv.Text() == "process" {
		return processSymbol == nil || ctx.TypeChecker.GetSymbolAtLocation(recv) == processSymbol
	}
	return isProcessEnv(ctx, processSymbol, recv)
}
func isOutermost(n *ast.Node) bool {
	p := n.Parent
	for p != nil {
		switch p.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression:
			p = p.Parent
			continue
		}
		break
	}
	return p == nil || !ast.IsAccessExpression(p) || unwrap(accessReceiver(p)) != n
}
func production(file string) bool {
	s := strings.ToLower(filepath.ToSlash(file))
	base := filepath.Base(s)
	if base == "main.ts" || base == "main.tsx" || base == "bootstrap.ts" || base == "bootstrap.tsx" || base == "wiring.ts" || base == "wiring.tsx" {
		return false
	}
	for _, segment := range []string{"/test/", "/tests/", "/__tests__/", "/entrypoint/", "/entrypoints/", "/composition/", "/composition-root/"} {
		if strings.Contains(s, segment) {
			return false
		}
	}
	return !strings.HasSuffix(s, ".test.ts") && !strings.HasSuffix(s, ".test.tsx") && !strings.HasSuffix(s, ".spec.ts") && !strings.HasSuffix(s, ".spec.tsx")
}

var ProcessEnvironmentRule = rule.Rule{Name: "process-environment", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	processSymbol := ctx.TypeChecker.ResolveName("process", nil, ast.SymbolFlagsValue, false)
	check := func(n *ast.Node) {
		if production(ctx.SourceFile.FileName()) && isOutermost(n) && isProcessEnv(ctx, processSymbol, n) {
			ctx.ReportNode(n, message)
		}
	}
	return rule.RuleListeners{ast.KindPropertyAccessExpression: check, ast.KindElementAccessExpression: check}
}}

var Rule = ProcessEnvironmentRule
