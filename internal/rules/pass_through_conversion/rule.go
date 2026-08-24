package pass_through_conversion

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var Rule = rule.Rule{
	Name: "pass-through-conversion",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			name, parameters, returnType, body := functionParts(node)
			if name == "" || len(parameters) != 1 || body == nil {
				return
			}
			parameter := parameters[0]
			parameterName := parameter.Name()
			sourceName := referencedTypeName(parameter.Type())
			targetName := referencedTypeName(returnType)
			if !ast.IsIdentifier(parameterName) || sourceName == "" || targetName == "" || sourceName == targetName || !sameShape(ctx, parameter.Type(), returnType) {
				return
			}
			object := returnedObject(body)
			if object == nil || len(object.AsObjectLiteralExpression().Properties.Nodes) == 0 || !copiesFields(object, parameterName.Text()) {
				return
			}
			ctx.ReportNode(object, rule.RuleMessage{Id: "pass-through-conversion", Description: fmt.Sprintf("%s copies %s into %s without transformation.", name, sourceName, targetName), Help: "Collapse the parallel representations or document and preserve the real boundary that requires both. A field-for-field adapter is evidence against introducing another first-party concept."})
		}
		return rule.RuleListeners{ast.KindFunctionDeclaration: check, ast.KindArrowFunction: check, ast.KindFunctionExpression: check, ast.KindMethodDeclaration: check}
	},
}

func functionParts(node *ast.Node) (string, []*ast.Node, *ast.Node, *ast.Node) {
	name := ""
	if node.Name() != nil && ast.IsIdentifier(node.Name()) {
		name = node.Name().Text()
	}
	if name == "" && node.Parent != nil && ast.IsVariableDeclaration(node.Parent) && ast.IsIdentifier(node.Parent.Name()) {
		name = node.Parent.Name().Text()
	}
	switch node.Kind {
	case ast.KindFunctionDeclaration:
		value := node.AsFunctionDeclaration()
		return name, value.Parameters.Nodes, value.Type, value.Body
	case ast.KindArrowFunction:
		value := node.AsArrowFunction()
		return name, value.Parameters.Nodes, value.Type, value.Body
	case ast.KindFunctionExpression:
		value := node.AsFunctionExpression()
		return name, value.Parameters.Nodes, value.Type, value.Body
	case ast.KindMethodDeclaration:
		value := node.AsMethodDeclaration()
		return name, value.Parameters.Nodes, value.Type, value.Body
	}
	return "", nil, nil, nil
}
func returnedObject(body *ast.Node) *ast.Node {
	body = unwrap(body)
	if ast.IsObjectLiteralExpression(body) {
		return body
	}
	if !ast.IsBlock(body) {
		return nil
	}
	statements := body.AsBlock().Statements.Nodes
	if len(statements) != 1 || !ast.IsReturnStatement(statements[0]) {
		return nil
	}
	expression := unwrap(statements[0].AsReturnStatement().Expression)
	if ast.IsObjectLiteralExpression(expression) {
		return expression
	}
	return nil
}
func copiesFields(object *ast.Node, parameterName string) bool {
	for _, property := range object.AsObjectLiteralExpression().Properties.Nodes {
		if ast.IsSpreadAssignment(property) {
			expression := unwrap(property.AsSpreadAssignment().Expression)
			if !ast.IsIdentifier(expression) || expression.Text() != parameterName {
				return false
			}
			continue
		}
		if !ast.IsPropertyAssignment(property) {
			return false
		}
		propertyName, ok := ast.TryGetTextOfPropertyName(property.Name())
		if !ok {
			return false
		}
		initializer := unwrap(property.AsPropertyAssignment().Initializer)
		if !ast.IsPropertyAccessExpression(initializer) {
			return false
		}
		access := initializer.AsPropertyAccessExpression()
		if access.Name().Text() != propertyName || !ast.IsIdentifier(unwrap(access.Expression)) || unwrap(access.Expression).Text() != parameterName {
			return false
		}
	}
	return true
}
func sameShape(ctx rule.RuleContext, sourceNode, targetNode *ast.Node) bool {
	if sourceNode == nil || targetNode == nil {
		return false
	}
	source := ctx.TypeChecker.GetTypeAtLocation(sourceNode)
	target := ctx.TypeChecker.GetTypeAtLocation(targetNode)
	sourceProperties := checker.Checker_getPropertiesOfType(ctx.TypeChecker, source)
	targetProperties := checker.Checker_getPropertiesOfType(ctx.TypeChecker, target)
	if len(sourceProperties) == 0 || len(sourceProperties) != len(targetProperties) {
		return false
	}
	targetByName := map[string]*ast.Symbol{}
	for _, property := range targetProperties {
		targetByName[property.Name] = property
	}
	for _, property := range sourceProperties {
		other := targetByName[property.Name]
		if other == nil {
			return false
		}
		left := ctx.TypeChecker.GetTypeOfSymbolAtLocation(property, sourceNode)
		right := ctx.TypeChecker.GetTypeOfSymbolAtLocation(other, targetNode)
		if ctx.TypeChecker.TypeToString(left) != ctx.TypeChecker.TypeToString(right) {
			return false
		}
	}
	return true
}

func referencedTypeName(node *ast.Node) string {
	for node != nil && ast.IsParenthesizedTypeNode(node) {
		node = node.AsParenthesizedTypeNode().Type
	}
	if node == nil || !ast.IsTypeReferenceNode(node) {
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
