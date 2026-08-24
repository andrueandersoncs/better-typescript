package parameter_bag

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{
	Name: "parameter-bag",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			functionName, parameters := calledFunction(ctx, call.Expression)
			if functionName == "" {
				return
			}
			for index, argument := range call.Arguments.Nodes {
				argument = unwrap(argument)
				if index >= len(parameters) || !ast.IsObjectLiteralExpression(argument) {
					continue
				}
				modelName := referencedTypeName(parameters[index].Type())
				if modelName == "" {
					continue
				}
				ctx.ReportNode(argument, rule.RuleMessage{Id: "parameter-bag", Description: fmt.Sprintf("%s is constructed only to cross the %s call seam.", modelName, functionName), Help: "Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type."})
			}
		}}
	},
}

func calledFunction(ctx rule.RuleContext, expression *ast.Node) (string, []*ast.Node) {
	expression = unwrap(expression)
	target := expression
	if ast.IsPropertyAccessExpression(expression) {
		target = expression.AsPropertyAccessExpression().Name()
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(target)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil {
		return "", nil
	}
	for _, declaration := range symbol.Declarations {
		if ast.IsFunctionDeclaration(declaration) {
			return declaration.Name().Text(), declaration.AsFunctionDeclaration().Parameters.Nodes
		}
		if ast.IsMethodDeclaration(declaration) {
			return declaration.Name().Text(), declaration.AsMethodDeclaration().Parameters.Nodes
		}
		if ast.IsVariableDeclaration(declaration) {
			initializer := declaration.AsVariableDeclaration().Initializer
			if initializer == nil {
				continue
			}
			initializer = unwrap(initializer)
			if ast.IsArrowFunction(initializer) {
				return declaration.Name().Text(), initializer.AsArrowFunction().Parameters.Nodes
			}
			if ast.IsFunctionExpression(initializer) {
				return declaration.Name().Text(), initializer.AsFunctionExpression().Parameters.Nodes
			}
		}
	}
	return "", nil
}
func referencedTypeName(node *ast.Node) string {
	for node != nil && ast.IsParenthesizedTypeNode(node) {
		node = node.AsParenthesizedTypeNode().Type
	}
	if !ast.IsTypeReferenceNode(node) {
		return ""
	}
	name := node.AsTypeReferenceNode().TypeName
	if ast.IsIdentifier(name) {
		return name.Text()
	}
	if ast.IsQualifiedName(name) {
		return name.AsQualifiedName().Right.Text()
	}
	return ""
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression:
			node = node.AsAsExpression().Expression
		case ast.KindSatisfiesExpression:
			node = node.AsSatisfiesExpression().Expression
		default:
			return node
		}
	}
	return nil
}
