package no_manual_tagged_union

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-manual-tagged-union",
	Description: "Avoid manually declaring a union of literal `_tag` object variants.",
	Help:        "Use Data.TaggedEnum for internal workflow decisions or state. For reusable boundary data, define Schema.TaggedStruct variants and compose them with Schema.TaggedUnion.",
}

func unwrapParentheses(node *ast.Node) *ast.Node {
	for node != nil && ast.IsParenthesizedTypeNode(node) {
		node = node.AsParenthesizedTypeNode().Type
	}
	return node
}

func builtInReadonly(ctx rule.RuleContext, node *ast.Node) (*ast.Node, bool) {
	if !ast.IsTypeReferenceNode(node) {
		return nil, false
	}
	reference := node.AsTypeReferenceNode()
	if !ast.IsIdentifier(reference.TypeName) || reference.TypeName.Text() != "Readonly" || reference.TypeArguments == nil || len(reference.TypeArguments.Nodes) != 1 {
		return nil, false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(reference.TypeName)
	if symbol == nil {
		return nil, false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && ctx.Program.IsSourceFileDefaultLibrary(file.Path()) {
			return reference.TypeArguments.Nodes[0], true
		}
	}
	return nil, false
}

func unwrapVariant(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	for {
		node = unwrapParentheses(node)
		inner, ok := builtInReadonly(ctx, node)
		if !ok {
			return node
		}
		node = inner
	}
}

func variantTag(ctx rule.RuleContext, node *ast.Node) (string, bool) {
	node = unwrapVariant(ctx, node)
	if !ast.IsTypeLiteralNode(node) {
		return "", false
	}
	for _, member := range node.AsTypeLiteralNode().Members.Nodes {
		if !ast.IsPropertySignatureDeclaration(member) || member.QuestionToken() != nil {
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(member.Name())
		if !ok || name != "_tag" {
			continue
		}
		typ := unwrapParentheses(member.Type())
		if typ == nil || !ast.IsLiteralTypeNode(typ) {
			return "", false
		}
		literal := typ.AsLiteralTypeNode().Literal
		if !ast.IsStringLiteralLike(literal) {
			return "", false
		}
		return literal.Text(), true
	}
	return "", false
}

func manualTaggedUnion(ctx rule.RuleContext, node *ast.Node) bool {
	typ := unwrapParentheses(node.AsTypeAliasDeclaration().Type)
	if typ == nil || typ.Kind != ast.KindUnionType {
		return false
	}
	parts := typ.AsUnionTypeNode().Types.Nodes
	if len(parts) < 2 {
		return false
	}
	firstTag := ""
	different := false
	for index, part := range parts {
		tag, ok := variantTag(ctx, part)
		if !ok {
			return false
		}
		if index == 0 {
			firstTag = tag
		} else if tag != firstTag {
			different = true
		}
	}
	return different
}

var Rule = rule.Rule{
	Name: "no-manual-tagged-union",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindTypeAliasDeclaration: func(node *ast.Node) {
			if manualTaggedUnion(ctx, node) {
				ctx.ReportNode(node.Name(), message)
			}
		}}
	},
}
