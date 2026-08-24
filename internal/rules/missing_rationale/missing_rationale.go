package missing_rationale

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var singleLineComment = regexp.MustCompile(`(?m)//([^\r\n]*)`)
var effectDataClass = regexp.MustCompile(`\bextends\s+(?:Data|Schema)\.(?:Class|Error|ErrorClass|Opaque|TaggedClass|TaggedError|TaggedErrorClass|asClass)\b|\bextends\s+[A-Za-z_$][\w$]*\.extend\b`)

type dataEntry struct {
	name          *ast.Node
	documentation *ast.Node
}

func interfaceCarriesData(node *ast.Node) bool {
	declaration := node.AsInterfaceDeclaration()
	if declaration.HeritageClauses != nil {
		return true
	}
	for _, member := range declaration.Members.Nodes {
		if ast.IsPropertySignatureDeclaration(member) || ast.IsIndexSignatureDeclaration(member) {
			return true
		}
	}
	return false
}

func aliasCarriesData(node *ast.Node) bool {
	typeNode := node.Type()
	return typeNode != nil && !ast.IsFunctionTypeNode(typeNode) && !ast.IsConstructorTypeNode(typeNode)
}

func classCarriesEffectData(ctx rule.RuleContext, node *ast.Node) bool {
	range_ := utils.TrimNodeTextRange(ctx.SourceFile, node)
	return effectDataClass.MatchString(ctx.SourceFile.Text()[range_.Pos():range_.End()])
}

func entriesForStatement(ctx rule.RuleContext, statement *ast.Node) []dataEntry {
	if ast.IsInterfaceDeclaration(statement) && interfaceCarriesData(statement) || ast.IsTypeAliasDeclaration(statement) && aliasCarriesData(statement) || ast.IsEnumDeclaration(statement) || ast.IsClassDeclaration(statement) && classCarriesEffectData(ctx, statement) {
		if statement.Name() != nil && ast.IsIdentifier(statement.Name()) {
			return []dataEntry{{name: statement.Name(), documentation: statement}}
		}
	}
	if !ast.IsVariableStatement(statement) || statement.ModifierFlags()&ast.ModifierFlagsExport == 0 {
		return nil
	}
	entries := []dataEntry{}
	for _, declaration := range statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
		if !ast.IsIdentifier(declaration.Name()) {
			continue
		}
		typeText := ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(declaration.Name()))
		if strings.Contains(typeText, "Schema<") || strings.HasPrefix(typeText, "Schema.") {
			entries = append(entries, dataEntry{name: declaration.Name(), documentation: statement})
		}
	}
	return entries
}

func rationaleIsComplete(source string, previousEnd int, documentationStart int) bool {
	start := previousEnd
	if start < 0 {
		start = 0
	}
	if start > documentationStart {
		return false
	}
	matches := singleLineComment.FindAllStringSubmatch(source[start:documentationStart], -1)
	parts := make([]string, 0, len(matches))
	for _, match := range matches {
		parts = append(parts, strings.TrimSpace(match[1]))
	}
	return strings.Contains(strings.ToLower(strings.Join(parts, " ")), "because")
}

func checkSourceFile(ctx rule.RuleContext) {
	previousEnd := 0
	for _, statement := range ctx.SourceFile.AsNode().Statements() {
		for _, entry := range entriesForStatement(ctx, statement) {
			if rationaleIsComplete(ctx.SourceFile.Text(), previousEnd, utils.TrimNodeTextRange(ctx.SourceFile, entry.documentation).Pos()) {
				continue
			}
			name := entry.name.Text()
			ctx.ReportNode(entry.name, rule.RuleMessage{
				Id:          "missingRationale",
				Description: name + " lacks a complete, structurally supported data-structure rationale.",
				Help:        "Delete or reuse this concept before documenting it. If it remains, add one single-line comment directly above the declaration explaining because why existing concepts are insufficient. The prose does not suppress structural evidence.",
			})
		}
		previousEnd = statement.End()
	}
}

var MissingRationaleRule = rule.Rule{
	Name: "missing-rationale",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindEndOfFile: func(node *ast.Node) { checkSourceFile(ctx) }}
	},
}
