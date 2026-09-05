package no_schema_opaque_instance_members

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-schema-opaque-instance-members",
	Description: "Avoid instance members on a Schema.Opaque subclass.",
	Help:        "Schema.Opaque over Schema.Struct returns the carrier's values rather than instances of this class, so inherited makers do not install instance fields, methods, accessors, or constructor behavior. Keep helpers static, or use Schema.Class when values must be instances.",
}

var Rule = rule.Rule{Name: "no-schema-opaque-instance-members", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		if !directOpaqueStructCarrier(ctx, node) || hasConstructionOverride(ctx, node) {
			return
		}
		for _, member := range node.ClassLikeData().Members.Nodes {
			if emittedInstanceMember(ctx, member) {
				ctx.ReportNode(member, message)
			}
		}
	}
	return rule.RuleListeners{
		ast.KindClassDeclaration: check,
		ast.KindClassExpression:  check,
	}
}}

func directOpaqueStructCarrier(ctx rule.RuleContext, node *ast.Node) bool {
	clauses := node.ClassLikeData().HeritageClauses
	if clauses == nil {
		return false
	}
	for _, clause := range clauses.Nodes {
		if clause.AsHeritageClause().Token != ast.KindExtendsKeyword {
			continue
		}
		for _, base := range clause.AsHeritageClause().Types.Nodes {
			if opaqueStructCall(ctx, base.AsExpressionWithTypeArguments().Expression) {
				return true
			}
		}
	}
	return false
}

func opaqueStructCall(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) {
		return false
	}
	carrier := node.AsCallExpression()
	if len(carrier.Arguments.Nodes) != 1 || !effectSchemaCall(ctx, carrier.Arguments.Nodes[0], "Struct") {
		return false
	}
	factory := unwrap(carrier.Expression)
	return ast.IsCallExpression(factory) && effectSchemaCall(ctx, factory.AsCallExpression().Expression, "Opaque")
}

func effectSchemaCall(ctx rule.RuleContext, node *ast.Node, name string) bool {
	node = unwrap(node)
	if ast.IsCallExpression(node) {
		node = unwrap(node.AsCallExpression().Expression)
	}
	if ast.IsPropertyAccessExpression(node) {
		node = node.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	return symbol != nil && symbol.Name == name && utils.IsEffectSchemaSymbol(symbol)
}

func hasConstructionOverride(ctx rule.RuleContext, node *ast.Node) bool {
	for _, member := range node.ClassLikeData().Members.Nodes {
		if !ast.HasSyntacticModifier(member, ast.ModifierFlagsStatic) || !emitsStaticMember(ctx, member) {
			continue
		}
		switch propertyName(member.Name()) {
		case "make", "makeOption", "makeEffect":
			return true
		}
	}
	return false
}

func emitsStaticMember(ctx rule.RuleContext, node *ast.Node) bool {
	if ast.HasSyntacticModifier(node, ast.ModifierFlagsAmbient) {
		return false
	}
	switch node.Kind {
	case ast.KindPropertyDeclaration:
		return node.AsPropertyDeclaration().Initializer != nil || ctx.Program.Options().GetUseDefineForClassFields()
	case ast.KindMethodDeclaration, ast.KindGetAccessor, ast.KindSetAccessor:
		return node.Body() != nil
	default:
		return false
	}
}

func propertyName(node *ast.Node) string {
	if node == nil {
		return ""
	}
	if name, ok := ast.TryGetTextOfPropertyName(node); ok {
		return name
	}
	if ast.IsComputedPropertyName(node) && ast.IsStringLiteralLike(unwrap(node.Expression())) {
		return unwrap(node.Expression()).Text()
	}
	return ""
}

func emittedInstanceMember(ctx rule.RuleContext, node *ast.Node) bool {
	if ast.HasSyntacticModifier(node, ast.ModifierFlagsStatic) {
		return false
	}
	switch node.Kind {
	case ast.KindPropertyDeclaration:
		if ast.HasSyntacticModifier(node, ast.ModifierFlagsAmbient) || ast.HasSyntacticModifier(node, ast.ModifierFlagsAbstract) {
			return false
		}
		return node.AsPropertyDeclaration().Initializer != nil ||
			(node.Name() != nil && ast.IsPrivateIdentifier(node.Name())) ||
			ast.HasSyntacticModifier(node, ast.ModifierFlagsAccessor) ||
			ctx.Program.Options().GetUseDefineForClassFields()
	case ast.KindMethodDeclaration, ast.KindGetAccessor, ast.KindSetAccessor:
		return node.Body() != nil
	case ast.KindConstructor:
		body := node.Body()
		return body != nil && ast.IsBlock(body) && len(body.AsBlock().Statements.Nodes) > 0
	default:
		return false
	}
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
