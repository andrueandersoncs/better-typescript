package prefer_effectful_function

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"strings"
)

func effectSymbol(ctx rule.RuleContext, n *ast.Node) bool {
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
func singleResult(body *ast.Node) *ast.Node {
	if body == nil {
		return nil
	}
	if !ast.IsBlock(body) {
		return body
	}
	b := body.AsBlock()
	if len(b.Statements.Nodes) != 1 || !ast.IsReturnStatement(b.Statements.Nodes[0]) {
		return nil
	}
	return b.Statements.Nodes[0].AsReturnStatement().Expression
}
func runSync(ctx rule.RuleContext, n *ast.Node) bool {
	n = unwrap(n)
	if n == nil || !ast.IsCallExpression(n) {
		return false
	}
	c := n.AsCallExpression()
	callee := unwrap(c.Expression)
	var name *ast.Node
	if ast.IsIdentifier(callee) {
		name = callee
	} else if ast.IsPropertyAccessExpression(callee) {
		name = callee.AsPropertyAccessExpression().Name()
	}
	return name != nil && name.Text() == "runSync" && effectSymbol(ctx, name)
}
func check(ctx rule.RuleContext, node, name, body *ast.Node) {
	if name == nil || !ast.IsIdentifier(name) || !runSync(ctx, singleResult(body)) {
		return
	}
	ctx.ReportNode(name, rule.RuleMessage{Id: "prefer-effectful-function", Description: fmt.Sprintf("Avoid synchronously unwrapping an Effect in %s.", name.Text()), Help: fmt.Sprintf("Return the Effect from %s and compose callers with yield* or Effect.flatMap. Reserve Effect.runSync for the application runtime boundary.", name.Text())})
}

var PreferEffectfulFunctionRule = rule.Rule{Name: "prefer-effectful-function", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindFunctionDeclaration: func(node *ast.Node) {
			check(ctx, node, node.Name(), node.Body())
		},
		ast.KindVariableDeclaration: func(node *ast.Node) {
			d := node.AsVariableDeclaration()
			if d.Type != nil || d.Initializer == nil {
				return
			}
			init := unwrap(d.Initializer)
			if !ast.IsArrowFunction(init) && !ast.IsFunctionExpression(init) {
				return
			}
			check(ctx, node, d.Name(), init.Body())
		},
	}
}}

var Rule = PreferEffectfulFunctionRule
