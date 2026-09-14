package no_unsafe_dictionary_type

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

type substitutions map[string]*ast.Node

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

func referenceName(node *ast.Node) string {
	if node == nil || !ast.IsTypeReferenceNode(node) || !ast.IsIdentifier(node.AsTypeReferenceNode().TypeName) {
		return ""
	}
	return node.AsTypeReferenceNode().TypeName.Text()
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

func builtin(ctx rule.RuleContext, node *ast.Node, name string) bool {
	if referenceName(node) != name {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
	if symbol == nil || len(symbol.Declarations) == 0 {
		return true
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil || !strings.HasPrefix(filepath.Base(file.FileName()), "lib.") {
			return false
		}
	}
	return true
}

func alias(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	if node == nil || !ast.IsTypeReferenceNode(node) {
		return nil
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
	if symbol == nil {
		return nil
	}
	for _, declaration := range symbol.Declarations {
		if ast.IsTypeAliasDeclaration(declaration) {
			return declaration
		}
	}
	return nil
}

func aliasSubstitutions(reference, declaration *ast.Node, inherited substitutions) (substitutions, bool) {
	next := make(substitutions, len(inherited)+len(declaration.TypeParameters()))
	for key, value := range inherited {
		next[key] = value
	}
	arguments := reference.AsTypeReferenceNode().TypeArguments
	for index, parameter := range declaration.TypeParameters() {
		var argument *ast.Node
		if arguments != nil && index < len(arguments.Nodes) {
			argument = arguments.Nodes[index]
		} else {
			argument = parameter.AsTypeParameterDeclaration().DefaultType
		}
		if argument == nil {
			return nil, false
		}
		argument = resolveSubstitution(argument, inherited)
		if referenceName(argument) == parameter.Name().Text() && inherited[parameter.Name().Text()] == nil {
			return nil, false
		}
		next[parameter.Name().Text()] = argument
	}
	return next, true
}

func effectivelyEmptyMember(member *ast.Node) bool {
	return ast.IsPropertySignatureDeclaration(member) && member.QuestionToken() != nil && unwrapType(member.Type()) != nil && unwrapType(member.Type()).Kind == ast.KindNeverKeyword
}

func effectivelyEmptyObject(ctx rule.RuleContext, node *ast.Node) bool {
	if ast.IsTypeLiteralNode(node) {
		members := node.AsTypeLiteralNode().Members.Nodes
		if len(members) == 0 {
			return true
		}
		for _, member := range members {
			if !effectivelyEmptyMember(member) {
				return false
			}
		}
		return true
	}
	if !ast.IsTypeReferenceNode(node) {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node.AsTypeReferenceNode().TypeName)
	if symbol == nil || len(symbol.Declarations) != 1 || !ast.IsInterfaceDeclaration(symbol.Declarations[0]) {
		return false
	}
	declaration := symbol.Declarations[0].AsInterfaceDeclaration()
	if declaration.HeritageClauses != nil && len(declaration.HeritageClauses.Nodes) > 0 {
		return false
	}
	members := declaration.Members.Nodes
	if len(members) == 0 {
		return true
	}
	for _, member := range members {
		if !effectivelyEmptyMember(member) {
			return false
		}
	}
	return true
}

func unsafeValue(ctx rule.RuleContext, node *ast.Node, inherited substitutions, seen map[*ast.Node]bool) string {
	node = unwrapType(node)
	if node == nil {
		return ""
	}
	switch node.Kind {
	case ast.KindUnknownKeyword:
		return "unknown"
	case ast.KindAnyKeyword:
		return "any"
	case ast.KindObjectKeyword:
		return "object"
	case ast.KindTypeLiteral:
		if effectivelyEmptyObject(ctx, node) {
			return "empty-object"
		}
	case ast.KindUnionType:
		for _, part := range node.AsUnionTypeNode().Types.Nodes {
			if unsafeValue(ctx, part, inherited, seen) != "" {
				return "union"
			}
		}
	case ast.KindIntersectionType:
		values := make([]string, 0, len(node.AsIntersectionTypeNode().Types.Nodes))
		allUnsafe := true
		for _, part := range node.AsIntersectionTypeNode().Types.Nodes {
			value := unsafeValue(ctx, part, inherited, seen)
			if value == "any" {
				return "any"
			}
			values = append(values, value)
			allUnsafe = allUnsafe && value != ""
		}
		if allUnsafe && len(values) > 0 {
			return values[0]
		}
	case ast.KindTypeReference:
		if replacement := resolveSubstitution(node, inherited); replacement != node {
			return unsafeValue(ctx, replacement, inherited, seen)
		}
		arguments := node.AsTypeReferenceNode().TypeArguments
		for _, wrapper := range []string{"Readonly", "Partial", "Required", "NonNullable"} {
			if builtin(ctx, node, wrapper) && arguments != nil && len(arguments.Nodes) > 0 {
				return unsafeValue(ctx, arguments.Nodes[0], inherited, seen)
			}
		}
		if effectivelyEmptyObject(ctx, node) {
			return "empty-object"
		}
		declaration := alias(ctx, node)
		if declaration == nil || seen[declaration] {
			return ""
		}
		next, ok := aliasSubstitutions(node, declaration, inherited)
		if !ok {
			return ""
		}
		seen[declaration] = true
		value := unsafeValue(ctx, declaration.AsTypeAliasDeclaration().Type, next, seen)
		delete(seen, declaration)
		return value
	}
	return ""
}

func dictionaryValue(ctx rule.RuleContext, node *ast.Node, inherited substitutions, seen map[*ast.Node]bool) string {
	node = unwrapType(node)
	if node == nil {
		return ""
	}
	switch node.Kind {
	case ast.KindTypeLiteral:
		for _, member := range node.AsTypeLiteralNode().Members.Nodes {
			if ast.IsIndexSignatureDeclaration(member) {
				if value := unsafeValue(ctx, member.Type(), inherited, seen); value != "" {
					return value
				}
			}
		}
	case ast.KindMappedType:
		return unsafeValue(ctx, node.AsMappedTypeNode().Type, inherited, seen)
	case ast.KindTypeReference:
		if replacement := resolveSubstitution(node, inherited); replacement != node {
			return dictionaryValue(ctx, replacement, inherited, seen)
		}
		arguments := node.AsTypeReferenceNode().TypeArguments
		for _, wrapper := range []string{"Readonly", "Partial", "Required"} {
			if builtin(ctx, node, wrapper) && arguments != nil && len(arguments.Nodes) > 0 {
				return dictionaryValue(ctx, arguments.Nodes[0], inherited, seen)
			}
		}
		if builtin(ctx, node, "Record") && arguments != nil && len(arguments.Nodes) > 1 {
			return unsafeValue(ctx, arguments.Nodes[1], inherited, seen)
		}
		if (builtin(ctx, node, "Pick") || builtin(ctx, node, "Omit")) && arguments != nil && len(arguments.Nodes) > 0 {
			return dictionaryValue(ctx, arguments.Nodes[0], inherited, seen)
		}
		declaration := alias(ctx, node)
		if declaration == nil || seen[declaration] {
			return ""
		}
		next, ok := aliasSubstitutions(node, declaration, inherited)
		if !ok {
			return ""
		}
		seen[declaration] = true
		value := dictionaryValue(ctx, declaration.AsTypeAliasDeclaration().Type, next, seen)
		delete(seen, declaration)
		return value
	}
	return ""
}

func insideConstraint(node *ast.Node) bool {
	child := node
	for parent := node.Parent; parent != nil && !ast.IsSourceFile(parent); parent = parent.Parent {
		if ast.IsTypeParameterDeclaration(parent) && parent.AsTypeParameterDeclaration().Constraint == child {
			return true
		}
		child = parent
	}
	return false
}

func plainAliasConsumer(node *ast.Node) bool {
	if !ast.IsTypeReferenceNode(node) || node.AsTypeReferenceNode().TypeArguments != nil {
		return false
	}
	for parent := node.Parent; parent != nil && !ast.IsSourceFile(parent); parent = parent.Parent {
		if ast.IsTypeAliasDeclaration(parent) {
			return false
		}
	}
	return true
}

func shouldReport(ctx rule.RuleContext, node *ast.Node) string {
	if insideConstraint(node) || plainAliasConsumer(node) {
		return ""
	}
	value := dictionaryValue(ctx, node, substitutions{}, map[*ast.Node]bool{})
	if value == "" {
		return ""
	}
	for parent := node.Parent; parent != nil && ast.IsTypeNode(parent); parent = parent.Parent {
		if dictionaryValue(ctx, parent, substitutions{}, map[*ast.Node]bool{}) != "" {
			return ""
		}
	}
	return value
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		if value := shouldReport(ctx, node); value != "" {
			ctx.ReportNode(node, rule.RuleMessage{
				Id:          "no-unsafe-dictionary-type",
				Description: fmt.Sprintf("This dictionary's %s value type gives callers no concrete value contract.", value),
				Help:        "Use an owner/schema-derived value type; parse external payloads before insertion.",
			})
		}
	}
	return rule.RuleListeners{
		ast.KindTypeReference: check,
		ast.KindTypeLiteral:   check,
		ast.KindMappedType:    check,
		ast.KindIndexSignature: func(node *ast.Node) {
			if node.Parent != nil && ast.IsTypeLiteralNode(node.Parent) {
				return
			}
			if value := unsafeValue(ctx, node.Type(), substitutions{}, map[*ast.Node]bool{}); value != "" && !insideConstraint(node) {
				ctx.ReportNode(node, rule.RuleMessage{Id: "no-unsafe-dictionary-type", Description: fmt.Sprintf("This dictionary's %s value type gives callers no concrete value contract.", value), Help: "Use an owner/schema-derived value type; parse external payloads before insertion."})
			}
		},
	}
}

var Rule = rule.Rule{Name: "no-unsafe-dictionary-type", Run: run}
