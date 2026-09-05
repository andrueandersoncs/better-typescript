package no_function_keyword

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
	"github.com/andrueandersoncs/typescript-go/core"
)

var message = rule.RuleMessage{
	Id:          "noFunctionKeyword",
	Description: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep functions that own this, arguments, or new.target, declarations needed for overload signatures, and function* when their semantics are required.",
}

func hasOverloadSibling(ctx rule.RuleContext, declaration *ast.Node) bool {
	name := declaration.Name()
	if name == nil {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
	if symbol == nil {
		return false
	}
	for _, candidate := range symbol.Declarations {
		if candidate != declaration && ast.IsFunctionDeclaration(candidate) && candidate.Body() == nil {
			return true
		}
	}
	return false
}

func functionKeywordRange(ctx rule.RuleContext, node *ast.Node) core.TextRange {
	text := ctx.SourceFile.Text()
	trimmed := utils.TrimNodeTextRange(ctx.SourceFile, node)
	start, end := trimmed.Pos(), trimmed.End()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	relative := strings.Index(text[start:end], "function")
	if relative < 0 {
		return node.Loc
	}
	position := start + relative
	return core.NewTextRange(position, position+len("function"))
}

func isCandidate(ctx rule.RuleContext, node *ast.Node) bool {
	body := node.BodyData()
	if body != nil && body.AsteriskToken != nil {
		return false
	}
	return !ast.IsFunctionDeclaration(node) || !hasOverloadSibling(ctx, node)
}

func hasThisParameter(node *ast.Node) bool {
	for _, parameter := range node.Parameters() {
		name := parameter.Name()
		if name != nil && name.Text() == "this" {
			return true
		}
	}
	return false
}

func markCandidate(candidates map[*ast.Node]bool, owner *ast.Node) {
	if owner != nil && candidates[owner] {
		candidates[owner] = false
	}
}

func isExplicitPropertyName(node *ast.Node) bool {
	if node.Parent == nil {
		return false
	}
	if node.Parent.Kind == ast.KindBindingElement {
		return node.Parent.AsBindingElement().PropertyName == node
	}
	if node.Parent.Name() != node {
		return false
	}
	switch node.Parent.Kind {
	case ast.KindEnumMember, ast.KindGetAccessor, ast.KindMethodDeclaration, ast.KindMethodSignature, ast.KindPropertyAssignment, ast.KindPropertyDeclaration, ast.KindPropertySignature, ast.KindSetAccessor:
		return true
	default:
		return false
	}
}

func isOwnArguments(ctx rule.RuleContext, node *ast.Node) bool {
	if node.Text() != "arguments" || isExplicitPropertyName(node) {
		return false
	}
	if node.Parent != nil && node.Parent.Kind == ast.KindShorthandPropertyAssignment {
		return ctx.TypeChecker.IsArgumentsSymbol(checker.Checker_GetShorthandAssignmentValueSymbol(ctx.TypeChecker, node.Parent))
	}
	if ast.IsDeclarationName(node) {
		return false
	}
	return ctx.TypeChecker.IsArgumentsSymbol(ctx.TypeChecker.GetSymbolAtLocation(node))
}

func isNewTarget(node *ast.Node) bool {
	if !ast.IsMetaProperty(node) {
		return false
	}
	property := node.AsMetaProperty()
	return property.KeywordToken == ast.KindNewKeyword && property.Name() != nil && property.Name().Text() == "target"
}

var NoFunctionKeywordRule = rule.Rule{
	Name: "no-function-keyword",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		candidates := map[*ast.Node]bool{}
		enter := func(node *ast.Node) {
			if isCandidate(ctx, node) {
				candidates[node] = !hasThisParameter(node)
			}
		}
		exit := func(node *ast.Node) {
			if candidates[node] {
				ctx.ReportRange(functionKeywordRange(ctx, node), message)
			}
			delete(candidates, node)
		}
		return rule.RuleListeners{
			ast.KindFunctionDeclaration:                      enter,
			ast.KindFunctionExpression:                       enter,
			rule.ListenerOnExit(ast.KindFunctionDeclaration): exit,
			rule.ListenerOnExit(ast.KindFunctionExpression):  exit,
			ast.KindThisKeyword: func(node *ast.Node) {
				markCandidate(candidates, ast.GetThisContainer(node, false, false))
			},
			ast.KindIdentifier: func(node *ast.Node) {
				if isOwnArguments(ctx, node) {
					markCandidate(candidates, ast.GetThisContainer(node, false, false))
				}
			},
			ast.KindMetaProperty: func(node *ast.Node) {
				if isNewTarget(node) {
					markCandidate(candidates, ast.GetNewTargetContainer(node))
				}
			},
		}
	},
}
