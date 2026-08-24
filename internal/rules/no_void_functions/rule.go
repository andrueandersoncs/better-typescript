package no_void_functions

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var Rule = rule.Rule{
	Name: "no-void-functions",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			initializer := ast.IsArrowFunction(node) || ast.IsFunctionExpression(node)
			if initializer {
				contextual := checker.Checker_getContextualType(ctx.TypeChecker, node, checker.ContextFlagsNone)
				if typePermitsVoid(ctx, contextual) {
					return
				}
			}
			if ast.IsMethodDeclaration(node) && node.Parent != nil && ast.IsObjectLiteralExpression(node.Parent) {
				if checker.Checker_getContextualType(ctx.TypeChecker, node.Parent, checker.ContextFlagsNone) != nil {
					return
				}
			}
			signature := ctx.TypeChecker.GetSignatureFromDeclaration(node)
			if signature == nil {
				return
			}
			returnType := checker.Checker_getReturnTypeOfSignature(ctx.TypeChecker, signature)
			if !utils.IsTypeFlagSet(returnType, checker.TypeFlagsVoid) {
				return
			}
			target := node
			if name := node.Name(); name != nil {
				target = name
			}
			ctx.ReportNode(target, rule.RuleMessage{Id: "no-void-functions", Description: "Avoid functions that return void.", Help: "A void function either does nothing or performs a side-effect. If it does nothing, delete it. If it performs a side-effect, make it return an Effect — for example wrap the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not run. When a third-party API requires a void callback, annotate the value with that API's callback type so the void contract is the consumer's, not yours."})
		}
		return rule.RuleListeners{ast.KindFunctionDeclaration: check, ast.KindFunctionExpression: check, ast.KindArrowFunction: check, ast.KindMethodDeclaration: check}
	},
}

func typePermitsVoid(ctx rule.RuleContext, value *checker.Type) bool {
	if value == nil {
		return false
	}
	value = checker.Checker_GetNonNullableType(ctx.TypeChecker, value)
	for _, signature := range utils.GetCallSignatures(ctx.TypeChecker, value) {
		returned := checker.Checker_getReturnTypeOfSignature(ctx.TypeChecker, signature)
		for _, part := range utils.UnionTypeParts(returned) {
			if utils.IsTypeFlagSet(part, checker.TypeFlagsVoid|checker.TypeFlagsAny|checker.TypeFlagsUnknown) {
				return true
			}
		}
	}
	return false
}
