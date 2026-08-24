package prefer_function_flip

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "prefer-function-flip", Description: "Avoid lambdas that only flip the order of a curried application.", Help: "Reorder the curried parameters so the fixed argument comes first (data-last), then pass the partial f(y) directly — or use Function.flip(f)(y) instead of (x) => f(x)(y)."}

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

var PreferFunctionFlipRule = rule.Rule{
	Name: "prefer-function-flip",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
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
			body := unwrap(bodyExpr(fn))
			if body == nil || !ast.IsCallExpression(body) {
				return
			}
			outer := body.AsCallExpression()
			if len(outer.Arguments.Nodes) != 1 || count(ctx.SourceFile, outer.Arguments.Nodes[0], name) > 0 {
				return
			}
			innerNode := unwrap(outer.Expression)
			if !ast.IsCallExpression(innerNode) {
				return
			}
			inner := innerNode.AsCallExpression()
			if len(inner.Arguments.Nodes) != 1 {
				return
			}
			arg := unwrap(inner.Arguments.Nodes[0])
			if !ast.IsIdentifier(arg) || arg.Text() != name || count(ctx.SourceFile, inner.Expression, name) > 0 || count(ctx.SourceFile, body, name) != 1 {
				return
			}
			if ast.IsPropertyAccessExpression(unwrap(inner.Expression)) {
				return
			}
			ctx.ReportNode(node, message)
		}}
	},
}

var Rule = PreferFunctionFlipRule
