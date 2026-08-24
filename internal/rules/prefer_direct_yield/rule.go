package prefer_direct_yield

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{Name: "prefer-direct-yield", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindVariableDeclaration: func(node *ast.Node) {
		declaration := node.AsVariableDeclaration()
		if declaration.Initializer == nil || node.Parent == nil || !ast.IsVariableDeclarationList(node.Parent) || node.Parent.Flags&ast.NodeFlagsConst == 0 {
			return
		}
		name := node.Name()
		if name == nil || !ast.IsIdentifier(name) {
			return
		}
		generator := enclosingEffectGenerator(ctx, node)
		if generator == nil {
			return
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
		if symbol == nil {
			return
		}
		var refs []*ast.Node
		walk(generator, func(candidate *ast.Node) {
			if candidate != name && ast.IsIdentifier(candidate) && ctx.TypeChecker.GetSymbolAtLocation(candidate) == symbol {
				refs = append(refs, candidate)
			}
		})
		if len(refs) != 1 || refs[0].Parent == nil || !ast.IsYieldExpression(refs[0].Parent) {
			return
		}
		yield := refs[0].Parent.AsYieldExpression()
		if yield.AsteriskToken == nil || yield.Expression != refs[0] {
			return
		}
		ctx.ReportNode(name, rule.RuleMessage{Id: "prefer-direct-yield", Description: "Avoid binding an Effect only to yield* it.", Help: "Write const result = yield* expression (or yield* expression when the result is unused) instead of naming a temporary Effect and yielding that name. Keep extracting nested call arguments into their own consts so no-nested-calls stays satisfied."})
	}}
}}

func walk(node *ast.Node, visit func(*ast.Node)) {
	visit(node)
	for child := range node.IterChildren() {
		walk(child, visit)
	}
}
func enclosingEffectGenerator(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionExpression(current) {
			if current.BodyData().AsteriskToken == nil {
				return nil
			}
			if isEffectGeneratorArgument(ctx, current) {
				return current
			}
			return nil
		}
		if ast.IsArrowFunction(current) || ast.IsMethodDeclaration(current) || ast.IsFunctionDeclaration(current) {
			return nil
		}
	}
	return nil
}
func isEffectGeneratorArgument(ctx rule.RuleContext, fn *ast.Node) bool {
	parent := fn.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return false
	}
	call := parent.AsCallExpression()
	for _, arg := range call.Arguments.Nodes {
		if arg != fn {
			continue
		}
		if effectMethod(ctx, call.Expression, "gen") {
			return true
		}
		callee := unwrap(call.Expression)
		return ast.IsCallExpression(callee) && effectMethod(ctx, callee.AsCallExpression().Expression, "fn")
	}
	return false
}
func effectMethod(ctx rule.RuleContext, callee *ast.Node, method string) bool {
	callee = unwrap(callee)
	if !ast.IsPropertyAccessExpression(callee) || propertyName(callee) != method {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(callee.Name())
	if symbol == nil {
		return false
	}
	for _, d := range symbol.Declarations {
		if f := ast.GetSourceFileOfNode(d); f != nil && strings.Contains(strings.ReplaceAll(f.FileName(), "\\", "/"), "/node_modules/effect/") {
			return true
		}
	}
	return false
}
func propertyName(node *ast.Node) string {
	name := node.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil && ast.IsParenthesizedExpression(node) {
		node = node.Expression()
	}
	return node
}

var PreferDirectYieldRule = Rule
