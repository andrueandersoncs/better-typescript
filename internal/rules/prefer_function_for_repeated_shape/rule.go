package prefer_function_for_repeated_shape

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

const minimumShapeTokens = 24
const minimumStableIdentifiers = 2

type statementShape struct {
	node        *ast.Node
	fingerprint string
	identifiers []string
}

func literalToken(kind ast.Kind) bool {
	switch kind {
	case ast.KindStringLiteral, ast.KindNumericLiteral, ast.KindBigIntLiteral, ast.KindRegularExpressionLiteral, ast.KindNoSubstitutionTemplateLiteral, ast.KindTemplateHead, ast.KindTemplateMiddle, ast.KindTemplateTail:
		return true
	default:
		return false
	}
}

func classFor(classes map[string]int, value string) int {
	class, found := classes[value]
	if found {
		return class
	}
	class = len(classes)
	classes[value] = class
	return class
}

func shapeOf(ctx rule.RuleContext, node *ast.Node, regexpStarts map[int]bool, templateStarts map[int]bool) (statementShape, bool) {
	r := utils.TrimNodeTextRange(ctx.SourceFile, node)
	tokenScanner := scanner.NewScanner()
	tokenScanner.SetLanguageVariant(ctx.SourceFile.LanguageVariant)
	tokenScanner.SetText(ctx.SourceFile.Text()[r.Pos():r.End()])

	var fingerprint strings.Builder
	identifierClasses := make(map[string]int)
	identifiers := []string{}
	tokenCount := 0

	for kind := tokenScanner.Scan(); kind != ast.KindEndOfFile; kind = tokenScanner.Scan() {
		start := r.Pos() + tokenScanner.TokenStart()
		if regexpStarts[start] && (kind == ast.KindSlashToken || kind == ast.KindSlashEqualsToken) {
			kind = tokenScanner.ReScanSlashToken()
		}
		if templateStarts[start] && (kind == ast.KindBacktickToken || kind == ast.KindCloseBraceToken) {
			kind = tokenScanner.ReScanTemplateToken(false)
		}
		if kind == ast.KindSemicolonToken {
			continue
		}
		tokenCount++
		fingerprint.WriteString(strconv.Itoa(int(kind)))
		switch {
		case kind == ast.KindIdentifier:
			text := tokenScanner.TokenText()
			identifiers = append(identifiers, text)
			fingerprint.WriteString(":i")
			fingerprint.WriteString(strconv.Itoa(classFor(identifierClasses, text)))
		case literalToken(kind):
			fingerprint.WriteString(":l")
		}
		fingerprint.WriteByte(';')
	}

	if tokenCount < minimumShapeTokens {
		return statementShape{}, false
	}
	return statementShape{node: node, fingerprint: fingerprint.String(), identifiers: identifiers}, true
}

type shapeGroup struct {
	previous []statementShape
	reported bool
}

type stableIdentifier struct {
	position int
	name     string
}

type compatiblePredecessor struct {
	node        *ast.Node
	identifiers []stableIdentifier
}

func sharedStableIdentifiers(first statementShape, second statementShape) []stableIdentifier {
	if len(first.identifiers) != len(second.identifiers) {
		return nil
	}
	seen := make(map[string]struct{})
	stable := make([]stableIdentifier, 0, len(first.identifiers))
	for position, name := range first.identifiers {
		if second.identifiers[position] != name {
			continue
		}
		if _, found := seen[name]; found {
			continue
		}
		seen[name] = struct{}{}
		stable = append(stable, stableIdentifier{position: position, name: name})
	}
	return stable
}

func shareTwoIdentifiers(first []stableIdentifier, second []stableIdentifier) bool {
	matches := 0
	for left, right := 0, 0; left < len(first) && right < len(second); {
		switch {
		case first[left].position < second[right].position:
			left++
		case first[left].position > second[right].position:
			right++
		default:
			if first[left].name == second[right].name {
				matches++
				if matches == minimumStableIdentifiers {
					return true
				}
			}
			left++
			right++
		}
	}
	return false
}

func matchingPredecessors(group *shapeGroup, shape statementShape) (*ast.Node, *ast.Node, bool) {
	compatible := make([]compatiblePredecessor, 0, len(group.previous))
	for _, previous := range group.previous {
		stable := sharedStableIdentifiers(previous, shape)
		if len(stable) >= minimumStableIdentifiers {
			compatible = append(compatible, compatiblePredecessor{node: previous.node, identifiers: stable})
		}
	}
	for first := range compatible {
		for second := first + 1; second < len(compatible); second++ {
			if shareTwoIdentifiers(compatible[first].identifiers, compatible[second].identifiers) {
				group.reported = true
				return compatible[first].node, compatible[second].node, true
			}
		}
	}
	group.previous = append(group.previous, shape)
	return nil, nil, false
}

func sourceLine(file *ast.SourceFile, node *ast.Node) int {
	position := utils.TrimNodeTextRange(file, node).Pos()
	line, _ := scanner.GetECMALineAndUTF16CharacterOfPosition(file, position)
	return line + 1
}

func repeatedShapeMessage(file *ast.SourceFile, first *ast.Node, second *ast.Node) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "preferFunctionForRepeatedShape",
		Description: "This statement repeats a substantial shape for the third time.",
		Help:        fmt.Sprintf("Extract the shared structure into a regular or higher-order function, with the differing expressions as parameters. Earlier matching statements start on lines %d and %d.", sourceLine(file, first), sourceLine(file, second)),
	}
}

func eligibleStatement(node *ast.Node) bool {
	return node.Kind == ast.KindExpressionStatement || node.Kind == ast.KindFunctionDeclaration || node.Kind == ast.KindVariableStatement
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	regexpStarts := make(map[int]bool)
	templateStarts := make(map[int]bool)
	rememberStart := func(starts map[int]bool) func(*ast.Node) {
		return func(node *ast.Node) {
			starts[scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)] = true
		}
	}
	checkScope := func(node *ast.Node) {
		groups := make(map[string]*shapeGroup)
		for _, statement := range node.Statements() {
			if !eligibleStatement(statement) {
				continue
			}
			shape, ok := shapeOf(ctx, statement, regexpStarts, templateStarts)
			if !ok {
				continue
			}
			group := groups[shape.fingerprint]
			if group == nil {
				group = &shapeGroup{}
				groups[shape.fingerprint] = group
			}
			if group.reported {
				continue
			}
			first, second, matched := matchingPredecessors(group, shape)
			if matched {
				ctx.ReportNode(statement, repeatedShapeMessage(ctx.SourceFile, first, second))
			}
		}
	}
	checkNestedScope := func(node *ast.Node) { checkScope(node) }
	return rule.RuleListeners{
		ast.KindEndOfFile: func(_ *ast.Node) {
			checkScope(ctx.SourceFile.AsNode())
		},
		ast.KindRegularExpressionLiteral:           rememberStart(regexpStarts),
		ast.KindTemplateHead:                       rememberStart(templateStarts),
		ast.KindTemplateMiddle:                     rememberStart(templateStarts),
		ast.KindTemplateTail:                       rememberStart(templateStarts),
		rule.ListenerOnExit(ast.KindBlock):         checkNestedScope,
		rule.ListenerOnExit(ast.KindModuleBlock):   checkNestedScope,
		rule.ListenerOnExit(ast.KindCaseClause):    checkNestedScope,
		rule.ListenerOnExit(ast.KindDefaultClause): checkNestedScope,
	}
}

var Rule = rule.Rule{Name: "prefer-function-for-repeated-shape", Run: run}
