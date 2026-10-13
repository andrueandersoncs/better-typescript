package require_command_name_consistency

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var commandOps = map[string]bool{"publish": true, "save": true, "send": true, "write": true}
var accessorOps = map[string]bool{"find": true, "get": true, "load": true, "lookup": true, "read": true, "select": true, "create": true, "resolve": true}
var predicateOp = regexp.MustCompile(`^(is|has|can|should|does|contains?|includes?|matches?)$`)
var boundary = regexp.MustCompile(`([a-z0-9])([A-Z])`)

var Rule = rule.Rule{Name: "require-command-name-consistency", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		name, fn := callableAt(node)
		if name == nil {
			return
		}
		ws := words(name.Text())
		op, final := ws[0], ws[len(ws)-1]
		if final == "handler" || final == "callback" {
			return
		}
		signature := ctx.TypeChecker.GetSignatureFromDeclaration(fn)
		if signature == nil {
			return
		}
		command := carriesNoData(ctx, ctx.TypeChecker.GetReturnTypeOfSignature(signature))
		if commandOps[op] && !command {
			ctx.ReportNode(name, rule.RuleMessage{Id: "require-command-name-consistency", Description: fmt.Sprintf("%s claims the command %s, but its result and body do not provide command evidence.", name.Text(), op), Help: "Rename away from the command verb, or implement a true command with a void or Effect.void result."})
			return
		}
		if command && !commandOps[op] && (accessorOps[op] || predicateOp.MatchString(op)) {
			ctx.ReportNode(name, rule.RuleMessage{Id: "require-command-name-consistency", Description: fmt.Sprintf("%s is a void command named like an accessor, projection, or result, not a command.", name.Text()), Help: "Rename with command language such as save, write, send, publish, set, update, remove, or delete."})
		}
	}
	return rule.RuleListeners{ast.KindVariableDeclaration: check, ast.KindFunctionDeclaration: check, ast.KindMethodDeclaration: check}
}}

func words(name string) []string {
	snake := boundary.ReplaceAllString(name, "$1 $2")
	return strings.Fields(strings.ToLower(strings.NewReplacer("_", " ", "-", " ").Replace(snake)))
}

func callableAt(node *ast.Node) (*ast.Node, *ast.Node) {
	var name, fn *ast.Node
	switch node.Kind {
	case ast.KindVariableDeclaration:
		name, fn = node.Name(), node.Initializer()
		if fn == nil || (!ast.IsArrowFunction(fn) && !ast.IsFunctionExpression(fn)) {
			return nil, nil
		}
	case ast.KindFunctionDeclaration, ast.KindMethodDeclaration:
		name, fn = node.Name(), node
	}
	if name == nil || !ast.IsIdentifier(name) || len(words(name.Text())) == 0 {
		return nil, nil
	}
	return name, fn
}

// carriesNoData reports whether a result is void, a Promise of void, or an Effect whose success is void.
func carriesNoData(ctx rule.RuleContext, result *checker.Type) bool {
	if voidLike(result) || voidLike(checker.Checker_getAwaitedType(ctx.TypeChecker, result)) {
		return true
	}
	symbol := checker.Type_symbol(result)
	if symbol == nil || symbol.Name != "Effect" {
		return false
	}
	arguments := ctx.TypeChecker.GetTypeArguments(result)
	return len(arguments) > 0 && voidLike(arguments[0])
}

func voidLike(value *checker.Type) bool {
	if value == nil {
		return false
	}
	for _, part := range utils.UnionTypeParts(value) {
		if checker.Type_flags(part)&checker.TypeFlagsVoidLike == 0 {
			return false
		}
	}
	return true
}
