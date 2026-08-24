package prefer_layer_unwrap

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"strings"
)

var message = rule.RuleMessage{Id: "prefer-layer-unwrap", Description: "Flatten an Effect that produces a Layer with Layer.unwrap.", Help: "Replace the manual Layer.effect and Layer.flatMap bridge with Layer.unwrap(effect)."}

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
func accessName(node *ast.Node) (*ast.Node, string, bool) {
	node = unwrap(node)
	if ast.IsPropertyAccessExpression(node) {
		name := node.AsPropertyAccessExpression().Name()
		return name, name.Text(), true
	}
	if ast.IsElementAccessExpression(node) {
		argument := node.AsElementAccessExpression().ArgumentExpression
		if ast.IsStringLiteral(argument) {
			return argument, argument.AsStringLiteral().Text, true
		}
	}
	return nil, "", false
}
func effectMember(ctx rule.RuleContext, n *ast.Node, want string) bool {
	name, text, ok := accessName(n)
	if !ok || text != want {
		return false
	}
	s := ctx.TypeChecker.GetSymbolAtLocation(name)
	if s == nil {
		return false
	}
	if s.Flags&ast.SymbolFlagsAlias != 0 {
		s = ctx.TypeChecker.GetAliasedSymbol(s)
	}
	if s.Name != want {
		return false
	}
	for _, d := range s.Declarations {
		f := strings.ReplaceAll(ast.GetSourceFileOfNode(d).FileName(), "\\", "/")
		if strings.Contains(f, "/node_modules/effect/") || strings.Contains(f, "/effect/src/") || strings.Contains(f, "/effect/dist/") {
			return true
		}
	}
	return false
}
func apiCall(ctx rule.RuleContext, n *ast.Node, name string) (*ast.CallExpression, bool) {
	n = unwrap(n)
	if n == nil || !ast.IsCallExpression(n) {
		return nil, false
	}
	c := n.AsCallExpression()
	return c, effectMember(ctx, c.Expression, name)
}
func layerEffectParts(ctx rule.RuleContext, node *ast.Node) (*ast.Node, *ast.Node, bool) {
	unwrapped := unwrap(node)
	if unwrapped == nil || !ast.IsCallExpression(unwrapped) {
		return nil, nil, false
	}
	call := unwrapped.AsCallExpression()
	if effectMember(ctx, call.Expression, "effect") && len(call.Arguments.Nodes) >= 2 {
		return call.Arguments.Nodes[0], call.Arguments.Nodes[1], true
	}
	if len(call.Arguments.Nodes) == 1 {
		inner, innerOK := apiCall(ctx, call.Expression, "effect")
		if innerOK && len(inner.Arguments.Nodes) == 1 {
			return inner.Arguments.Nodes[0], call.Arguments.Nodes[0], true
		}
	}
	return nil, nil, false
}
func flatMapParts(ctx rule.RuleContext, node *ast.Node) (*ast.Node, *ast.Node, bool) {
	unwrapped := unwrap(node)
	if unwrapped == nil || !ast.IsCallExpression(unwrapped) {
		return nil, nil, false
	}
	call := unwrapped.AsCallExpression()
	if effectMember(ctx, call.Expression, "flatMap") && len(call.Arguments.Nodes) >= 2 {
		return call.Arguments.Nodes[0], call.Arguments.Nodes[1], true
	}
	if len(call.Arguments.Nodes) != 1 {
		return nil, nil, false
	}
	if inner, innerOK := apiCall(ctx, call.Expression, "flatMap"); innerOK && len(inner.Arguments.Nodes) == 1 {
		return call.Arguments.Nodes[0], inner.Arguments.Nodes[0], true
	}
	if !effectMember(ctx, call.Expression, "flatMap") {
		return nil, nil, false
	}
	parent := node.Parent
	if parent != nil && ast.IsCallExpression(parent) {
		outer := parent.AsCallExpression()
		if ast.IsPropertyAccessExpression(outer.Expression) && outer.Expression.AsPropertyAccessExpression().Name().Text() == "pipe" {
			return outer.Expression.AsPropertyAccessExpression().Expression, call.Arguments.Nodes[0], true
		}
		if ast.IsIdentifier(outer.Expression) && outer.Expression.Text() == "pipe" && len(outer.Arguments.Nodes) > 0 {
			for _, argument := range outer.Arguments.Nodes[1:] {
				if argument == node {
					return outer.Arguments.Nodes[0], call.Arguments.Nodes[0], true
				}
			}
		}
	}
	return nil, nil, false
}
func sameSymbol(ctx rule.RuleContext, a, b *ast.Node) bool {
	x := ctx.TypeChecker.GetSymbolAtLocation(a)
	y := ctx.TypeChecker.GetSymbolAtLocation(b)
	if x != nil && x.Flags&ast.SymbolFlagsAlias != 0 {
		x = ctx.TypeChecker.GetAliasedSymbol(x)
	}
	if y != nil && y.Flags&ast.SymbolFlagsAlias != 0 {
		y = ctx.TypeChecker.GetAliasedSymbol(y)
	}
	return x != nil && x == y
}

var PreferLayerUnwrapRule = rule.Rule{
	Name: "prefer-layer-unwrap",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			sourceNode, mapperNode, ok := flatMapParts(ctx, node)
			if !ok {
				return
			}
			key, produced, ok := layerEffectParts(ctx, sourceNode)
			if !ok {
				return
			}
			get, ok := apiCall(ctx, mapperNode, "get")
			if !ok || len(get.Arguments.Nodes) != 1 || !sameSymbol(ctx, key, get.Arguments.Nodes[0]) {
				return
			}
			t := ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(produced))
			if !strings.Contains(t, "Effect<") || !strings.Contains(t, "Layer<") {
				return
			}
			ctx.ReportNode(node, message)
		}}
	},
}

var Rule = PreferLayerUnwrapRule
