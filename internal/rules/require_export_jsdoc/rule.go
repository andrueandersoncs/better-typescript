package require_export_jsdoc

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/parser"
)

var message = rule.RuleMessage{
	Id:          "requireExportJSDoc",
	Description: `Exports need multi-line JSDoc with non-empty "Use when:" and "Example:" sections.`,
	Help:        "Check from first principles whether the export and declaration are needed. Remove either when it is not needed. Otherwise, add the required sections directly above the export; separate them with blank lines. Both sections may span multiple lines.",
}

func normalizeLine(line string) string {
	line = strings.TrimSpace(line)
	if strings.HasPrefix(line, "*") {
		line = strings.TrimSpace(line[1:])
	}
	return line
}

func sectionStart(line, label string) (string, bool) {
	if line == label {
		return "", true
	}
	if !strings.HasPrefix(line, label) || len(line) == len(label) {
		return "", false
	}
	separator := line[len(label)]
	if separator != ' ' && separator != '\t' {
		return "", false
	}
	return strings.TrimSpace(line[len(label):]), true
}

func hasContent(first string, rest []string) bool {
	if strings.TrimSpace(first) != "" {
		return true
	}
	for _, line := range rest {
		if strings.TrimSpace(line) != "" {
			return true
		}
	}
	return false
}

func isStructuredJSDoc(text string) bool {
	lines := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n")
	if len(lines) < 7 || strings.TrimSpace(lines[0]) != "/**" {
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
	if len(body) < 5 || body[0] != "" || body[len(body)-1] != "" {
		return false
	}
	body = body[1 : len(body)-1]

	useWhen, ok := sectionStart(body[0], "Use when:")
	if !ok {
		return false
	}
	for index := 1; index < len(body); index++ {
		example, isExample := sectionStart(body[index], "Example:")
		if !isExample {
			continue
		}
		if body[index-1] != "" || !hasContent(useWhen, body[1:index-1]) {
			return false
		}
		return hasContent(example, body[index+1:])
	}
	return false
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
