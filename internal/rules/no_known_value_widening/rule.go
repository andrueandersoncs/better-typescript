package no_known_value_widening

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

type substitutions map[string]*ast.Node

func unwrapExpression(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func unwrapType(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedType:
			node = node.AsParenthesizedTypeNode().Type
		case ast.KindTypeOperator:
			operator := node.AsTypeOperatorNode()
			if operator.Operator != ast.KindReadonlyKeyword {
				return node
			}
			node = operator.Type
		default:
			return node
		}
	}
	return nil
}

func typeReferenceName(node *ast.Node) string {
	if node == nil || !ast.IsTypeReferenceNode(node) || !ast.IsIdentifier(node.AsTypeReferenceNode().TypeName) {
		return ""
	}
	return node.AsTypeReferenceNode().TypeName.Text()
}

func builtin(ctx rule.RuleContext, node *ast.Node, name string) bool {
	if typeReferenceName(node) != name {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
	if symbol == nil || len(symbol.Declarations) == 0 {
		return true
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(filepath.Base(file.FileName()), "lib.") {
			return true
		}
	}
	return false
}

func resolveSubstitution(node *ast.Node, inherited substitutions) *ast.Node {
	seen := map[string]bool{}
	for {
		node = unwrapType(node)
		if !ast.IsTypeReferenceNode(node) || !ast.IsIdentifier(node.AsTypeReferenceNode().TypeName) {
			return node
		}
		name := node.AsTypeReferenceNode().TypeName.Text()
		replacement := inherited[name]
		if replacement == nil || replacement == node || seen[name] {
			return node
		}
		seen[name] = true
		node = replacement
	}
}

func aliasWideningTarget(ctx rule.RuleContext, node *ast.Node, inherited substitutions, seen map[*ast.Node]bool) (string, bool) {
	node = unwrapType(resolveSubstitution(node, inherited))
	if node == nil {
		return "", false
	}
	switch node.Kind {
	case ast.KindTypeLiteral:
		for _, member := range node.AsTypeLiteralNode().Members.Nodes {
			if ast.IsIndexSignatureDeclaration(member) {
				return "open dictionary", true
			}
		}
		return "", false
	case ast.KindMappedType:
		constraint := node.AsMappedTypeNode().TypeParameter.AsTypeParameterDeclaration().Constraint
		if broadKey(ctx, constraint, inherited, seen) {
			return "open dictionary", true
		}
		return "", false
	case ast.KindTypeReference:
		arguments := node.AsTypeReferenceNode().TypeArguments
		if (builtin(ctx, node, "Readonly") || builtin(ctx, node, "Partial") || builtin(ctx, node, "Required") || builtin(ctx, node, "NonNullable")) && arguments != nil && len(arguments.Nodes) > 0 {
			return aliasWideningTarget(ctx, arguments.Nodes[0], inherited, seen)
		}
	}
	return wideningTarget(ctx, node, inherited, seen)
}

func aliasTarget(ctx rule.RuleContext, node *ast.Node, inherited substitutions, seen map[*ast.Node]bool) (string, bool) {
	if replacement := resolveSubstitution(node, inherited); replacement != node {
		return wideningTarget(ctx, replacement, inherited, seen)
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
	if symbol == nil {
		return "", false
	}
	for _, declaration := range symbol.Declarations {
		if !ast.IsTypeAliasDeclaration(declaration) || seen[declaration] {
			continue
		}
		alias := declaration.AsTypeAliasDeclaration()
		next := make(substitutions, len(inherited)+len(declaration.TypeParameters()))
		for key, value := range inherited {
			next[key] = value
		}
		arguments := node.AsTypeReferenceNode().TypeArguments
		for index, parameter := range declaration.TypeParameters() {
			var argument *ast.Node
			if arguments != nil && index < len(arguments.Nodes) {
				argument = arguments.Nodes[index]
			} else {
				argument = parameter.AsTypeParameterDeclaration().DefaultType
			}
			if argument == nil {
				return "", false
			}
			argument = resolveSubstitution(argument, inherited)
			if typeReferenceName(argument) == parameter.Name().Text() && inherited[parameter.Name().Text()] == nil {
				return "", false
			}
			next[parameter.Name().Text()] = argument
		}
		seen[declaration] = true
		kind, ok := aliasWideningTarget(ctx, alias.Type, next, seen)
		delete(seen, declaration)
		return kind, ok
	}
	return "", false
}

func broadKey(ctx rule.RuleContext, node *ast.Node, inherited substitutions, seen map[*ast.Node]bool) bool {
	node = unwrapType(resolveSubstitution(node, inherited))
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindStringKeyword, ast.KindNumberKeyword, ast.KindSymbolKeyword:
		return true
	case ast.KindUnionType:
		for _, part := range node.AsUnionTypeNode().Types.Nodes {
			if broadKey(ctx, part, inherited, seen) {
				return true
			}
		}
		return false
	case ast.KindTypeReference:
		if builtin(ctx, node, "PropertyKey") {
			return true
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
		if symbol == nil {
			return false
		}
		for _, declaration := range symbol.Declarations {
			if !ast.IsTypeAliasDeclaration(declaration) || seen[declaration] {
				continue
			}
			seen[declaration] = true
			result := broadKey(ctx, declaration.AsTypeAliasDeclaration().Type, inherited, seen)
			delete(seen, declaration)
			return result
		}
	}
	return false
}

func wideningTarget(ctx rule.RuleContext, node *ast.Node, inherited substitutions, seen map[*ast.Node]bool) (string, bool) {
	node = unwrapType(node)
	if node == nil {
		return "", false
	}
	switch node.Kind {
	case ast.KindUnknownKeyword:
		return "unknown", true
	case ast.KindObjectKeyword:
		return "object", true
	case ast.KindTypeLiteral:
		members := node.AsTypeLiteralNode().Members.Nodes
		if len(members) == 0 {
			return "", false
		}
		for _, member := range members {
			if ast.IsIndexSignatureDeclaration(member) {
				return "open dictionary", true
			}
		}
		return "anonymous object", true
	case ast.KindMappedType:
		return "open dictionary", true
	case ast.KindTypeReference:
		if replacement := resolveSubstitution(node, inherited); replacement != node {
			return wideningTarget(ctx, replacement, inherited, seen)
		}
		arguments := node.AsTypeReferenceNode().TypeArguments
		if (builtin(ctx, node, "Readonly") || builtin(ctx, node, "Partial") || builtin(ctx, node, "Required") || builtin(ctx, node, "NonNullable")) && arguments != nil && len(arguments.Nodes) > 0 {
			return wideningTarget(ctx, arguments.Nodes[0], inherited, seen)
		}
		if builtin(ctx, node, "Record") && arguments != nil && len(arguments.Nodes) > 0 && broadKey(ctx, arguments.Nodes[0], inherited, seen) {
			return "open dictionary", true
		}
		kind, ok := aliasTarget(ctx, node, inherited, seen)
		if ok && len(declarationTypeParameters(ctx, node)) > 0 && kind == "open dictionary" {
			return "generic container", true
		}
		return kind, ok
	}
	return "", false
}

func declarationTypeParameters(ctx rule.RuleContext, node *ast.Node) []*ast.Node {
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
	if symbol != nil {
		for _, declaration := range symbol.Declarations {
			if ast.IsTypeAliasDeclaration(declaration) {
				return declaration.TypeParameters()
			}
		}
	}
	return nil
}

func knownEvidence(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Symbol]bool) bool {
	node = unwrapExpression(node)
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindObjectLiteralExpression, ast.KindArrayLiteralExpression, ast.KindArrowFunction, ast.KindFunctionExpression, ast.KindClassExpression, ast.KindNewExpression,
		ast.KindStringLiteral, ast.KindNumericLiteral, ast.KindBigIntLiteral, ast.KindRegularExpressionLiteral, ast.KindNoSubstitutionTemplateLiteral, ast.KindTemplateExpression,
		ast.KindTrueKeyword, ast.KindFalseKeyword, ast.KindNullKeyword, ast.KindPrefixUnaryExpression, ast.KindTypeOfExpression, ast.KindVoidExpression, ast.KindDeleteExpression:
		return true
	case ast.KindIdentifier:
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil || seen[symbol] || len(symbol.Declarations) != 1 {
			return false
		}
		declaration := symbol.Declarations[0]
		if !ast.IsVariableDeclaration(declaration) || declaration.Parent == nil || declaration.Parent.Flags&ast.NodeFlagsConst == 0 {
			return false
		}
		initializer := declaration.AsVariableDeclaration().Initializer
		if initializer == nil {
			return false
		}
		seen[symbol] = true
		result := knownEvidence(ctx, initializer, seen)
		delete(seen, symbol)
		return result
	}
	return false
}

func emptyObject(node *ast.Node) bool {
	node = unwrapExpression(node)
	return ast.IsObjectLiteralExpression(node) && len(node.AsObjectLiteralExpression().Properties.Nodes) == 0
}

func reportFlow(ctx rule.RuleContext, expression, target *ast.Node, subject string) {
	kind, ok := wideningTarget(ctx, target, substitutions{}, map[*ast.Node]bool{})
	if !ok || ((kind == "open dictionary" || kind == "generic container") && emptyObject(expression)) || !knownEvidence(ctx, expression, map[*ast.Symbol]bool{}) {
		return
	}
	ctx.ReportNode(expression, rule.RuleMessage{
		Id:          "no-known-value-widening",
		Description: fmt.Sprintf("The explicit %s type on %s discards known type evidence.", kind, subject),
		Help:        "Keep inference, validate with `satisfies`, or use a named owner contract.",
	})
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}

func outermostAssertion(node *ast.Node) bool {
	current := node
	for current.Parent != nil && ast.IsParenthesizedExpression(current.Parent) {
		current = current.Parent
	}
	parent := current.Parent
	return parent == nil || (parent.Kind != ast.KindAsExpression && parent.Kind != ast.KindTypeAssertionExpression)
}

func unsafeEvidenceType(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Node]bool) bool {
	node = unwrapType(node)
	if node == nil {
		return false
	}
	switch node.Kind {
	case ast.KindUnknownKeyword, ast.KindAnyKeyword, ast.KindObjectKeyword:
		return true
	case ast.KindTypeLiteral:
		return len(node.AsTypeLiteralNode().Members.Nodes) == 0
	case ast.KindUnionType:
		for _, part := range node.AsUnionTypeNode().Types.Nodes {
			if unsafeEvidenceType(ctx, part, seen) {
				return true
			}
		}
	case ast.KindTypeReference:
		arguments := node.AsTypeReferenceNode().TypeArguments
		if (builtin(ctx, node, "Readonly") || builtin(ctx, node, "Partial") || builtin(ctx, node, "Required") || builtin(ctx, node, "NonNullable")) && arguments != nil && len(arguments.Nodes) > 0 {
			return unsafeEvidenceType(ctx, arguments.Nodes[0], seen)
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
		if symbol == nil {
			return false
		}
		for _, declaration := range symbol.Declarations {
			if ast.IsInterfaceDeclaration(declaration) {
				return len(declaration.AsInterfaceDeclaration().Members.Nodes) == 0
			}
			if ast.IsTypeAliasDeclaration(declaration) && !seen[declaration] {
				seen[declaration] = true
				result := unsafeEvidenceType(ctx, declaration.AsTypeAliasDeclaration().Type, seen)
				delete(seen, declaration)
				return result
			}
		}
	}
	return false
}

func callReturnType(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	if node == nil || !ast.IsCallExpression(node) {
		return nil
	}
	callee := unwrapExpression(node.AsCallExpression().Expression)
	var owner *ast.Node
	if ast.IsFunctionLike(callee) {
		owner = callee
	} else if ast.IsIdentifier(callee) {
		symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
		if symbol == nil || len(symbol.Declarations) != 1 {
			return nil
		}
		owner = symbol.Declarations[0]
		if ast.IsVariableDeclaration(owner) {
			owner = unwrapExpression(owner.AsVariableDeclaration().Initializer)
		}
	}
	if owner != nil && ast.IsFunctionLike(owner) {
		return owner.Type()
	}
	return nil
}

func informativeArgument(ctx rule.RuleContext, node *ast.Node) bool {
	unwrapped := ast.SkipParentheses(node)
	if unwrapped.Kind == ast.KindAsExpression || unwrapped.Kind == ast.KindTypeAssertionExpression {
		return !unsafeEvidenceType(ctx, unwrapped.Type(), map[*ast.Node]bool{})
	}
	if returnType := callReturnType(ctx, unwrapped); returnType != nil {
		return !unsafeEvidenceType(ctx, returnType, map[*ast.Node]bool{})
	}
	if ast.IsIdentifier(unwrapped) {
		symbol := utils.ResolvedSymbol(ctx.TypeChecker, unwrapped)
		if symbol != nil && len(symbol.Declarations) == 1 {
			declaration := symbol.Declarations[0]
			if declaration.Type() != nil {
				return !unsafeEvidenceType(ctx, declaration.Type(), map[*ast.Node]bool{})
			}
		}
	}
	value := ctx.TypeChecker.GetTypeAtLocation(node)
	return value != nil && checker.Type_flags(value)&(checker.TypeFlagsUnknown|checker.TypeFlagsAny) == 0
}

func predicateCall(ctx rule.RuleContext, node *ast.Node) {
	call := node.AsCallExpression()
	callee := unwrapExpression(call.Expression)
	var owner *ast.Node
	if ast.IsFunctionLike(callee) {
		owner = callee
	} else if ast.IsIdentifier(callee) {
		symbol := ctx.TypeChecker.GetSymbolAtLocation(callee)
		if symbol == nil || len(symbol.Declarations) != 1 {
			return
		}
		owner = symbol.Declarations[0]
		if ast.IsVariableDeclaration(owner) {
			owner = unwrapExpression(owner.AsVariableDeclaration().Initializer)
		}
	} else {
		return
	}
	if owner == nil || !ast.IsFunctionLike(owner) || owner.Type() == nil || owner.Type().Kind != ast.KindTypePredicate {
		return
	}
	predicate := owner.Type().AsTypePredicateNode()
	if predicate.ParameterName == nil || !ast.IsIdentifier(predicate.ParameterName) {
		return
	}
	index := -1
	for candidate, parameter := range owner.Parameters() {
		if ast.IsIdentifier(parameter.Name()) && parameter.Name().Text() == predicate.ParameterName.Text() {
			index = candidate
			break
		}
	}
	if index < 0 || index >= len(call.Arguments.Nodes) || index >= len(owner.Parameters()) {
		return
	}
	parameter := owner.Parameters()[index]
	if parameter.Type() == nil || !containsUnknown(parameter.Type()) {
		return
	}
	argument := call.Arguments.Nodes[index]
	if !informativeArgument(ctx, argument) {
		return
	}
	name := "anonymous function"
	if owner.Name() != nil {
		name = owner.Name().Text()
	} else if owner.Parent != nil && ast.IsVariableDeclaration(owner.Parent) && owner.Parent.Name() != nil {
		name = owner.Parent.Name().Text()
	}
	ctx.ReportNode(argument, rule.RuleMessage{
		Id:          "no-known-value-widening",
		Description: fmt.Sprintf("The explicit unknown type on argument for parameter `%s` of `%s` discards known type evidence.", predicate.ParameterName.Text(), name),
		Help:        "Keep inference, validate with `satisfies`, or use a named owner contract.",
	})
}

func containsUnknown(node *ast.Node) bool {
	node = unwrapType(node)
	if node == nil {
		return false
	}
	if node.Kind == ast.KindUnknownKeyword {
		return true
	}
	if node.Kind == ast.KindUnionType {
		for _, part := range node.AsUnionTypeNode().Types.Nodes {
			if containsUnknown(part) {
				return true
			}
		}
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if declaration.Initializer != nil && ast.IsIdentifier(declaration.Name()) {
				reportFlow(ctx, declaration.Initializer, declaration.Type, fmt.Sprintf("binding `%s`", declaration.Name().Text()))
			}
		},
		ast.KindPropertyDeclaration: func(node *ast.Node) {
			if node.Initializer() != nil {
				name, _ := ast.TryGetTextOfPropertyName(node.Name())
				reportFlow(ctx, node.Initializer(), node.Type(), fmt.Sprintf("property `%s`", name))
			}
		},
		ast.KindBinaryExpression: func(node *ast.Node) {
			if !ast.IsAssignmentExpression(node, false) {
				return
			}
			binary := node.AsBinaryExpression()
			left := unwrapExpression(binary.Left)
			if !ast.IsIdentifier(left) {
				return
			}
			symbol := utils.ResolvedSymbol(ctx.TypeChecker, left)
			if symbol == nil || len(symbol.Declarations) != 1 || !ast.IsVariableDeclaration(symbol.Declarations[0]) {
				return
			}
			declaration := symbol.Declarations[0].AsVariableDeclaration()
			reportFlow(ctx, binary.Right, declaration.Type, fmt.Sprintf("binding `%s`", left.Text()))
		},
		ast.KindCallExpression: func(node *ast.Node) { predicateCall(ctx, node) },
		ast.KindReturnStatement: func(node *ast.Node) {
			expression := node.AsReturnStatement().Expression
			owner := enclosingFunction(node)
			if expression != nil && owner != nil {
				name := "anonymous function"
				if owner.Name() != nil {
					name = owner.Name().Text()
				}
				reportFlow(ctx, expression, owner.Type(), fmt.Sprintf("return value of `%s`", name))
			}
		},
		ast.KindArrowFunction: func(node *ast.Node) {
			body := node.AsArrowFunction().Body
			if body != nil && body.Kind != ast.KindBlock {
				reportFlow(ctx, body, node.Type(), "return value of `anonymous function`")
			}
		},
		ast.KindAsExpression: func(node *ast.Node) {
			if outermostAssertion(node) {
				reportFlow(ctx, node.Expression(), node.Type(), "assertion")
			}
		},
		ast.KindTypeAssertionExpression: func(node *ast.Node) {
			if outermostAssertion(node) {
				reportFlow(ctx, node.Expression(), node.Type(), "assertion")
			}
		},
	}
}

var Rule = rule.Rule{Name: "no-known-value-widening", Run: run}
