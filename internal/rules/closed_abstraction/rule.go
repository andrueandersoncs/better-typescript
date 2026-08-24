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

type functionIndexKey struct{}
type referenceCountIndexKey struct{}

var Rule = rule.Rule{Name: "closed-abstraction", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	functions := projectFunctions(ctx)
	inspect := func(node *ast.Node) {
		nameNode := node.Name()
		if nameNode == nil {
			return
		}
		name := nameNode.Text()
		owners := []functionEntry{}
		for _, fn := range functions {
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
	return rule.ProgramCacheValue(ctx, functionIndexKey{}, func() []functionEntry {
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
					name, _ = ast.TryGetTextOfPropertyName(node.Parent.Name())
				}
				if name != "" {
					result = append(result, functionEntry{name: name, node: node, file: file})
				}
				return false
			})
		}
		return result
	})
}

func externalReferences(ctx rule.RuleContext, name string) int {
	count := 0
	if asciiWord(name) {
		count = projectReferenceCounts(ctx)[name]
	} else {
		pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(name) + `\b`)
		for _, file := range ctx.Program.SourceFiles() {
			if !strings.Contains(file.FileName(), "node_modules") && !strings.HasSuffix(file.FileName(), ".d.ts") {
				count += len(pattern.FindAllStringIndex(file.Text(), -1))
			}
		}
	}
	if count > 0 {
		count--
	}
	return count
}

func projectReferenceCounts(ctx rule.RuleContext) map[string]int {
	return rule.ProgramCacheValue(ctx, referenceCountIndexKey{}, func() map[string]int {
		result := make(map[string]int)
		for _, file := range ctx.Program.SourceFiles() {
			if strings.Contains(file.FileName(), "node_modules") || strings.HasSuffix(file.FileName(), ".d.ts") {
				continue
			}
			forEachWord(file.Text(), func(word string) {
				result[word]++
			})
		}
		return result
	})
}

func asciiWord(text string) bool {
	if text == "" {
		return false
	}
	for index := range len(text) {
		if !wordByte(text[index]) {
			return false
		}
	}
	return true
}

func forEachWord(text string, visit func(string)) {
	start := -1
	for index := 0; index <= len(text); index++ {
		if index < len(text) && wordByte(text[index]) {
			if start == -1 {
				start = index
			}
			continue
		}
		if start != -1 {
			visit(text[start:index])
			start = -1
		}
	}
}

func wordByte(value byte) bool {
	return value >= 'a' && value <= 'z' || value >= 'A' && value <= 'Z' || value >= '0' && value <= '9' || value == '_'
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
