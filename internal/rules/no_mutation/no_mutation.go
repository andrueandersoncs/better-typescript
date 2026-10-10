package no_mutation

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
	"strings"
)

var message = rule.RuleMessage{Id: "no-mutation", Description: "Avoid mutating first-party data.", Help: "Application code should derive a new value — Array.replace or Array.modify for elements, Struct.evolve for record fields, and a fresh const for rebindings. An owned library kernel may use a local mutable builder only under explicit project policy; this rule does not infer that exception. For shared state, use Ref.update or Ref.modify for pure atomic transitions, SynchronizedRef.updateEffect or SynchronizedRef.modifyEffect for effectful transitions, and Effect.tx with TxRef for atomic multi-cell transitions. Contention alone does not require SynchronizedRef. Use PubSub for subscriber sets. A local cell does not automatically require a Layer; use a Layer only for an actual resource or lifetime boundary. Never mutate built-ins (prototypes, globals). Mutating a third-party structure whose API contract requires assignment (process.exitCode, a WebSocket handler slot, a React ref cell) is permitted."}
var Rule = rule.Rule{Name: "no-mutation", Run: run}

// objectMutators mutate their first argument; the Date setters mutate their receiver.
var objectMutators = map[string]bool{"assign": true, "defineProperties": true, "defineProperty": true, "deleteProperty": true, "set": true, "setPrototypeOf": true}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		target := mutationTarget(node)
		if target != nil && !uncontrolledTarget(ctx, target) {
			ctx.ReportNode(target, message)
		}
	}
	call := func(node *ast.Node) {
		object := mutatedObject(ctx, node.AsCallExpression())
		if object != nil && !uncontrolledObject(ctx, object) {
			ctx.ReportNode(object, message)
		}
	}
	return rule.RuleListeners{ast.KindBinaryExpression: check, ast.KindPrefixUnaryExpression: check, ast.KindPostfixUnaryExpression: check, ast.KindDeleteExpression: check, ast.KindForInStatement: check, ast.KindForOfStatement: check, ast.KindCallExpression: call}
}
func mutationTarget(node *ast.Node) *ast.Node {
	switch node.Kind {
	case ast.KindBinaryExpression:
		if ast.IsAssignmentExpression(node, false) {
			return node.AsBinaryExpression().Left
		}
	case ast.KindPrefixUnaryExpression:
		expression := node.AsPrefixUnaryExpression()
		if expression.Operator == ast.KindPlusPlusToken || expression.Operator == ast.KindMinusMinusToken {
			return expression.Operand
		}
	case ast.KindPostfixUnaryExpression:
		expression := node.AsPostfixUnaryExpression()
		if expression.Operator == ast.KindPlusPlusToken || expression.Operator == ast.KindMinusMinusToken {
			return expression.Operand
		}
	case ast.KindDeleteExpression:
		return node.AsDeleteExpression().Expression
	case ast.KindForInStatement, ast.KindForOfStatement:
		if initializer := node.Initializer(); !ast.IsVariableDeclarationList(initializer) {
			return initializer
		}
	}
	return nil
}
func mutatedObject(ctx rule.RuleContext, call *ast.CallExpression) *ast.Node {
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return nil
	}
	name := callee.Name().Text()
	switch libOwner(ctx.TypeChecker.GetSymbolAtLocation(callee.Name())) {
	case "Date":
		if strings.HasPrefix(name, "set") {
			return callee.Expression()
		}
	case "ObjectConstructor", "Reflect":
		if objectMutators[name] && len(call.Arguments.Nodes) > 0 && !fresh(call.Arguments.Nodes[0]) {
			return call.Arguments.Nodes[0]
		}
	}
	return nil
}

// libOwner names the ECMAScript library interface or namespace that declares a member.
func libOwner(symbol *ast.Symbol) string {
	if symbol == nil {
		return ""
	}
	for _, declaration := range symbol.Declarations {
		owner := declaration.Parent
		if owner != nil && ast.IsModuleBlock(owner) {
			owner = owner.Parent
		}
		if owner == nil || !(ast.IsInterfaceDeclaration(owner) || ast.IsModuleDeclaration(owner)) {
			continue
		}
		if file := ast.GetSourceFileOfNode(declaration); file != nil && strings.HasPrefix(file.FileName()[strings.LastIndexAny(file.FileName(), "/\\")+1:], "lib.es") {
			return owner.Name().Text()
		}
	}
	return ""
}
func fresh(node *ast.Node) bool {
	node = unwrap(node)
	return ast.IsObjectLiteralExpression(node) || ast.IsArrayLiteralExpression(node) || ast.IsNewExpression(node)
}
func uncontrolledTarget(ctx rule.RuleContext, target *ast.Node) bool {
	target = unwrap(target)
	if ast.IsAccessExpression(target) {
		return uncontrolledObject(ctx, target.Expression())
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(target)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	return uncontrolledSymbol(symbol)
}

// uncontrolledObject allows third-party objects unless they are reached through a parameter.
func uncontrolledObject(ctx rule.RuleContext, object *ast.Node) bool {
	return !parameterRoot(ctx, object) && uncontrolledType(ctx.TypeChecker.GetTypeAtLocation(object), map[uint32]bool{})
}
func parameterRoot(ctx rule.RuleContext, node *ast.Node) bool {
	for node = unwrap(node); ast.IsAccessExpression(node); node = unwrap(node.Expression()) {
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	return ast.IsIdentifier(node) && symbol != nil && symbol.ValueDeclaration != nil && ast.IsParameterDeclaration(ast.GetRootDeclaration(symbol.ValueDeclaration))
}
func uncontrolledType(value *checker.Type, seen map[uint32]bool) bool {
	if value == nil {
		return false
	}
	id := uint32(value.Id())
	if seen[id] {
		return false
	}
	seen[id] = true
	flags := value.Flags()
	nullish := flags&(checker.TypeFlagsNull|checker.TypeFlagsUndefined|checker.TypeFlagsVoid) != 0
	if value.IsUnion() {
		members := value.Types()
		relevant := make([]*checker.Type, 0, len(members))
		for _, member := range members {
			if member.Flags()&(checker.TypeFlagsNull|checker.TypeFlagsUndefined|checker.TypeFlagsVoid) == 0 {
				relevant = append(relevant, member)
			}
		}
		if len(relevant) == 0 {
			relevant = members
		}
		for _, member := range relevant {
			if !uncontrolledType(member, cloneSeen(seen)) {
				return false
			}
		}
		return true
	}
	if value.IsIntersection() {
		for _, member := range value.Types() {
			if uncontrolledType(member, cloneSeen(seen)) {
				return true
			}
		}
		return false
	}
	return nullish || uncontrolledSymbol(value.Symbol())
}
func cloneSeen(seen map[uint32]bool) map[uint32]bool {
	result := make(map[uint32]bool, len(seen))
	for id := range seen {
		result[id] = true
	}
	return result
}
func uncontrolledSymbol(symbol *ast.Symbol) bool {
	if symbol == nil || len(symbol.Declarations) == 0 {
		return false
	}
	hasProject, hasES := false, false
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := name[strings.LastIndex(name, "/")+1:]
		if strings.HasPrefix(base, "lib.es") || strings.HasPrefix(base, "lib.decorators") || base == "lib.d.ts" {
			hasES = true
		}
		if !strings.Contains(name, "/node_modules/") && !strings.HasPrefix(base, "lib.") {
			hasProject = true
		}
	}
	return !hasProject && !hasES
}
func unwrap(node *ast.Node) *ast.Node {
	return ast.SkipOuterExpressions(node, ast.OEKAll)
}
