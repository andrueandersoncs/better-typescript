package prefer_eta_reduction

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var etaMessage = rule.RuleMessage{Id: "prefer-eta-reduction", Description: "Avoid wrapping a function call that only forwards its argument.", Help: "Eta-reduce this arrow to the function value itself (pass f instead of (x) => f(x)). If the callee is already partially applied, use that partial directly. Do not nest calls."}
var flowMessage = rule.RuleMessage{Id: "prefer-eta-reduction", Description: "Avoid wrapping a function call that only forwards its argument.", Help: "Replace this nested unary call tower with flow(...steps) left-to-right (innermost callee first). Do not nest the calls."}

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
func count(source *ast.SourceFile, n *ast.Node, name string) int {
	c := 0
	if ast.IsIdentifier(n) && n.Text() == name {
		c++
	}
	ast.ForEachChildAndJSDoc(n, source, func(ch *ast.Node) bool { c += count(source, ch, name); return false })
	return c
}
func bodyExpr(fn *ast.ArrowFunction) *ast.Node {
	if ast.IsBlock(fn.Body) {
		return nil
	}
	return fn.Body
}
func tower(ctx rule.RuleContext, n *ast.Node, name string) (int, bool) {
	n = unwrap(n)
	if n == nil || !ast.IsCallExpression(n) {
		return 0, false
	}
	c := n.AsCallExpression()
	callee := unwrap(c.Expression)
	if ast.IsPropertyAccessExpression(callee) {
		symbol := ctx.TypeChecker.GetSymbolAtLocation(callee.AsPropertyAccessExpression().Name())
		if symbol != nil && symbol.Flags&ast.SymbolFlagsMethod != 0 {
			return 0, false
		}
	}
	if len(c.Arguments.Nodes) != 1 || count(ctx.SourceFile, c.Expression, name) > 0 {
		return 0, false
	}
	arg := unwrap(c.Arguments.Nodes[0])
	if ast.IsIdentifier(arg) && arg.Text() == name {
		return 1, true
	}
	inner, ok := tower(ctx, arg, name)
	if !ok {
		return 0, false
	}
	return inner + 1, true
}

var PreferEtaReductionRule = rule.Rule{Name: "prefer-eta-reduction", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindArrowFunction: func(node *ast.Node) {
		fn := node.AsArrowFunction()
		if len(fn.Parameters.Nodes) != 1 {
			return
		}
		p := fn.Parameters.Nodes[0].AsParameterDeclaration()
		if p.DotDotDotToken != nil || p.Initializer != nil || p.QuestionToken != nil || !ast.IsIdentifier(p.Name()) {
			return
		}
		name := p.Name().Text()
		body := bodyExpr(fn)
		if body == nil || count(ctx.SourceFile, body, name) != 1 {
			return
		}
		steps, ok := tower(ctx, body, name)
		if !ok {
			return
		}
		if steps == 1 {
			ctx.ReportNode(node, etaMessage)
		} else {
			ctx.ReportNode(node, flowMessage)
		}
	}}
}}

var Rule = PreferEtaReductionRule
