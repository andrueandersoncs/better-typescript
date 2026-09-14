package no_widen_then_assert

import (
	"fmt"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

func unwrapExpression(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func unwrapType(node *ast.Node) *ast.Node {
	for node != nil && node.Kind == ast.KindParenthesizedType {
		node = node.AsParenthesizedTypeNode().Type
	}
	return node
}

func unwrapReadonly(node *ast.Node) *ast.Node {
	node = unwrapType(node)
	for ast.IsTypeReferenceNode(node) && ast.IsIdentifier(node.AsTypeReferenceNode().TypeName) && node.AsTypeReferenceNode().TypeName.Text() == "Readonly" && node.AsTypeReferenceNode().TypeArguments != nil && len(node.AsTypeReferenceNode().TypeArguments.Nodes) == 1 {
		node = unwrapType(node.AsTypeReferenceNode().TypeArguments.Nodes[0])
	}
	return node
}

func unknownOrAny(node *ast.Node) bool {
	node = unwrapType(node)
	return node != nil && (node.Kind == ast.KindUnknownKeyword || node.Kind == ast.KindAnyKeyword)
}

func broadKey(node *ast.Node) bool {
	node = unwrapType(node)
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindStringKeyword, ast.KindNumberKeyword, ast.KindSymbolKeyword:
		return true
	case ast.KindUnionType:
		for _, part := range node.AsUnionTypeNode().Types.Nodes {
			if !broadKey(part) {
				return false
			}
		}
		return true
	case ast.KindTypeReference:
		return ast.IsIdentifier(node.AsTypeReferenceNode().TypeName) && node.AsTypeReferenceNode().TypeName.Text() == "PropertyKey"
	}
	return false
}

func recordArguments(node *ast.Node) (*ast.Node, *ast.Node) {
	node = unwrapReadonly(node)
	if node == nil || !ast.IsTypeReferenceNode(node) || !ast.IsIdentifier(node.AsTypeReferenceNode().TypeName) {
		return nil, nil
	}
	reference := node.AsTypeReferenceNode()
	if reference.TypeName.Text() == "Readonly" && reference.TypeArguments != nil && len(reference.TypeArguments.Nodes) == 1 {
		return recordArguments(reference.TypeArguments.Nodes[0])
	}
	if reference.TypeName.Text() != "Record" || reference.TypeArguments == nil || len(reference.TypeArguments.Nodes) != 2 {
		return nil, nil
	}
	return reference.TypeArguments.Nodes[0], reference.TypeArguments.Nodes[1]
}

func broadType(node *ast.Node) string {
	node = unwrapReadonly(node)
	if node == nil {
		return ""
	}
	switch node.Kind {
	case ast.KindUnknownKeyword, ast.KindAnyKeyword:
		return "top"
	case ast.KindObjectKeyword:
		return "object"
	case ast.KindTypeLiteral:
		members := node.AsTypeLiteralNode().Members.Nodes
		if len(members) == 1 && ast.IsIndexSignatureDeclaration(members[0]) && len(members[0].Parameters()) == 1 && broadKey(members[0].Parameters()[0].Type()) && unknownOrAny(members[0].Type()) {
			return "record"
		}
	case ast.KindTypeReference:
		key, value := recordArguments(node)
		if broadKey(key) && unknownOrAny(value) {
			return "record"
		}
	}
	return ""
}

type evidence struct {
	known    bool
	typeNode *ast.Node
}

func knownValue(ctx rule.RuleContext, node, boundary *ast.Node, seen map[*ast.Symbol]bool) evidence {
	for node != nil && node.Kind == ast.KindParenthesizedExpression {
		node = node.AsParenthesizedExpression().Expression
	}
	if node == nil {
		return evidence{}
	}
	if node.Kind == ast.KindAsExpression || node.Kind == ast.KindTypeAssertionExpression {
		if broadType(node.Type()) != "" {
			return evidence{}
		}
		return evidence{known: true, typeNode: node.Type()}
	}
	switch node.Kind {
	case ast.KindObjectLiteralExpression, ast.KindArrayLiteralExpression, ast.KindArrowFunction, ast.KindFunctionExpression, ast.KindClassExpression, ast.KindNewExpression,
		ast.KindStringLiteral, ast.KindNumericLiteral, ast.KindBigIntLiteral, ast.KindRegularExpressionLiteral, ast.KindNoSubstitutionTemplateLiteral, ast.KindTemplateExpression,
		ast.KindTrueKeyword, ast.KindFalseKeyword, ast.KindNullKeyword, ast.KindPrefixUnaryExpression, ast.KindTypeOfExpression, ast.KindVoidExpression, ast.KindDeleteExpression:
		return evidence{known: true}
	case ast.KindIdentifier:
		symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
		if symbol == nil || seen[symbol] || len(symbol.Declarations) != 1 {
			return evidence{}
		}
		declaration := symbol.Declarations[0]
		if declaration.Type() != nil {
			if functionBoundary(declaration) != boundary || broadType(declaration.Type()) != "" {
				return evidence{}
			}
			return evidence{known: true, typeNode: declaration.Type()}
		}
		if !ast.IsVariableDeclaration(declaration) || declaration.Parent == nil || declaration.Parent.Flags&ast.NodeFlagsConst == 0 || declaration.AsVariableDeclaration().Initializer == nil || functionBoundary(declaration) != boundary {
			return evidence{}
		}
		seen[symbol] = true
		result := knownValue(ctx, declaration.AsVariableDeclaration().Initializer, boundary, seen)
		delete(seen, symbol)
		return result
	}
	return evidence{}
}

func functionBoundary(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}

func typeText(ctx rule.RuleContext, node *ast.Node) string {
	if node == nil {
		return ""
	}
	range_ := utils.TrimNodeTextRange(ctx.SourceFile, node)
	return strings.Join(strings.Fields(ctx.SourceFile.Text()[range_.Pos():range_.End()]), "")
}

func definitelyObject(node *ast.Node) bool {
	node = unwrapReadonly(node)
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindArrayType, ast.KindConstructorType, ast.KindFunctionType, ast.KindMappedType, ast.KindObjectKeyword, ast.KindTupleType:
		return true
	case ast.KindTypeLiteral:
		return len(node.AsTypeLiteralNode().Members.Nodes) > 0
	case ast.KindIntersectionType:
		for _, part := range node.AsIntersectionTypeNode().Types.Nodes {
			if !definitelyObject(part) {
				return false
			}
		}
		return true
	case ast.KindTypeOperator:
		operator := node.AsTypeOperatorNode()
		return operator.Operator == ast.KindReadonlyKeyword && definitelyObject(operator.Type)
	}
	return false
}

func narrowerRecord(node *ast.Node) bool {
	node = unwrapReadonly(node)
	if node == nil {
		return false
	}
	if ast.IsTypeLiteralNode(node) {
		for _, member := range node.AsTypeLiteralNode().Members.Nodes {
			if !ast.IsIndexSignatureDeclaration(member) {
				return true
			}
		}
		return false
	}
	_, value := recordArguments(node)
	return value != nil && !unknownOrAny(value)
}

func narrower(ctx rule.RuleContext, broad string, source evidence, asserted *ast.Node) bool {
	if asserted == nil || broadType(asserted) != "" {
		return false
	}
	if source.typeNode != nil && typeText(ctx, source.typeNode) == typeText(ctx, asserted) {
		return true
	}
	if broad == "top" {
		return true
	}
	if broad == "object" {
		return definitelyObject(asserted)
	}
	return broad == "record" && narrowerRecord(asserted)
}

func check(ctx rule.RuleContext, node *ast.Node) {
	expression := unwrapExpression(node.Expression())
	if !ast.IsIdentifier(expression) {
		return
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, expression)
	if symbol == nil || len(symbol.Declarations) != 1 || !ast.IsVariableDeclaration(symbol.Declarations[0]) {
		return
	}
	declarationNode := symbol.Declarations[0]
	declaration := declarationNode.AsVariableDeclaration()
	if declarationNode.Parent == nil || declarationNode.Parent.Flags&ast.NodeFlagsConst == 0 || declaration.Initializer == nil || node.Pos() <= declarationNode.Pos() || functionBoundary(node) != functionBoundary(declarationNode) {
		return
	}
	declaredType := declaration.Type
	original := declaration.Initializer
	initializer := ast.SkipParentheses(declaration.Initializer)
	if initializer.Kind == ast.KindAsExpression || initializer.Kind == ast.KindTypeAssertionExpression {
		if declaredType == nil {
			declaredType = initializer.Type()
		}
		if broadType(initializer.Type()) != "" {
			original = initializer.Expression()
		}
	} else if declaredType == nil {
		return
	}
	broad := broadType(declaredType)
	boundary := functionBoundary(declarationNode)
	source := knownValue(ctx, original, boundary, map[*ast.Symbol]bool{})
	if broad == "" || !source.known || !narrower(ctx, broad, source, node.Type()) {
		return
	}
	ctx.ReportNode(node, rule.RuleMessage{
		Id:          "no-widen-then-assert",
		Description: fmt.Sprintf("Binding `%s` discards type evidence and later recreates it with an assertion.", expression.Text()),
		Help:        "Keep the precise type from initialization through use; parse boundary input once.",
	})
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	listener := func(node *ast.Node) { check(ctx, node) }
	return rule.RuleListeners{
		ast.KindAsExpression:            listener,
		ast.KindTypeAssertionExpression: listener,
	}
}

var Rule = rule.Rule{Name: "no-widen-then-assert", Run: run}
