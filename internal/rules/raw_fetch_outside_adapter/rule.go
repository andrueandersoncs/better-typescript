package raw_fetch_outside_adapter

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "raw-fetch-outside-adapter",
	Description: "Keep raw fetch in an adapter.",
	Help:        "Move raw fetch behind a named adapter boundary or use Effect HttpClient.",
}

var Rule = rule.Rule{Name: "raw-fetch-outside-adapter", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		target, ok := rawFetch(ctx, node)
		if !ok || isAdapterPath(ctx.SourceFile.FileName()) || isTryPromiseCallback(ctx, enclosingFunction(node)) || isHttpClientAdapter(ctx, node) {
			return
		}
		ctx.ReportNode(target, message)
	}}
}}

func rawFetch(ctx rule.RuleContext, node *ast.Node) (*ast.Node, bool) {
	callee := unwrap(node.AsCallExpression().Expression)
	var target *ast.Node
	if ast.IsIdentifier(callee) {
		target = callee
	} else if ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil {
		target = callee.AsPropertyAccessExpression().Name()
	} else {
		return nil, false
	}
	return target, isBuiltinSymbol(ctx, target, "fetch", "")
}

func isAdapterPath(name string) bool {
	for _, part := range strings.Split(filepath.ToSlash(name), "/") {
		if part == "adapter" || part == "adapters" {
			return true
		}
	}
	return false
}

func isHttpClientAdapter(ctx rule.RuleContext, node *ast.Node) bool {
	function := enclosingFunction(node)
	if isHttpClientMakeRunner(ctx, function) {
		return true
	}
	if !isTryPromiseCallback(ctx, function) {
		return false
	}
	for current := function.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return isHttpClientMakeRunner(ctx, current)
		}
	}
	return false
}

func isTryPromiseCallback(ctx rule.RuleContext, function *ast.Node) bool {
	if function == nil {
		return false
	}
	callback, parent := transparentFunctionParent(function)
	if parent != nil && ast.IsCallExpression(parent) {
		for _, argument := range parent.AsCallExpression().Arguments.Nodes {
			if argument == callback {
				return isEffectExport(ctx, parent.AsCallExpression().Expression, "tryPromise", "Effect")
			}
		}
	}
	if parent != nil && ast.IsPropertyAssignment(parent) && parent.AsPropertyAssignment().Initializer == callback {
		name, ok := ast.TryGetTextOfPropertyName(parent.Name())
		return ok && name == "try" && isTryPromiseObject(ctx, parent.Parent)
	}
	if parent != nil && ast.IsObjectLiteralExpression(parent) && callback == function && ast.IsMethodDeclaration(function) {
		name, ok := ast.TryGetTextOfPropertyName(function.Name())
		return ok && name == "try" && isTryPromiseObject(ctx, parent)
	}
	return false
}

func isTryPromiseObject(ctx rule.RuleContext, object *ast.Node) bool {
	if object == nil || !ast.IsObjectLiteralExpression(object) || object.Parent == nil || !ast.IsCallExpression(object.Parent) {
		return false
	}
	for _, argument := range object.Parent.AsCallExpression().Arguments.Nodes {
		if argument == object {
			return isEffectExport(ctx, object.Parent.AsCallExpression().Expression, "tryPromise", "Effect")
		}
	}
	return false
}

func isHttpClientMakeRunner(ctx rule.RuleContext, function *ast.Node) bool {
	if function == nil {
		return false
	}
	runner, parent := transparentFunctionParent(function)
	if parent == nil || !ast.IsCallExpression(parent) {
		return false
	}
	for _, argument := range parent.AsCallExpression().Arguments.Nodes {
		if argument == runner {
			return isEffectExport(ctx, parent.AsCallExpression().Expression, "make", "HttpClient")
		}
	}
	return false
}

func transparentFunctionParent(function *ast.Node) (*ast.Node, *ast.Node) {
	current := function
	parent := current.Parent
	for parent != nil && isTransparentWrapper(parent) && parent.Expression() == current {
		current = parent
		parent = current.Parent
	}
	return current, parent
}

func isTransparentWrapper(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
		return true
	default:
		return false
	}
}

func isEffectExport(ctx rule.RuleContext, expression *ast.Node, name, fileBase string) bool {
	target := unwrap(expression)
	if ast.IsPropertyAccessExpression(target) {
		target = target.AsPropertyAccessExpression().Name()
	}
	return target != nil && ast.IsIdentifier(target) && isBuiltinSymbol(ctx, target, name, fileBase)
}

func isBuiltinSymbol(ctx rule.RuleContext, node *ast.Node, name, effectFile string) bool {
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if effectFile == "" && (strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts") || strings.Contains(path, "/node_modules/@types/node/web-globals/fetch.d.ts")) {
			return true
		}
		if effectFile != "" && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) &&
			(base == effectFile+".ts" || base == effectFile+".d.ts") {
			return true
		}
	}
	return false
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
