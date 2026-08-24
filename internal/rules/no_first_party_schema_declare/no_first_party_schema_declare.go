package no_first_party_schema_declare

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

const help = "Schema.declare is for third-party integrations and non-parametric opaque or branded types validated by a type guard. For structural models you own, define a Schema.Struct plus a same-named decoded interface — for example export const MyType = Schema.Struct({ ... }); export interface MyType extends Schema.Schema.Type<typeof MyType> {} — which gives you validation, encoding, and decoding for free."

func isDeclareCall(node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}
	callee := node.AsCallExpression().Expression
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	access := callee.AsPropertyAccessExpression()
	return ast.IsIdentifier(access.Expression) && access.Expression.Text() == "Schema" && callee.Name().Text() == "declare"
}

func intersectionIsOpaqueAlias(node *ast.Node) bool {
	if !ast.IsIntersectionTypeNode(node) {
		return false
	}
	types := node.AsIntersectionTypeNode().Types.Nodes
	if len(types) <= 1 {
		return false
	}
	for _, part := range types {
		switch part.Kind {
		case ast.KindStringKeyword, ast.KindNumberKeyword, ast.KindBooleanKeyword, ast.KindBigIntKeyword, ast.KindSymbolKeyword:
			return true
		}
	}
	return false
}

func isStructuralOwnedDeclaration(declaration *ast.Node) bool {
	if ast.IsInterfaceDeclaration(declaration) || ast.IsClassDeclaration(declaration) {
		return true
	}
	return ast.IsTypeAliasDeclaration(declaration) && !intersectionIsOpaqueAlias(declaration.Type())
}

func isFirstPartyDeclaration(declaration *ast.Node) bool {
	current := declaration
	for current.Parent != nil {
		current = current.Parent
	}
	if !ast.IsSourceFile(current) {
		return false
	}
	sourceFile := current.AsSourceFile()
	return !sourceFile.IsDeclarationFile && !strings.Contains(strings.ReplaceAll(sourceFile.FileName(), "\\", "/"), "/node_modules/")
}

func firstPartyStructuralType(ctx rule.RuleContext, valueType *checker.Type) (*ast.Symbol, bool) {
	if valueType == nil || utils.IsTypeFlagSet(valueType, checker.TypeFlagsTypeParameter) || len(utils.GetCallSignatures(ctx.TypeChecker, valueType)) != 0 {
		return nil, false
	}
	symbol := checker.Type_symbol(valueType)
	if symbol == nil {
		return nil, false
	}
	for _, declaration := range symbol.Declarations {
		if isFirstPartyDeclaration(declaration) && isStructuralOwnedDeclaration(declaration) {
			return symbol, true
		}
	}
	return nil, false
}

func assertedType(ctx rule.RuleContext, predicate *ast.Node) *checker.Type {
	predicateType := ctx.TypeChecker.GetTypeAtLocation(predicate)
	signatures := utils.GetCallSignatures(ctx.TypeChecker, predicateType)
	if len(signatures) == 0 {
		return nil
	}
	typePredicate := ctx.TypeChecker.GetTypePredicateOfSignature(signatures[0])
	if typePredicate == nil {
		return nil
	}
	return typePredicate.Type()
}

func checkCall(ctx rule.RuleContext, node *ast.Node) {
	if !isDeclareCall(node) {
		return
	}
	arguments := node.AsCallExpression().Arguments
	if arguments == nil || len(arguments.Nodes) == 0 {
		return
	}
	symbol, matches := firstPartyStructuralType(ctx, assertedType(ctx, arguments.Nodes[0]))
	if !matches {
		return
	}
	typeName := "unknown"
	if symbol.Name != "" {
		typeName = symbol.Name
	}
	ctx.ReportNode(node, rule.RuleMessage{
		Id:          "noFirstPartySchemaDeclare",
		Description: "Avoid Schema.declare for the first-party structural type \"" + typeName + "\".",
		Help:        help,
	})
}

var NoFirstPartySchemaDeclareRule = rule.Rule{
	Name: "no-first-party-schema-declare",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) { checkCall(ctx, node) }}
	},
}
