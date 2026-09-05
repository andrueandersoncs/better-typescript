package layer_forever_acquisition

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "layerForeverAcquisition",
	Description: "Fork long-lived work into the layer scope so acquisition completes.",
	Help:        "Run the worker with Effect.forkScoped, FiberSet, or FiberMap.",
}

var LayerForeverAcquisitionRule = rule.Rule{
	Name: "layer-forever-acquisition",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		reported := map[*ast.Node]bool{}
		report := func(candidate *ast.Node) {
			layer := foregroundAcquisition(ctx, candidate)
			if layer == nil || reported[layer] {
				return
			}
			reported[layer] = true
			ctx.ReportNode(layer, message)
		}
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if isEffectCall(ctx, node, "forever") {
					report(node)
					return
				}
				if isStreamCall(ctx, node, "forever") && streamIsRun(ctx, node) {
					report(node)
				}
			},
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				if isEffectValue(ctx, node, "never") {
					report(node)
				}
			},
		}
	},
}

func foregroundAcquisition(ctx rule.RuleContext, candidate *ast.Node) *ast.Node {
	for current := candidate; current != nil; current = current.Parent {
		if ast.IsCallExpression(current) {
			if isScopedFork(ctx, current) || isColdEffectConstructor(ctx, current) || isTerminatingEffectCall(ctx, current) {
				return nil
			}
			if isLayerAcquisition(ctx, current) && isAcquisitionArgument(ctx, current, candidate) {
				return current
			}
		}
		if isFunctionLike(current) {
			if !isImmediateGenerator(ctx, current) || !isYieldedInGenerator(candidate, current) {
				return nil
			}
		}
	}
	return nil
}

func isAcquisitionArgument(ctx rule.RuleContext, call, descendant *ast.Node) bool {
	arguments := call.AsCallExpression().Arguments.Nodes
	if len(arguments) == 0 {
		return false
	}
	argumentIndex := 0
	if isLayerEffect(ctx, call) {
		if len(arguments) < 2 {
			return false
		}
		argumentIndex = 1
	}
	for current := descendant; current != nil && current != call; current = current.Parent {
		if current == arguments[argumentIndex] {
			return true
		}
	}
	return false
}

func isImmediateGenerator(ctx rule.RuleContext, node *ast.Node) bool {
	if !ast.IsFunctionExpression(node) && !ast.IsArrowFunction(node) {
		return false
	}
	call := node.Parent
	return call != nil && ast.IsCallExpression(call) && isEffectCall(ctx, call, "gen") && call.Parent != nil && ast.IsCallExpression(call.Parent) && isLayerAcquisition(ctx, call.Parent)
}

func isYieldedInGenerator(candidate, generator *ast.Node) bool {
	for current := candidate.Parent; current != nil && current != generator; current = current.Parent {
		if ast.IsYieldExpression(current) {
			return current.AsYieldExpression().AsteriskToken != nil
		}
		if ast.IsVariableDeclaration(current) || ast.IsReturnStatement(current) {
			return false
		}
	}
	return false
}

func isLayerAcquisition(ctx rule.RuleContext, node *ast.Node) bool {
	return isLayerEffect(ctx, node) || isEffectModuleCall(ctx, node, "Layer", "effectDiscard") || isEffectModuleCall(ctx, node, "Layer", "effectContext")
}

func isLayerEffect(ctx rule.RuleContext, node *ast.Node) bool {
	return isEffectModuleCall(ctx, node, "Layer", "effect") && len(node.AsCallExpression().Arguments.Nodes) >= 2
}

func isScopedFork(ctx rule.RuleContext, node *ast.Node) bool {
	if isEffectCall(ctx, node, "forkScoped") || isEffectCall(ctx, node, "forkIn") || isEffectCall(ctx, node, "forkChild") {
		return true
	}
	callee := unwrap(node.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return false
	}
	for _, argument := range node.AsCallExpression().Arguments.Nodes {
		if isEffectValue(ctx, argument, "forkScoped") || isEffectValue(ctx, argument, "forkChild") {
			return true
		}
	}
	return false
}

func streamIsRun(ctx rule.RuleContext, stream *ast.Node) bool {
	for current := stream.Parent; current != nil; current = current.Parent {
		if ast.IsCallExpression(current) && (isStreamCall(ctx, current, "runDrain") || isStreamCall(ctx, current, "runCollect")) {
			return true
		}
		if ast.IsCallExpression(current) && isStreamRunPipe(ctx, current) {
			return true
		}
		if isFunctionLike(current) {
			return false
		}
	}
	return false
}

func isStreamRunPipe(ctx rule.RuleContext, node *ast.Node) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return false
	}
	for _, argument := range node.AsCallExpression().Arguments.Nodes {
		if isStreamValue(ctx, argument, "runDrain") || isStreamValue(ctx, argument, "runCollect") {
			return true
		}
	}
	return false
}

func isColdEffectConstructor(ctx rule.RuleContext, node *ast.Node) bool {
	return isEffectCall(ctx, node, "succeed")
}

func isTerminatingEffectCall(ctx rule.RuleContext, node *ast.Node) bool {
	if isEffectCall(ctx, node, "timeout") || isEffectCall(ctx, node, "timeoutOption") || isEffectCall(ctx, node, "timeoutFail") {
		return true
	}
	callee := unwrap(node.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return false
	}
	for _, argument := range node.AsCallExpression().Arguments.Nodes {
		argument = unwrap(argument)
		if ast.IsCallExpression(argument) && (isEffectCall(ctx, argument, "timeout") || isEffectCall(ctx, argument, "timeoutOption") || isEffectCall(ctx, argument, "timeoutFail")) {
			return true
		}
	}
	return false
}

func isStreamCall(ctx rule.RuleContext, node *ast.Node, name string) bool {
	return isEffectModuleCall(ctx, node, "Stream", name)
}

func isEffectCall(ctx rule.RuleContext, node *ast.Node, name string) bool {
	return isEffectModuleCall(ctx, node, "Effect", name)
}

func isEffectValue(ctx rule.RuleContext, node *ast.Node, name string) bool {
	if node == nil || !ast.IsPropertyAccessExpression(node) || node.AsPropertyAccessExpression().Name().Text() != name {
		return false
	}
	return isEffectSymbol(ctx, node.AsPropertyAccessExpression().Name(), "Effect", name)
}

func isStreamValue(ctx rule.RuleContext, node *ast.Node, name string) bool {
	node = unwrap(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) || node.AsPropertyAccessExpression().Name().Text() != name {
		return false
	}
	return isEffectSymbol(ctx, node.AsPropertyAccessExpression().Name(), "Stream", name)
}

func isEffectModuleCall(ctx rule.RuleContext, node *ast.Node, module, name string) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	return isEffectSymbol(ctx, callee, module, name)
}

func isEffectSymbol(ctx rule.RuleContext, node *ast.Node, module, name string) bool {
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
		if (base == module+".ts" || base == module+".d.ts" || base == "index.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isFunctionLike(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindArrowFunction, ast.KindFunctionExpression, ast.KindFunctionDeclaration, ast.KindMethodDeclaration:
		return true
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

var Rule = LayerForeverAcquisitionRule
