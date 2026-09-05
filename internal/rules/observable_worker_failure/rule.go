package observable_worker_failure

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "observable-worker-failure",
	Description: "Make worker failures observable.",
	Help:        "Log the ignored failure or make the skip policy explicit at the owning worker boundary.",
}

var Rule = rule.Rule{
	Name: "observable-worker-failure",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		report := func(node *ast.Node, ignoresCause bool) {
			if hasLoggedIgnoreOption(node) || hasDirectFailureObservation(ctx, node, ignoresCause) {
				return
			}
			if ast.IsCallExpression(node) {
				ctx.ReportNode(node.AsCallExpression().Expression, message)
				return
			}
			ctx.ReportNode(node, message)
		}
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				ignoresCause := isEffectCall(ctx, node, "ignoreCause")
				if isEffectCall(ctx, node, "ignore") || ignoresCause {
					report(node, ignoresCause)
				}
			},
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				if node.Parent != nil && ast.IsCallExpression(node.Parent) && node.Parent.AsCallExpression().Expression == node {
					return
				}
				ignoresCause := isEffectValue(ctx, node, "ignoreCause")
				if isEffectValue(ctx, node, "ignore") || ignoresCause {
					report(node, ignoresCause)
				}
			},
		}
	},
}

func hasLoggedIgnoreOption(node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}
	observed := false
	for _, argument := range node.AsCallExpression().Arguments.Nodes {
		option := unwrap(argument)
		if !ast.IsObjectLiteralExpression(option) {
			continue
		}
		for _, property := range option.AsObjectLiteralExpression().Properties.Nodes {
			if ast.IsSpreadAssignment(property) {
				observed = false
				continue
			}
			if !ast.IsPropertyAssignment(property) {
				continue
			}
			name, ok := ast.TryGetTextOfPropertyName(property.Name())
			if !ok || name != "log" {
				continue
			}
			value := unwrap(property.AsPropertyAssignment().Initializer)
			observed = value.Kind == ast.KindTrueKeyword || ast.IsStringLiteralLike(value)
		}
	}
	return observed
}

func hasDirectFailureObservation(ctx rule.RuleContext, ignore *ast.Node, observesCause bool) bool {
	tap := "tapError"
	if observesCause {
		tap = "tapCause"
	}
	if ast.IsCallExpression(ignore) {
		arguments := ignore.AsCallExpression().Arguments.Nodes
		if len(arguments) > 0 && !ast.IsObjectLiteralExpression(unwrap(arguments[0])) {
			return isObservedEffect(ctx, arguments[0], tap)
		}
	}
	pipe, index := enclosingPipeStep(ignore)
	if pipe == nil || index == 0 {
		return false
	}
	return isDirectTapLog(ctx, pipe.AsCallExpression().Arguments.Nodes[index-1], tap)
}

func enclosingPipeStep(step *ast.Node) (*ast.Node, int) {
	parent := step.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return nil, 0
	}
	callee := unwrap(parent.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return nil, 0
	}
	for index, argument := range parent.AsCallExpression().Arguments.Nodes {
		if argument == step {
			return parent, index
		}
	}
	return nil, 0
}

func isObservedEffect(ctx rule.RuleContext, effect *ast.Node, tap string) bool {
	effect = unwrap(effect)
	if effect == nil || !ast.IsCallExpression(effect) {
		return false
	}
	if isEffectCall(ctx, effect, tap) {
		arguments := effect.AsCallExpression().Arguments.Nodes
		return len(arguments) == 2 && isEffectValue(ctx, arguments[1], "logError")
	}
	callee := unwrap(effect.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return false
	}
	arguments := effect.AsCallExpression().Arguments.Nodes
	return len(arguments) > 0 && isDirectTapLog(ctx, arguments[len(arguments)-1], tap)
}

func isDirectTapLog(ctx rule.RuleContext, node *ast.Node, tap string) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) || !isEffectCall(ctx, node, tap) {
		return false
	}
	arguments := node.AsCallExpression().Arguments.Nodes
	return len(arguments) == 1 && isEffectValue(ctx, arguments[0], "logError")
}

func isEffectCall(ctx rule.RuleContext, node *ast.Node, name string) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	return isEffectSymbol(ctx, callee, name)
}

func isEffectValue(ctx rule.RuleContext, node *ast.Node, name string) bool {
	node = unwrap(node)
	if node == nil {
		return false
	}
	if ast.IsPropertyAccessExpression(node) {
		return isEffectSymbol(ctx, node.AsPropertyAccessExpression().Name(), name)
	}
	return isEffectSymbol(ctx, node, name)
}

func isEffectSymbol(ctx rule.RuleContext, node *ast.Node, name string) bool {
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
		if (base == "Effect.ts" || base == "Effect.d.ts" || base == "index.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
