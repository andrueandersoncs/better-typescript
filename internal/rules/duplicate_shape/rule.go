package duplicate_shape

import (
	"sort"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

type dataEntry struct {
	name, shape, key string
	node             *ast.Node
	file             *ast.SourceFile
}

var Rule = rule.Rule{Name: "duplicate-shape", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	inspect := func(node *ast.Node) {
		name, shape, ok := dataShape(ctx.SourceFile, node)
		if !ok {
			return
		}
		selfKey := ctx.SourceFile.FileName() + ":" + name
		targetName, targetKey, count := "", "", 0
		for _, entry := range projectData(ctx) {
			if entry.shape == shape {
				count++
				if targetKey == "" || entry.key < targetKey {
					targetKey, targetName = entry.key, entry.name
				}
			}
		}
		if count < 2 || targetKey == selfKey {
			return
		}
		ctx.ReportNode(node.Name(), rule.RuleMessage{Id: "duplicate-shape", Description: name + " duplicates the concrete structure of " + targetName + ".", Help: "Reuse the existing data structure or merge the concepts. Keep a distinct representation only for an independently evolving boundary or invariant, and retain the duplicate evidence for review."})
	}
	return rule.RuleListeners{ast.KindInterfaceDeclaration: inspect, ast.KindTypeAliasDeclaration: inspect}
}}

func projectData(ctx rule.RuleContext) []dataEntry {
	var result []dataEntry
	for _, file := range ctx.Program.SourceFiles() {
		if strings.Contains(file.FileName(), "node_modules") || strings.HasSuffix(file.FileName(), ".d.ts") {
			continue
		}
		walk(file.AsNode(), func(node *ast.Node) bool {
			name, shape, ok := dataShape(file, node)
			if ok {
				result = append(result, dataEntry{name: name, shape: shape, key: file.FileName() + ":" + name, node: node, file: file})
			}
			return false
		})
	}
	return result
}
func dataShape(file *ast.SourceFile, node *ast.Node) (string, string, bool) {
	if node == nil || node.Name() == nil {
		return "", "", false
	}
	name := node.Name().Text()
	content := ""
	if ast.IsInterfaceDeclaration(node) {
		content = nodeText(file, node)
		if i := strings.Index(content, "{"); i >= 0 {
			content = content[i:]
		}
	} else if ast.IsTypeAliasDeclaration(node) {
		content = nodeText(file, node.AsTypeAliasDeclaration().Type)
	} else {
		return "", "", false
	}
	return name, canonicalShape(content), true
}
func canonicalShape(value string) string {
	value = strings.ReplaceAll(value, "readonly", "")
	value = strings.Join(strings.Fields(value), "")
	if len(value) >= 2 && value[0] == '{' && value[len(value)-1] == '}' {
		inner := value[1 : len(value)-1]
		parts := splitTopLevel(inner, ';')
		for index := range parts {
			parts[index] = canonicalShape(parts[index])
		}
		sort.Strings(parts)
		return "{" + strings.Join(parts, ";") + "}"
	}
	if parts := splitTopLevel(value, '|'); len(parts) > 1 {
		for index := range parts {
			parts[index] = canonicalShape(parts[index])
		}
		sort.Strings(parts)
		return strings.Join(parts, "|")
	}
	if parts := splitTopLevel(value, '&'); len(parts) > 1 {
		for index := range parts {
			parts[index] = canonicalShape(parts[index])
		}
		sort.Strings(parts)
		return strings.Join(parts, "&")
	}
	return value
}
func splitTopLevel(value string, separator rune) []string {
	depth := 0
	start := 0
	result := []string{}
	for i, r := range value {
		switch r {
		case '{', '[', '(', '<':
			depth++
		case '}', ']', ')', '>':
			depth--
		default:
			if r == separator && depth == 0 {
				if part := value[start:i]; part != "" {
					result = append(result, part)
				}
				start = i + 1
			}
		}
	}
	if part := value[start:]; part != "" {
		result = append(result, part)
	}
	return result
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
