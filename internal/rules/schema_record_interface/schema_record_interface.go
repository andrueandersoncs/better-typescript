package schema_record_interface

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{Id: "schemaRecordInterface", Description: "Pair a Schema.Struct record with its decoded interface.", Help: "For UserSchema, export interface User extends Schema.Schema.Type<typeof UserSchema> beside the schema declaration."}

var SchemaRecordInterfaceRule = rule.Rule{
	Name: "schema-record-interface",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		paired := map[*ast.Symbol]bool{}
		walk(ctx.SourceFile.AsNode(), func(node *ast.Node) bool {
			if node.Kind != ast.KindInterfaceDeclaration || node.Name() == nil {
				return false
			}
			schemaName := node.Name().Text() + "Schema"
			if symbol := decodedInterface(ctx, node, schemaName); symbol != nil {
				paired[symbol] = true
			}
			return false
		})
		return rule.RuleListeners{ast.KindVariableDeclaration: func(node *ast.Node) {
			name := node.Name()
			initializer := skipTransparent(node.AsVariableDeclaration().Initializer)
			if name == nil || name.Kind != ast.KindIdentifier || initializer == nil || !ast.IsCallExpression(initializer) || paired[ctx.TypeChecker.GetSymbolAtLocation(name)] {
				return
			}
			if effectStructCall(ctx, initializer.AsCallExpression()) {
				ctx.ReportNode(name, message)
			}
		}}
	},
}

func expressionPath(node *ast.Node) []string {
	if node == nil {
		return nil
	}
	if ast.IsIdentifier(node) {
		return []string{node.Text()}
	}
	if !ast.IsPropertyAccessExpression(node) || node.Name() == nil || !ast.IsIdentifier(node.Name()) {
		return nil
	}
	path := expressionPath(node.AsPropertyAccessExpression().Expression)
	if len(path) == 0 {
		return nil
	}
	return append(path, node.Name().Text())
}

func expressionRoot(node *ast.Node) *ast.Node {
	for ast.IsPropertyAccessExpression(node) {
		node = node.AsPropertyAccessExpression().Expression
	}
	if ast.IsIdentifier(node) {
		return node
	}
	return nil
}

func decodedInterface(ctx rule.RuleContext, node *ast.Node, schemaName string) *ast.Symbol {
	clauses := node.AsInterfaceDeclaration().HeritageClauses
	if clauses == nil {
		return nil
	}
	for _, clause := range clauses.Nodes {
		for _, heritage := range clause.AsHeritageClause().Types.Nodes {
			if !ast.IsExpressionWithTypeArguments(heritage) {
				continue
			}
			expression := heritage.AsExpressionWithTypeArguments()
			path := expressionPath(expression.Expression)
			root := expressionRoot(expression.Expression)
			if len(path) != 3 || path[1] != "Schema" || path[2] != "Type" || root == nil || !utils.IsEffectSchemaSymbolAtLocation(ctx.TypeChecker, root) || expression.TypeArguments == nil || len(expression.TypeArguments.Nodes) != 1 {
				continue
			}
			argument := expression.TypeArguments.Nodes[0]
			if !ast.IsTypeQueryNode(argument) {
				continue
			}
			name := argument.AsTypeQueryNode().ExprName
			if name != nil && ast.IsIdentifier(name) && name.Text() == schemaName {
				return ctx.TypeChecker.GetSymbolAtLocation(name)
			}
		}
	}
	return nil
}

func skipTransparent(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression,
			ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func effectStructCall(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := skipTransparent(call.Expression)
	if callee == nil {
		return false
	}
	if ast.IsPropertyAccessExpression(callee) {
		access := callee.AsPropertyAccessExpression()
		receiver := skipTransparent(access.Expression)
		return access.Name() != nil && access.Name().Text() == "Struct" && receiver != nil && ast.IsIdentifier(receiver) && utils.IsEffectSchemaSymbolAtLocation(ctx.TypeChecker, receiver)
	}
	if ast.IsIdentifier(callee) {
		symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
		return symbol != nil && symbol.Name == "Struct" && utils.IsEffectSchemaSymbol(symbol)
	}
	return false
}

func walk(node *ast.Node, visit func(*ast.Node) bool) bool {
	if node == nil {
		return false
	}
	if visit(node) {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if walk(child, visit) {
			found = true
			return true
		}
		return false
	})
	return found
}

var Rule = SchemaRecordInterfaceRule
