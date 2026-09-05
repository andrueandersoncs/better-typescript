package raw_fetch_abort_signal

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "raw-fetch-abort-signal",
	Description: "Pass Effect.tryPromise's AbortSignal to raw fetch.",
	Help:        "Pass the tryPromise or enclosing HttpClient.make signal as fetch's init.signal.",
}

var Rule = rule.Rule{Name: "raw-fetch-abort-signal", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		target, ok := rawFetch(ctx, node)
		if !ok {
			return
		}
		callback := enclosingFunction(node)
		if callback == nil || !isTryPromiseCallback(ctx, callback) {
			return
		}
		signals := map[*ast.Symbol]bool{}
		if signal := functionSignal(ctx, callback, 0); signal != nil {
			signals[signal] = true
		}
		if signal := enclosingRunnerSignal(ctx, callback); signal != nil {
			signals[signal] = true
		}
		if !passesSignal(ctx, node.AsCallExpression(), signals) {
			ctx.ReportNode(target, message)
		}
	}}
}}

func rawFetch(ctx rule.RuleContext, node *ast.Node) (*ast.Node, bool) {
	callee := unwrap(node.AsCallExpression().Expression)
	var target *ast.Node
	switch {
	case ast.IsIdentifier(callee):
		target = callee
	case ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil:
		target = callee.AsPropertyAccessExpression().Name()
	default:
		return nil, false
	}
	return target, isBuiltinSymbol(ctx, target, "fetch", "")
}

func passesSignal(ctx rule.RuleContext, call *ast.CallExpression, allowed map[*ast.Symbol]bool) bool {
	if call.Arguments == nil || len(call.Arguments.Nodes) < 2 {
		return false
	}
	init := unwrap(call.Arguments.Nodes[1])
	if !ast.IsObjectLiteralExpression(init) {
		return !isBuiltinUndefined(ctx, init)
	}
	state := 0
	for _, property := range init.AsObjectLiteralExpression().Properties.Nodes {
		if ast.IsSpreadAssignment(property) {
			state = 3
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(property.Name())
		if !ok || name != "signal" {
			continue
		}
		switch property.Kind {
		case ast.KindShorthandPropertyAssignment:
			if allowed[checker.Checker_GetShorthandAssignmentValueSymbol(ctx.TypeChecker, property)] {
				state = 1
			} else {
				state = 2
			}
		case ast.KindPropertyAssignment:
			value := unwrap(property.AsPropertyAssignment().Initializer)
			if value != nil && ast.IsIdentifier(value) && allowed[ctx.TypeChecker.GetSymbolAtLocation(value)] {
				state = 1
			} else {
				state = 2
			}
		default:
			state = 3
		}
	}
	return state == 1 || state == 3
}

func enclosingRunnerSignal(ctx rule.RuleContext, callback *ast.Node) *ast.Symbol {
	for current := callback.Parent; current != nil; current = current.Parent {
		if !ast.IsFunctionLike(current) {
			continue
		}
		if !isHttpClientMakeRunner(ctx, current) {
			return nil
		}
		return functionSignal(ctx, current, 2)
	}
	return nil
}

func functionSignal(ctx rule.RuleContext, function *ast.Node, index int) *ast.Symbol {
	for _, parameter := range function.Parameters() {
		name := parameter.Name()
		if name == nil || !ast.IsIdentifier(name) {
			return nil
		}
		if name.Text() == "this" {
			continue
		}
		if index == 0 {
			return ctx.TypeChecker.GetSymbolAtLocation(name)
		}
		index--
	}
	return nil
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
		if !ok || name != "try" {
			return false
		}
		return isTryPromiseObject(ctx, parent.Parent)
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
	if target == nil || !ast.IsIdentifier(target) {
		return false
	}
	return isBuiltinSymbol(ctx, target, name, fileBase)
}

func isBuiltinUndefined(ctx rule.RuleContext, node *ast.Node) bool {
	return node != nil && utils.IsTypeFlagSet(ctx.TypeChecker.GetTypeAtLocation(node), checker.TypeFlagsUndefined)
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
