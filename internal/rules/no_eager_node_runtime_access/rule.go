package no_eager_node_runtime_access

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-eager-node-runtime-access",
	Description: "Avoid Node runtime access during module initialization.",
	Help:        "Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.",
}

var runtimeModules = map[string]bool{
	"fs":               true,
	"fs/promises":      true,
	"node:fs":          true,
	"node:fs/promises": true,
	"node:os":          true,
	"os":               true,
}

var Rule = rule.Rule{Name: "no-eager-node-runtime-access", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if executesDuringModuleInitialization(node) && runtimeCallee(ctx, node.AsCallExpression().Expression) {
			ctx.ReportNode(node, message)
		}
	}}
}}

func executesDuringModuleInitialization(node *ast.Node) bool {
	child := node
	inDecorator := false
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsDecorator(current) {
			inDecorator = true
		}
		if ast.IsFunctionLike(current) {
			if !inDecorator && current.Name() != child && !isImmediatelyInvoked(current) {
				return false
			}
		}
		if current.Kind == ast.KindPropertyDeclaration && !inDecorator && current.Name() != child && !ast.HasSyntacticModifier(current, ast.ModifierFlagsStatic) {
			return false
		}
		if inDecorator && (ast.IsFunctionLike(current) || current.Kind == ast.KindPropertyDeclaration || ast.IsClassLike(current)) {
			inDecorator = false
		}
		if ast.IsSourceFile(current) {
			return true
		}
		child = current
	}
	return false
}

func isImmediatelyInvoked(node *ast.Node) bool {
	if body := node.BodyData(); body != nil && body.AsteriskToken != nil {
		return false
	}
	expression := node
	parent := expression.Parent
	for isExpressionWrapper(parent) && parent.Expression() == expression {
		expression = parent
		parent = expression.Parent
	}
	if parent == nil || !ast.IsCallExpression(parent) {
		return false
	}
	return unwrap(parent.AsCallExpression().Expression) == node
}

func isExpressionWrapper(node *ast.Node) bool {
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression:
		return true
	default:
		return false
	}
}

func runtimeCallee(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		return importedFromRuntimeModule(ctx, node)
	}
	root := accessRoot(node)
	return root != nil && importedFromRuntimeModule(ctx, root)
}

func importedFromRuntimeModule(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		for current := declaration; current != nil && !ast.IsSourceFile(current); current = current.Parent {
			if !ast.IsImportDeclaration(current) {
				continue
			}
			module := current.AsImportDeclaration().ModuleSpecifier
			return module != nil && runtimeModules[module.Text()]
		}
	}
	return false
}

func accessRoot(node *ast.Node) *ast.Node {
	node = unwrap(node)
	for node != nil {
		if ast.IsIdentifier(node) {
			return node
		}
		if ast.IsPropertyAccessExpression(node) {
			node = unwrap(node.AsPropertyAccessExpression().Expression)
			continue
		}
		if ast.IsElementAccessExpression(node) {
			node = unwrap(node.AsElementAccessExpression().Expression)
			continue
		}
		return nil
	}
	return nil
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
