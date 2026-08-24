package no_callbacks

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "noCallbacks",
	Description: "Avoid callback-style void APIs.",
	Help:        "Return an Effect from the operation instead of accepting a callback.",
}

func isInAmbientContext(node *ast.Node) bool {
	for current := node; current != nil; current = current.Parent {
		if ast.IsSourceFile(current) {
			return current.AsSourceFile().IsDeclarationFile
		}
		if current.ModifierFlags()&ast.ModifierFlagsAmbient != 0 {
			return true
		}
	}
	return false
}

func effectiveCallableTypeNode(node *ast.Node) *ast.Node {
	for node.Parent != nil && (ast.IsParenthesizedTypeNode(node.Parent) || ast.IsUnionTypeNode(node.Parent) || ast.IsIntersectionTypeNode(node.Parent)) {
		node = node.Parent
	}
	return node
}

func isRuntimeFunctionLike(node *ast.Node) bool {
	return node != nil && (ast.IsFunctionExpression(node) || ast.IsArrowFunction(node))
}

func isCallbackStyleCandidate(node *ast.Node) bool {
	if !ast.IsFunctionTypeNode(node) {
		return ast.IsFunctionDeclaration(node) || ast.IsFunctionExpression(node) || ast.IsArrowFunction(node) || ast.IsMethodDeclaration(node) || ast.IsMethodSignatureDeclaration(node) || ast.IsCallSignatureDeclaration(node)
	}
	typeNode := effectiveCallableTypeNode(node)
	parent := typeNode.Parent
	if parent == nil {
		return false
	}
	if ast.IsVariableDeclaration(parent) || ast.IsPropertyDeclaration(parent) {
		return parent.Type() == typeNode && !isRuntimeFunctionLike(parent.Initializer())
	}
	if ast.IsTypeAliasDeclaration(parent) {
		return parent.Type() == typeNode
	}
	if ast.IsPropertySignatureDeclaration(parent) {
		return parent.Type() == typeNode
	}
	return false
}

func hasCallSignature(ctx rule.RuleContext, valueType *checker.Type) bool {
	return valueType != nil && len(utils.GetCallSignatures(ctx.TypeChecker, valueType)) > 0
}

func parameterIsFunction(ctx rule.RuleContext, parameter *ast.Node) bool {
	parameterType := ctx.TypeChecker.GetTypeAtLocation(parameter)
	if hasCallSignature(ctx, parameterType) {
		return true
	}
	if parameter.AsParameterDeclaration().DotDotDotToken == nil || parameterType == nil || checker.Type_flags(parameterType)&checker.TypeFlagsObject == 0 || checker.Type_objectFlags(parameterType)&checker.ObjectFlagsReference == 0 {
		return false
	}
	arguments := checker.Checker_getTypeArguments(ctx.TypeChecker, parameterType)
	return len(arguments) > 0 && hasCallSignature(ctx, arguments[0])
}

func checkDeclaration(ctx rule.RuleContext, node *ast.Node) {
	if !isCallbackStyleCandidate(node) || isInAmbientContext(node) {
		return
	}
	signature := ctx.TypeChecker.GetSignatureFromDeclaration(node)
	if signature == nil {
		return
	}
	returnType := ctx.TypeChecker.GetReturnTypeOfSignature(signature)
	if returnType == nil || !utils.IsTypeFlagSet(returnType, checker.TypeFlagsVoid) {
		return
	}
	for _, parameter := range node.Parameters() {
		if parameterIsFunction(ctx, parameter) {
			ctx.ReportNode(node, message)
			return
		}
	}
}

func listener(ctx rule.RuleContext) func(*ast.Node) {
	return func(node *ast.Node) { checkDeclaration(ctx, node) }
}

var NoCallbacksRule = rule.Rule{
	Name: "no-callbacks",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		check := listener(ctx)
		return rule.RuleListeners{
			ast.KindFunctionDeclaration: check,
			ast.KindFunctionExpression:  check,
			ast.KindArrowFunction:       check,
			ast.KindMethodDeclaration:   check,
			ast.KindMethodSignature:     check,
			ast.KindCallSignature:       check,
			ast.KindFunctionType:        check,
		}
	},
}
