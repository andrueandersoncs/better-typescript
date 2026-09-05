package scoped_background_work

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "scopedBackgroundWork",
	Description: "Scope detached background work.",
	Help:        "Fork detached work into a scope or retain it at an explicit owner.",
}

var ScopedBackgroundWorkRule = rule.Rule{Name: "scoped-background-work", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	starts := map[*ast.Node][]*ast.Node{}
	returned := map[*ast.Node]map[*ast.Symbol]bool{}
	owned := map[*ast.Node]map[*ast.Symbol]bool{}
	report := func(start *ast.Node) {
		ctx.ReportNode(start.AsCallExpression().Expression, message)
	}
	return rule.RuleListeners{
		ast.KindCallExpression: func(node *ast.Node) {
			if isEffectCall(ctx, node, "forkDetach") {
				if generator := effectGenerator(ctx, node); generator != nil {
					if isYieldedInGenerator(node, generator) {
						starts[generator] = append(starts[generator], node)
					}
					return
				}
				if isDirectLayerDiscard(ctx, node) {
					report(node)
				}
				return
			}
			if generator := effectGenerator(ctx, node); generator != nil && isExplicitFiberOwner(ctx, node) && isYieldedInGenerator(node, generator) {
				for _, argument := range node.AsCallExpression().Arguments.Nodes {
					if symbol := utils.ResolvedSymbol(ctx.TypeChecker, unwrap(argument)); symbol != nil {
						if owned[generator] == nil {
							owned[generator] = map[*ast.Symbol]bool{}
						}
						owned[generator][symbol] = true
					}
				}
			}
		},
		ast.KindReturnStatement: func(node *ast.Node) {
			generator := effectGenerator(ctx, node)
			if generator == nil {
				return
			}
			value := node.AsReturnStatement().Expression
			if value == nil {
				return
			}
			if symbol := utils.ResolvedSymbol(ctx.TypeChecker, unwrap(value)); symbol != nil {
				if returned[generator] == nil {
					returned[generator] = map[*ast.Symbol]bool{}
				}
				returned[generator][symbol] = true
			}
		},
		rule.ListenerOnExit(ast.KindFunctionExpression): func(node *ast.Node) {
			for _, start := range starts[node] {
				if explicitlyOwned(ctx, start, node, owned[node]) || (returnedFromGenerator(ctx, start, node, returned[node]) && !generatorIsDiscarded(ctx, node)) {
					continue
				}
				report(start)
			}
		},
		rule.ListenerOnExit(ast.KindArrowFunction): func(node *ast.Node) {
			for _, start := range starts[node] {
				if explicitlyOwned(ctx, start, node, owned[node]) || (returnedFromGenerator(ctx, start, node, returned[node]) && !generatorIsDiscarded(ctx, node)) {
					continue
				}
				report(start)
			}
		},
	}
}}

func effectGenerator(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if !isFunctionLike(current) {
			continue
		}
		call := current.Parent
		if call != nil && ast.IsCallExpression(call) && isEffectCall(ctx, call, "gen") {
			return current
		}
		return nil
	}
	return nil
}

func isYieldedInGenerator(start, generator *ast.Node) bool {
	for current := start.Parent; current != nil && current != generator; current = current.Parent {
		if ast.IsYieldExpression(current) {
			return current.AsYieldExpression().AsteriskToken != nil
		}
		if ast.IsVariableDeclaration(current) || ast.IsReturnStatement(current) {
			return false
		}
	}
	return false
}

func explicitlyOwned(ctx rule.RuleContext, start, generator *ast.Node, owned map[*ast.Symbol]bool) bool {
	for current := start.Parent; current != nil && current != generator; current = current.Parent {
		if ast.IsVariableDeclaration(current) {
			return owned[utils.ResolvedSymbol(ctx.TypeChecker, current.AsVariableDeclaration().Name())]
		}
	}
	return false
}

func returnedFromGenerator(ctx rule.RuleContext, start, generator *ast.Node, returned map[*ast.Symbol]bool) bool {
	for current := start.Parent; current != nil && current != generator; current = current.Parent {
		if ast.IsReturnStatement(current) {
			return true
		}
		if ast.IsVariableDeclaration(current) {
			return returned[utils.ResolvedSymbol(ctx.TypeChecker, current.AsVariableDeclaration().Name())]
		}
	}
	return false
}

func generatorIsDiscarded(ctx rule.RuleContext, generator *ast.Node) bool {
	call := generator.Parent
	return call != nil && ast.IsCallExpression(call) && call.Parent != nil && ast.IsCallExpression(call.Parent) && isLayerEffectDiscard(ctx, call.Parent) && isDirectArgument(call.Parent, call)
}

func isExplicitFiberOwner(ctx rule.RuleContext, node *ast.Node) bool {
	return isEffectModuleCall(ctx, node, "Fiber", "interrupt") || isEffectModuleCall(ctx, node, "FiberHandle", "set")
}

func isDirectLayerDiscard(ctx rule.RuleContext, start *ast.Node) bool {
	parent := start.Parent
	return parent != nil && ast.IsCallExpression(parent) && isLayerEffectDiscard(ctx, parent) && isDirectArgument(parent, start)
}

func isDirectArgument(call, descendant *ast.Node) bool {
	for current := descendant; current != nil && current != call; current = current.Parent {
		if current.Parent != call {
			continue
		}
		for _, argument := range call.AsCallExpression().Arguments.Nodes {
			if argument == current {
				return true
			}
		}
	}
	return false
}

func isLayerEffectDiscard(ctx rule.RuleContext, node *ast.Node) bool {
	return isEffectModuleCall(ctx, node, "Layer", "effectDiscard")
}

func isEffectCall(ctx rule.RuleContext, node *ast.Node, name string) bool {
	return isEffectModuleCall(ctx, node, "Effect", name)
}

func isEffectModuleCall(ctx rule.RuleContext, node *ast.Node, module, name string) bool {
	call := node.AsCallExpression()
	callee := unwrap(call.Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
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

var Rule = ScopedBackgroundWorkRule
