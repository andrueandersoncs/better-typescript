package no_reentrant_synchronized_ref_update

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-reentrant-synchronized-ref-update",
	Description: "Do not reacquire a synchronized ref lock from its update callback.",
	Help:        "Compute the next value inside the callback, then let the outer update store it. Do not run another mutation of the same ref until the callback has returned.",
}

var Rule = rule.Rule{
	Name: "no-reentrant-synchronized-ref-update",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			inner := node.AsCallExpression()
			innerReceiver := mutationReceiver(ctx, inner, false)
			if innerReceiver == nil || !isDirectlyExecuted(ctx, node) {
				return
			}
			callback := enclosingCallback(ctx, node)
			if callback == nil || !callbackDirectlyExecutes(ctx, callback) {
				return
			}
			outer := callback.Parent
			if outer == nil || !ast.IsCallExpression(outer) {
				return
			}
			outerReceiver := mutationReceiver(ctx, outer.AsCallExpression(), true)
			if outerReceiver == nil {
				return
			}
			innerSymbol := utils.ResolvedSymbol(ctx.TypeChecker, innerReceiver)
			outerSymbol := utils.ResolvedSymbol(ctx.TypeChecker, outerReceiver)
			if innerSymbol == nil || outerSymbol == nil || innerSymbol != outerSymbol {
				return
			}
			ctx.ReportNode(node, message)
		}}
	},
}

var lockMutations = map[string]bool{
	"getAndSet": true, "getAndUpdate": true, "getAndUpdateEffect": true, "modify": true, "modifyEffect": true,
	"set": true, "setAndGet": true, "update": true, "updateAndGet": true, "updateAndGetEffect": true, "updateEffect": true,
}

var effectfulMutations = map[string]bool{
	"getAndUpdateEffect": true, "modifyEffect": true, "updateAndGetEffect": true, "updateEffect": true,
}

func mutationReceiver(ctx rule.RuleContext, call *ast.CallExpression, effectfulOnly bool) *ast.Node {
	name, family := mutationAPI(ctx, call.Expression)
	if family == "" || (effectfulOnly && !effectfulMutations[name]) {
		return nil
	}
	if !effectfulOnly && !lockMutations[name] {
		return nil
	}
	if call.Arguments == nil || len(call.Arguments.Nodes) < 2 {
		return nil
	}
	receiver := unwrap(call.Arguments.Nodes[0])
	if !ast.IsIdentifier(receiver) {
		return nil
	}
	return receiver
}

func mutationAPI(ctx rule.RuleContext, callee *ast.Node) (string, string) {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil {
		return "", ""
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if !strings.Contains(path, "/node_modules/effect/") && !strings.Contains(path, "/packages/effect/src/") {
			continue
		}
		if strings.HasSuffix(path, "/SynchronizedRef.ts") || strings.HasSuffix(path, "/SynchronizedRef.d.ts") {
			return symbol.Name, "SynchronizedRef"
		}
		if strings.HasSuffix(path, "/SubscriptionRef.ts") || strings.HasSuffix(path, "/SubscriptionRef.d.ts") {
			return symbol.Name, "SubscriptionRef"
		}
	}
	return "", ""
}

func enclosingCallback(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionExpression(current) && isExecutedEffectGen(ctx, current) {
			continue
		}
		if ast.IsArrowFunction(current) || ast.IsFunctionExpression(current) {
			return current
		}
		if ast.IsFunctionDeclaration(current) || ast.IsMethodDeclaration(current) {
			return nil
		}
	}
	return nil
}

func callbackDirectlyExecutes(ctx rule.RuleContext, callback *ast.Node) bool {
	parent := callback.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return false
	}
	call := parent.AsCallExpression()
	if !isEffectfulMutationCallback(ctx, call, callback) {
		return false
	}
	return true
}

func isEffectfulMutationCallback(ctx rule.RuleContext, call *ast.CallExpression, callback *ast.Node) bool {
	name, family := mutationAPI(ctx, call.Expression)
	if family == "" || !effectfulMutations[name] || call.Arguments == nil || len(call.Arguments.Nodes) < 2 {
		return false
	}
	return unwrap(call.Arguments.Nodes[1]) == callback
}

func isDirectlyExecuted(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsReturnStatement(current) {
			return unwrap(current.AsReturnStatement().Expression) == node
		}
		if ast.IsYieldExpression(current) {
			yield := current.AsYieldExpression()
			if yield.AsteriskToken == nil || unwrap(yield.Expression) != node {
				return false
			}
			return yieldIsInImmediateEffectGen(ctx, current)
		}
		if ast.IsArrowFunction(current) {
			return unwrap(current.AsArrowFunction().Body) == node
		}
		if ast.IsFunctionExpression(current) || ast.IsFunctionDeclaration(current) || ast.IsMethodDeclaration(current) {
			return false
		}
	}
	return false
}

func yieldIsInImmediateEffectGen(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionExpression(current) {
			return isImmediateEffectGen(ctx, current)
		}
	}
	return false
}

func isImmediateEffectGen(ctx rule.RuleContext, function *ast.Node) bool {
	if function.BodyData().AsteriskToken == nil || function.Parent == nil || !ast.IsCallExpression(function.Parent) {
		return false
	}
	call := function.Parent.AsCallExpression()
	for _, argument := range call.Arguments.Nodes {
		if argument == function {
			return effectGen(ctx, call.Expression)
		}
	}
	return false
}

func isExecutedEffectGen(ctx rule.RuleContext, function *ast.Node) bool {
	return isImmediateEffectGen(ctx, function) && isDirectlyExecuted(ctx, function.Parent)
}

func effectGen(ctx rule.RuleContext, callee *ast.Node) bool {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != "gen" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && (strings.Contains(strings.ReplaceAll(file.FileName(), "\\", "/"), "/node_modules/effect/") || strings.Contains(strings.ReplaceAll(file.FileName(), "\\", "/"), "/packages/effect/src/")) {
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
