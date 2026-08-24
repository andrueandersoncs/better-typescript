package schema_error_class

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{Id: "schemaErrorClass", Description: "Use Schema.TaggedErrorClass for typed Effect errors.", Help: "Map boundary failures into a tagged schema error with useful operation context."}
var errorNamePattern = regexp.MustCompile(`(?:Error|Failure|Exception)$`)

var SchemaErrorClassRule = rule.Rule{
	Name: "schema-error-class",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindClassDeclaration: func(node *ast.Node) {
			name := node.Name()
			if name == nil {
				return
			}
			text := ctx.SourceFile.Text()[node.Pos():node.End()]
			if regexp.MustCompile(`extends\s+(?:[A-Za-z_$][\w$]*\.)?(?:TaggedErrorClass|ErrorClass|TaggedError)`).MatchString(text) && strings.Contains(text, "Schema") {
				return
			}
			dataTagged := regexp.MustCompile(`extends\s+(?:Data\.)?(?:TaggedError|Error)\s*\(`).MatchString(text)
			hasTag := false
			for _, member := range node.AsClassDeclaration().Members.Nodes {
				if member.Kind != ast.KindPropertyDeclaration {
					continue
				}
				memberName, ok := ast.TryGetTextOfPropertyName(member.Name())
				if ok && memberName == "_tag" {
					hasTag = true
					break
				}
			}
			errorLike := errorNamePattern.MatchString(name.Text()) || dataTagged || regexp.MustCompile(`extends\s+(?:[A-Za-z_$][\w$]*\.)?Error(?:\s|<|\{)`).MatchString(text)
			if (hasTag || dataTagged) && errorLike {
				ctx.ReportNode(name, message)
			}
		}}
	},
}

var Rule = SchemaErrorClassRule
