package prefer_inferred_types

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var constMessage = rule.RuleMessage{Id: "prefer-inferred-types", Description: "Avoid a const annotation when its initializer infers the same type.", Help: "Delete the type annotation. Keep annotations that widen a value or guide generic inference."}
var returnMessage = rule.RuleMessage{Id: "prefer-inferred-types", Description: "Avoid a return annotation when the function body infers the same type.", Help: "Delete the return type annotation. Keep explicit contracts when inference changes the signature."}

func resultExpression(body *ast.Node) *ast.Node {
	if body == nil {
		return nil
	}
	if !ast.IsBlock(body) {
		return body
	}
	b := body.AsBlock()
	if len(b.Statements.Nodes) != 1 || !ast.IsReturnStatement(b.Statements.Nodes[0]) {
		return nil
	}
	return b.Statements.Nodes[0].AsReturnStatement().Expression
}
func equivalent(ctx rule.RuleContext, left, right *ast.Node) bool {
	if left == nil || right == nil {
		return false
	}
	a := ctx.TypeChecker.GetTypeAtLocation(left)
	b := ctx.TypeChecker.GetTypeAtLocation(right)
	return checker.Checker_isTypeAssignableTo(ctx.TypeChecker, a, b) && checker.Checker_isTypeAssignableTo(ctx.TypeChecker, b, a) && ctx.TypeChecker.TypeToString(a) == ctx.TypeChecker.TypeToString(b)
}
func checkReturn(ctx rule.RuleContext, fn *ast.Node) {
	t := fn.Type()
	if t == nil || ast.IsTypePredicateNode(t) {
		return
	}
	body := resultExpression(fn.Body())
	if equivalent(ctx, t, body) {
		ctx.ReportNode(t, returnMessage)
	}
}

var contextualMessage = rule.RuleMessage{Id: "prefer-inferred-types", Description: "Avoid annotations on a contextually typed function.", Help: "Delete the parameter and return annotations together; the surrounding expression supplies them."}

func genericCall(ctx rule.RuleContext, node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}
	signature := checker.Checker_getResolvedSignature(ctx.TypeChecker, node, nil, checker.CheckModeNormal)
	declaration := checker.Signature_declaration(signature)
	return declaration != nil && len(declaration.TypeParameters()) > 0
}
func checkContextual(ctx rule.RuleContext, node *ast.Node) {
	if ast.IsCallExpression(node.Parent) {
		for _, argument := range node.Parent.AsCallExpression().Arguments.Nodes {
			if argument == node {
				break
			}
			if ast.IsArrayLiteralExpression(argument) && len(argument.AsArrayLiteralExpression().Elements.Nodes) == 0 {
				return
			}
		}
	}
	fn := node.AsArrowFunction()
	contextual := checker.Checker_getContextualType(ctx.TypeChecker, node, checker.ContextFlagsNone)
	if contextual == nil {
		return
	}
	signatures := utils.GetCallSignatures(ctx.TypeChecker, contextual)
	if len(signatures) != 1 {
		return
	}
	parameters := checker.Signature_parameters(signatures[0])
	var target *ast.Node
	for index, parameter := range fn.Parameters.Nodes {
		typeNode := parameter.Type()
		if typeNode == nil || index >= len(parameters) {
			return
		}
		expected := ctx.TypeChecker.GetTypeOfSymbolAtLocation(parameters[index], node)
		actual := ctx.TypeChecker.GetTypeAtLocation(typeNode)
		if ctx.TypeChecker.TypeToString(expected) != ctx.TypeChecker.TypeToString(actual) {
			return
		}
		if target == nil {
			target = typeNode
		}
	}
	if target == nil {
		return
	}
	if fn.Type != nil && !equivalent(ctx, fn.Type, resultExpression(fn.Body)) {
		return
	}
	ctx.ReportNode(target, contextualMessage)
}

var PreferInferredTypesRule = rule.Rule{Name: "prefer-inferred-types", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindVariableDeclaration: func(node *ast.Node) {
			d := node.AsVariableDeclaration()
			if d.Parent.Flags&ast.NodeFlagsConst == 0 || d.Initializer == nil {
				return
			}
			if d.Type != nil && !genericCall(ctx, d.Initializer) && equivalent(ctx, d.Type, d.Initializer) {
				ctx.ReportNode(d.Type, constMessage)
				return
			}
			init := d.Initializer
			if ast.IsArrowFunction(init) || ast.IsFunctionExpression(init) {
				checkReturn(ctx, init)
			}
		},
		ast.KindFunctionDeclaration: func(node *ast.Node) { checkReturn(ctx, node) },
		ast.KindArrowFunction: func(node *ast.Node) {
			if !ast.IsVariableDeclaration(node.Parent) {
				checkContextual(ctx, node)
			}
		},
	}
}}

var Rule = PreferInferredTypesRule
