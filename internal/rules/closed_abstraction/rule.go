package closed_abstraction

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

type functionEntry struct {
	name string
	node *ast.Node
	file *ast.SourceFile
}

var Rule = rule.Rule{Name: "closed-abstraction", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	inspect := func(node *ast.Node) {
		nameNode := node.Name()
		if nameNode == nil {
			return
		}
		name := nameNode.Text()
		owners := []functionEntry{}
		for _, fn := range projectFunctions(ctx) {
			if strings.Contains(nodeText(fn.file, fn.node), name) {
				owners = append(owners, fn)
			}
		}
		if len(owners) != 1 {
			return
		}
		owner := owners[0]
		if externalReferences(ctx, owner.name) > 1 {
			return
		}
		ctx.ReportNode(nameNode, rule.RuleMessage{Id: "closed-abstraction", Description: name + " and " + owner.name + " form a closed abstraction with at most one external owner.", Help: "Collapse the function and its private data vocabulary into their external owner, reuse an existing concept, or deepen the Module until the abstraction has independent leverage. Do not replace the named model with an anonymous object type."})
	}
	return rule.RuleListeners{ast.KindInterfaceDeclaration: inspect, ast.KindTypeAliasDeclaration: inspect}
}}

func projectFunctions(ctx rule.RuleContext) []functionEntry {
	var result []functionEntry
	for _, file := range ctx.Program.SourceFiles() {
		if strings.Contains(file.FileName(), "node_modules") || strings.HasSuffix(file.FileName(), ".d.ts") {
			continue
		}
		walk(file.AsNode(), func(node *ast.Node) bool {
			if !ast.IsFunctionLike(node) {
				return false
			}
			name := ""
			if ast.IsFunctionDeclaration(node) && node.Name() != nil {
				name = node.Name().Text()
			}
			if name == "" && node.Parent != nil && ast.IsVariableDeclaration(node.Parent) && node.Parent.Name() != nil {
				name = node.Parent.Name().Text()
			}
			if name != "" {
				result = append(result, functionEntry{name: name, node: node, file: file})
			}
			return false
		})
	}
	return result
}
func externalReferences(ctx rule.RuleContext, name string) int {
	pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(name) + `\b`)
	count := 0
	for _, file := range ctx.Program.SourceFiles() {
		if !strings.Contains(file.FileName(), "node_modules") && !strings.HasSuffix(file.FileName(), ".d.ts") {
			count += len(pattern.FindAllStringIndex(file.Text(), -1))
		}
	}
	if count > 0 {
		count--
	}
	return count
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression:
			node = node.Expression()
		case ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func propertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = unwrap(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return "", nil, false
	}
	return node.Name().Text(), node.AsPropertyAccessExpression().Expression, true
}

func callName(node *ast.Node) (string, *ast.Node, bool) {
	if node == nil || !ast.IsCallExpression(node) {
		return "", nil, false
	}
	call := node.AsCallExpression()
	name, receiver, ok := propertyName(call.Expression)
	if ok {
		return name, receiver, true
	}
	callee := unwrap(call.Expression)
	if callee != nil && ast.IsIdentifier(callee) {
		return callee.Text(), nil, true
	}
	return "", nil, false
}

func nodeText(file *ast.SourceFile, node *ast.Node) string {
	if node == nil {
		return ""
	}
	start, end := node.Pos(), node.End()
	text := file.Text()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	if end < start {
		return ""
	}
	return strings.TrimSpace(text[start:end])
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

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
