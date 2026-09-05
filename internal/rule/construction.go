package rule

import "github.com/andrueandersoncs/typescript-go/ast"

func ConstructionName(node *ast.Node) (string, *ast.Node, bool) {
	var name *ast.Node
	if node.Parent != nil && (ast.IsVariableDeclaration(node.Parent) || ast.IsPropertyAssignment(node.Parent) || ast.IsPropertyDeclaration(node.Parent)) {
		name = node.Parent.Name()
	} else {
		name = ast.GetNameOfDeclaration(node)
	}
	if name == nil {
		return "", nil, false
	}
	text, ok := ast.TryGetTextOfPropertyName(name)
	return text, name, ok && isConstructionVerb(text)
}

func isConstructionVerb(name string) bool {
	switch name {
	case "build", "construct", "create", "make":
		return true
	default:
		return false
	}
}

func ValueParameterCount(node *ast.Node) int {
	count := 0
	for _, parameter := range node.Parameters() {
		if !ast.IsThisParameter(parameter) {
			count++
		}
	}
	return count
}

func IsUnaryConstructionParameter(parameter *ast.Node) bool {
	if parameter == nil || !ast.IsParameterDeclaration(parameter) || ast.IsThisParameter(parameter) {
		return false
	}
	function := parameter.Parent
	if function == nil || !ast.IsFunctionLike(function) {
		return false
	}
	_, _, construction := ConstructionName(function)
	return construction && ValueParameterCount(function) == 1
}
