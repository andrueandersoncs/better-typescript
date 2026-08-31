package require_export_jsdoc

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/parser"
)

var message = rule.RuleMessage{
	Id:          "requireExportJSDoc",
	Description: `Exports need structured JSDoc with a "Scope: public" or "Scope: private" section.`,
	Help:        `Private exports must only declare their scope. Public exports also need a concise, specific scenario in the "When to use:" section and a complete, minimal TypeScript code example in a fenced "Example:" section.`,
}

func normalizeLine(line string) string {
	line = strings.TrimSpace(line)
	if strings.HasPrefix(line, "*") {
		line = strings.TrimSpace(line[1:])
	}
	return line
}

func hasPublicSections(body []string) bool {
	if len(body) < 8 || body[0] != "Scope: public" || body[1] != "" {
		return false
	}
	if !strings.HasPrefix(body[2], "When to use: ") || strings.TrimSpace(strings.TrimPrefix(body[2], "When to use: ")) == "" {
		return false
	}
	if body[3] != "" || body[4] != "Example:" || body[5] != "```ts" || body[len(body)-1] != "```" {
		return false
	}
	for _, line := range body[6 : len(body)-1] {
		if strings.TrimSpace(line) != "" {
			return true
		}
	}
	return false
}

func isStructuredJSDoc(text string) bool {
	lines := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n")
	if len(lines) < 5 || strings.TrimSpace(lines[0]) != "/**" {
		return false
	}
	closing := strings.TrimSpace(lines[len(lines)-1])
	if closing != "*/" && closing != "**/" {
		return false
	}

	body := make([]string, len(lines)-2)
	for index, line := range lines[1 : len(lines)-1] {
		body[index] = normalizeLine(line)
	}
	if body[0] != "" || body[len(body)-1] != "" {
		return false
	}
	body = body[1 : len(body)-1]

	if len(body) == 1 && body[0] == "Scope: private" {
		return true
	}
	return hasPublicSections(body)
}

func hasStructuredJSDoc(factory *ast.NodeFactory, source string, node *ast.Node) bool {
	for _, comment := range parser.GetJSDocCommentRanges(factory, nil, node, source) {
		if isStructuredJSDoc(source[comment.Pos():comment.End()]) {
			return true
		}
	}
	return false
}

var Rule = rule.Rule{
	Name: "require-export-jsdoc",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		factory := ast.NewNodeFactory(ast.NodeFactoryHooks{})
		check := func(reportNode *ast.Node, documentationNode *ast.Node) {
			if hasStructuredJSDoc(factory, ctx.SourceFile.Text(), documentationNode) {
				return
			}
			ctx.ReportNode(reportNode, message)
		}
		return rule.RuleListeners{
			ast.KindExportKeyword: func(node *ast.Node) {
				if node.Parent == nil || node.Flags&ast.NodeFlagsReparsed != 0 {
					return
				}
				check(node, node.Parent)
			},
			ast.KindExportDeclaration: func(node *ast.Node) { check(node, node) },
			ast.KindExportAssignment:  func(node *ast.Node) { check(node, node) },
		}
	},
}
